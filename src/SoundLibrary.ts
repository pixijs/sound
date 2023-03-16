import { Filter } from './filters/Filter';
import { IMediaContext } from './interfaces/IMediaContext';
import { IMediaInstance } from './interfaces/IMediaInstance';
import { CompleteCallback, Options, PlayOptions, Sound } from './Sound';
import { SoundChannel } from './SoundChannel';
import { WebAudioContext } from './webaudio/WebAudioContext';

type SoundSourceMap = Record<string, Options | string | ArrayBuffer | AudioBuffer | HTMLAudioElement>;
type SoundMap = Record<string, Sound>;

/**
 * Manages the playback of sounds. This is the main class for PixiJS Sound. If you're
 * using the browser-based bundled this is `PIXI.sound`. Otherwise, you can do this:
 * @example
 * import { sound } from '@pixi/sound';
 *
 * // sound is an instance of SoundLibrary
 * sound.add('my-sound', 'path/to/file.mp3');
 * sound.play('my-sound');
 */
class SoundLibrary
{
    /**
     * For legacy approach for Audio. Instead of using WebAudio API
     * for playback of sounds, it will use HTML5 `<audio>` element.
     */
    private _useLegacy: boolean;

    /** The map of all sounds by alias. */
    private _sounds: SoundMap;

    /** The map of all channels by name. */
    private _channels: Map<string, SoundChannel>;

    constructor()
    {
        this.init();
    }

    /**
     * Re-initialize the sound library, this will
     * recreate the AudioContext. If there's a hardware-failure
     * call `close` and then `init`.
     * @return Sound instance
     */
    public init(): this
    {
        this._sounds = {};
        this._channels = new Map();
        this.useLegacy = !this.supported;
        this._channels.set('main', new SoundChannel('main', this));

        return this;
    }

    /**
     * The global context to use.
     * @readonly
     */
    public get context(): IMediaContext
    {
        return this._channels.get('main').context;
    }

    /**
     * Apply filters to all sounds. Can be useful
     * for setting global planning or global effects.
     * **Only supported with WebAudio.**
     * @example
     * import { sound, filters } from '@pixi/sound';
     * // Adds a filter to pan all output left
     * sound.filtersAll = [
     *     new filters.StereoFilter(-1)
     * ];
     */
    public get filtersAll(): Filter[]
    {
        if (!this.useLegacy)
        {
            return this.context.filters;
        }

        return [];
    }
    public set filtersAll(filtersAll: Filter[])
    {
        if (!this.useLegacy)
        {
            // eslint-disable-next-line no-return-assign
            this.channels.forEach((channel) => channel.filtersAll = filtersAll);
        }
    }

    /**
     * Do not use WebAudio, force the use of legacy. This **must** be called before loading any files.
     */
    public get useLegacy(): boolean
    {
        return this._useLegacy;
    }
    public set useLegacy(legacy: boolean)
    {
        this._useLegacy = legacy;
        this._channels.forEach((channel) => channel.updateContext());
    }

    /**
     * `true` if WebAudio is supported on the current browser.
     */
    public get supported(): boolean
    {
        return WebAudioContext.AudioContext !== null;
    }

    /**
     * Gets all channels that are currently registered.
     */
    public get channels(): Map<string, SoundChannel>
    {
        return this._channels;
    }

    /**
     * Gets a channel by name.
     * @param name - name of the channel
     * @returns
     */
    public getChannel(name: string): SoundChannel
    {
        return this._channels.get(name);
    }

    /**
     * Adds a new channel to the library.
     * @param name - name of the channel
     */
    public addChannel(name: string): SoundChannel
    {
        const channel = new SoundChannel(name);

        this._channels.set(name, channel);

        return channel;
    }

    /**
     * Removes a channel from the library.
     * @param name - name of the channel
     */
    public removeChannel(name: string): void
    {
        const channel = this._channels.get(name);

        if (channel)
        {
            channel.close();
            this._channels.delete(name);
        }
    }

    /**
     * Removes a sound by alias from a channel.
     * @param channelName - The sound channel.
     * @param alias - The sound alias reference.
     * @param assert - Whether enable console.assert.
     * @return Instance for chaining.
     */
    public removeFromChannel(channelName: string, alias: string, assert = true): void
    {
        this._channels.get(channelName).remove(alias, assert);
        delete this._sounds[alias];
    }

    /**
     * Adds a sound to a channel.
     * @param name - The sound channel.
     * @param alias - The sound alias reference.
     * @param sound - Sound reference to use.
     */
    public addToChannel(name: string, alias: string, sound: Sound)
    {
        this.removeFromChannel(name, alias, false);
        this._sounds[alias] = sound;
        this._channels.get(name).add(alias, sound);
    }

    /**
     * Register an existing sound with the library cache.
     * @method add
     * @instance
     * @param {string} alias - The sound alias reference.
     * @param {Sound} sound - Sound reference to use.
     * @return {Sound} Instance of the Sound object.
     */

    /**
     * Adds a new sound by alias.
     * @param alias - The sound alias reference.
     * @param {ArrayBuffer|AudioBuffer|String|Options|HTMLAudioElement} options - Either the path or url to the source file.
     *        or the object of options to use.
     * @return Instance of the Sound object.
     */
    public add(alias: string, options: Options | string | ArrayBuffer | AudioBuffer | HTMLAudioElement | Sound): Sound;

    /**
     * Adds multiple sounds at once.
     * @param map - Map of sounds to add, the key is the alias, the value is the
     *        `string`, `ArrayBuffer`, `AudioBuffer`, `HTMLAudioElement` or the list of options
     *        (see {@link Options} for full options).
     * @param globalOptions - The default options for all sounds.
     *        if a property is defined, it will use the local property instead.
     * @return Instance to the Sound object.
     */
    public add(map: SoundSourceMap, globalOptions?: Options): SoundMap;

    /**
     * @ignore
     */
    public add(source: string | SoundSourceMap,
        sourceOptions?: Options | string | ArrayBuffer | AudioBuffer | HTMLAudioElement | Sound): any
    {
        if (typeof source === 'object')
        {
            const results: SoundMap = {};

            for (const alias in source)
            {
                const options: Options = this._getOptions(
                    source[alias],
                    sourceOptions as Options,
                );

                results[alias] = this.add(alias, options);
            }

            return results;
        }

        // eslint-disable-next-line no-console
        console.assert(!this._sounds[source], `Sound with alias ${source} already exists.`);

        if (sourceOptions instanceof Sound)
        {
            this._sounds[source] = sourceOptions;
            this._channels.get('main').add(source, sourceOptions);

            return sourceOptions;
        }

        const options: Options = this._getOptions(sourceOptions);
        const sound: Sound = Sound.from(options);

        this._sounds[source] = sound;

        if (options.channel && !this._channels.has(options.channel))
        {
            this.addChannel(options.channel);
        }

        return this.channels.get(options.channel ?? 'main').add(source, sound);
    }

    /**
     * Removes a sound by alias.
     * @param alias - The sound alias reference.
     * @return Instance for chaining.
     */
    public remove(alias: string): this
    {
        this._channels.forEach((channel) =>
        {
            if (channel.exists(alias))
            {
                channel.remove(alias);
            }
        });

        delete this._sounds[alias];

        return this;
    }

    /**
     * Set the global volume for all sounds. To set per-sound volume see {@link SoundLibrary#volume}.
     */
    public get volumeAll(): number
    {
        return this._channels.get('main').volumeAll;
    }
    public set volumeAll(volume: number)
    {
        // eslint-disable-next-line no-return-assign
        this._channels.forEach((channel) => channel.volumeAll = volume);
    }

    /**
     * Set the global speed for all sounds. To set per-sound speed see {@link SoundLibrary#speed}.
     */
    public get speedAll(): number
    {
        return this._channels.get('main').speedAll;
    }
    public set speedAll(speed: number)
    {
        // eslint-disable-next-line no-return-assign
        this._channels.forEach((channel) => channel.speedAll = speed);
    }

    /**
     * Toggle paused property for all sounds.
     * @return `true` if all sounds are paused.
     */
    public togglePauseAll(): boolean
    {
        let paused;

        // eslint-disable-next-line no-return-assign
        this._channels.forEach((channel) => paused = channel.togglePauseAll());

        return paused;
    }

    /**
     * Pauses any playing sounds.
     * @return Instance for chaining.
     */
    public pauseAll(): this
    {
        this._channels.forEach((channel) => channel.pauseAll());

        return this;
    }

    /**
     * Resumes any sounds.
     * @return Instance for chaining.
     */
    public resumeAll(): this
    {
        this._channels.forEach((channel) => channel.resumeAll());

        return this;
    }

    /**
     * Toggle muted property for all sounds.
     * @return `true` if all sounds are muted.
     */
    public toggleMuteAll(): boolean
    {
        let muted;

        // eslint-disable-next-line no-return-assign
        this._channels.forEach((channel) => muted = channel.toggleMuteAll());

        return muted;
    }

    /**
     * Mutes all playing sounds.
     * @return Instance for chaining.
     */
    public muteAll(): this
    {
        this._channels.forEach((channel) => channel.muteAll());

        return this;
    }

    /**
     * Unmutes all playing sounds.
     * @return Instance for chaining.
     */
    public unmuteAll(): this
    {
        this._channels.forEach((channel) => channel.unmuteAll());

        return this;
    }

    /**
     * Stops and removes all sounds. They cannot be used after this.
     * @return Instance for chaining.
     */
    public removeAll(): this
    {
        this._channels.forEach((channel) => channel.removeAll());
        this._sounds = {};

        return this;
    }

    /**
     * Stops all sounds.
     * @return Instance for chaining.
     */
    public stopAll(): this
    {
        this._channels.forEach((channel) => channel.stopAll());

        return this;
    }

    /**
     * Checks if a sound by alias exists.
     * @param alias - Check for alias.
     * @param assert - Whether enable console.assert.
     * @return true if the sound exists.
     */
    public exists(alias: string, assert = false): boolean
    {
        const exists = !!this._sounds[alias];

        if (assert)
        {
            // eslint-disable-next-line no-console
            console.assert(exists, `No sound matching alias '${alias}'.`);
        }

        return exists;
    }

    /**
     * Convenience function to check to see if any sound is playing.
     * @returns `true` if any sound is currently playing.
     */
    public isPlaying(): boolean
    {
        for (const alias in this._sounds)
        {
            if (this._sounds[alias].isPlaying)
            {
                return true;
            }
        }

        return false;
    }

    /**
     * Find a sound by alias.
     * @param alias - The sound alias reference.
     * @return Sound object.
     */
    public find(alias: string): Sound
    {
        this.exists(alias, true);

        return this._sounds[alias];
    }

    /**
     * Find a sound by alias.
     * @param alias - The sound alias reference.
     * @return Sound object.
     */
    public findSoundInChannel(alias: Sound): SoundChannel
    {
        let channel: SoundChannel;

        this._channels.forEach((chan) =>
        {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            Object.values(chan.sounds).includes(alias) && (channel = chan);
        });

        return channel;
    }

    /**
     * Plays a sound.
     * @method play
     * @instance
     * @param {string} alias - The sound alias reference.
     * @param {string} sprite - The alias of the sprite to play.
     * @return {IMediaInstance|null} The sound instance, this cannot be reused
     *         after it is done playing. Returns `null` if the sound has not yet loaded.
     */

    /**
     * Plays a sound.
     * @param alias - The sound alias reference.
     * @param {PlayOptions|Function} options - The options or callback when done.
     * @return The sound instance,
     *        this cannot be reused after it is done playing. Returns a Promise if the sound
     *        has not yet loaded.
     */
    public play(
        alias: string,
        options?: PlayOptions | CompleteCallback | string): IMediaInstance | Promise<IMediaInstance>
    {
        return this.find(alias).play(options);
    }

    /**
     * Stops a sound.
     * @param alias - The sound alias reference.
     * @return Sound object.
     */
    public stop(alias: string): Sound
    {
        return this.find(alias).stop();
    }

    /**
     * Pauses a sound.
     * @param alias - The sound alias reference.
     * @return Sound object.
     */
    public pause(alias: string): Sound
    {
        return this.find(alias).pause();
    }

    /**
     * Resumes a sound.
     * @param alias - The sound alias reference.
     * @return Instance for chaining.
     */
    public resume(alias: string): Sound
    {
        return this.find(alias).resume();
    }

    /**
     * Get or set the volume for a sound.
     * @param alias - The sound alias reference.
     * @param volume - Optional current volume to set.
     * @return The current volume.
     */
    public volume(alias: string, volume?: number): number
    {
        const sound = this.find(alias);

        if (volume !== undefined)
        {
            sound.volume = volume;
        }

        return sound.volume;
    }

    /**
     * Get or set the speed for a sound.
     * @param alias - The sound alias reference.
     * @param speed - Optional current speed to set.
     * @return The current speed.
     */
    public speed(alias: string, speed?: number): number
    {
        const sound = this.find(alias);

        if (speed !== undefined)
        {
            sound.speed = speed;
        }

        return sound.speed;
    }

    /**
     * Get the length of a sound in seconds.
     * @param alias - The sound alias reference.
     * @return The current duration in seconds.
     */
    public duration(alias: string): number
    {
        return this.find(alias).duration;
    }

    /**
     * Closes the sound library. This will release/destroy
     * the AudioContext(s). Can be used safely if you want to
     * initialize the sound library later. Use `init` method.
     */
    public close(): this
    {
        this._channels.forEach((channel) => channel.close());
        this._sounds = {};

        return this;
    }

    /**
     * Internal methods for getting the options object
     * @private
     * @param source - The source options
     * @param overrides - Override default options
     * @return The construction options
     */
    private _getOptions(source: string | ArrayBuffer | AudioBuffer | HTMLAudioElement | Options,
        overrides?: Options): Options
    {
        let options: Options;

        if (typeof source === 'string')
        {
            options = { url: source };
        }
        else if (Array.isArray(source))
        {
            options = { url: source };
        }
        else if (source instanceof ArrayBuffer || source instanceof AudioBuffer || source instanceof HTMLAudioElement)
        {
            options = { source };
        }
        else
        {
            options = source as Options;
        }
        options = { ...options, ...(overrides || {}) };

        // add default channel
        options.channel = options.channel || 'main';

        return options;
    }
}

export { SoundLibrary };
export type { SoundSourceMap, SoundMap };

