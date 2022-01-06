import { Filter } from './filters/Filter';
import { IMediaContext } from './interfaces/IMediaContext';
import { IMediaInstance } from './interfaces/IMediaInstance';
import { SoundLoader } from './SoundLoader';
import { CompleteCallback, Options, PlayOptions, Sound } from './Sound';
import { HTMLAudioContext } from './htmlaudio/HTMLAudioContext';
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

    /** The global context to use. */
    private _context: IMediaContext;

    /** The WebAudio specific context */
    private _webAudioContext: WebAudioContext;

    /** The HTML Audio (legacy) context. */
    private _htmlAudioContext: HTMLAudioContext;

    /** The map of all sounds by alias. */
    private _sounds: SoundMap;

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
        if (this.supported)
        {
            this._webAudioContext = new WebAudioContext();
        }
        this._htmlAudioContext = new HTMLAudioContext();
        this._sounds = {};
        this.useLegacy = !this.supported;

        return this;
    }

    /**
     * The global context to use.
     * @readonly
     */
    public get context(): IMediaContext
    {
        return this._context;
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
            return this._context.filters;
        }

        return [];
    }
    public set filtersAll(filtersAll: Filter[])
    {
        if (!this.useLegacy)
        {
            this._context.filters = filtersAll;
        }
    }

    /**
     * `true` if WebAudio is supported on the current browser.
     */
    public get supported(): boolean
    {
        return WebAudioContext.AudioContext !== null;
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

            return sourceOptions;
        }

        const options: Options = this._getOptions(sourceOptions);
        const sound: Sound = Sound.from(options);

        this._sounds[source] = sound;

        return sound;
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
        else if (source instanceof ArrayBuffer || source instanceof AudioBuffer || source instanceof HTMLAudioElement)
        {
            options = { source };
        }
        else
        {
            options = source as Options;
        }
        options = { ...options, ...(overrides || {}) };

        return options;
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
        SoundLoader.setLegacy(legacy);
        this._useLegacy = legacy;

        // Set the context to use
        this._context = (!legacy && this.supported)
            ? this._webAudioContext
            : this._htmlAudioContext;
    }

    /**
     * Removes a sound by alias.
     * @param alias - The sound alias reference.
     * @return Instance for chaining.
     */
    public remove(alias: string): this
    {
        this.exists(alias, true);
        this._sounds[alias].destroy();
        delete this._sounds[alias];

        return this;
    }

    /**
     * Set the global volume for all sounds. To set per-sound volume see {@link SoundLibrary#volume}.
     */
    public get volumeAll(): number
    {
        return this._context.volume;
    }
    public set volumeAll(volume: number)
    {
        this._context.volume = volume;
        this._context.refresh();
    }

    /**
     * Set the global speed for all sounds. To set per-sound speed see {@link SoundLibrary#speed}.
     */
    public get speedAll(): number
    {
        return this._context.speed;
    }
    public set speedAll(speed: number)
    {
        this._context.speed = speed;
        this._context.refresh();
    }

    /**
     * Toggle paused property for all sounds.
     * @return `true` if all sounds are paused.
     */
    public togglePauseAll(): boolean
    {
        return this._context.togglePause();
    }

    /**
     * Pauses any playing sounds.
     * @return Instance for chaining.
     */
    public pauseAll(): this
    {
        this._context.paused = true;
        this._context.refreshPaused();

        return this;
    }

    /**
     * Resumes any sounds.
     * @return Instance for chaining.
     */
    public resumeAll(): this
    {
        this._context.paused = false;
        this._context.refreshPaused();

        return this;
    }

    /**
     * Toggle muted property for all sounds.
     * @return `true` if all sounds are muted.
     */
    public toggleMuteAll(): boolean
    {
        return this._context.toggleMute();
    }

    /**
     * Mutes all playing sounds.
     * @return Instance for chaining.
     */
    public muteAll(): this
    {
        this._context.muted = true;
        this._context.refresh();

        return this;
    }

    /**
     * Unmutes all playing sounds.
     * @return Instance for chaining.
     */
    public unmuteAll(): this
    {
        this._context.muted = false;
        this._context.refresh();

        return this;
    }

    /**
     * Stops and removes all sounds. They cannot be used after this.
     * @return Instance for chaining.
     */
    public removeAll(): this
    {
        for (const alias in this._sounds)
        {
            this._sounds[alias].destroy();
            delete this._sounds[alias];
        }

        return this;
    }

    /**
     * Stops all sounds.
     * @return Instance for chaining.
     */
    public stopAll(): this
    {
        for (const alias in this._sounds)
        {
            this._sounds[alias].stop();
        }

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
        this.removeAll();
        this._sounds = null;
        if (this._webAudioContext)
        {
            this._webAudioContext.destroy();
            this._webAudioContext = null;
        }
        if (this._htmlAudioContext)
        {
            this._htmlAudioContext.destroy();
            this._htmlAudioContext = null;
        }
        this._context = null;

        return this;
    }
}

export { SoundLibrary };
export type { SoundSourceMap, SoundMap };
