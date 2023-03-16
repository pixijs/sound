import { Filter } from './filters/Filter';
import { HTMLAudioContext } from './htmlaudio/HTMLAudioContext';
import { getInstance } from './instance';
import { IMediaContext } from './interfaces';
import { IMediaInstance } from './interfaces/IMediaInstance';
import { CompleteCallback, PlayOptions, Sound } from './Sound';
import { SoundLibrary, SoundMap, SoundSourceMap } from './SoundLibrary';
import { WebAudioContext } from './webaudio/WebAudioContext';

/**
 * Manages the playback of sounds
 */
class SoundChannel
{
    /** The name of the channel */
    public name: string;

    /** The global context to use. */
    private _context: IMediaContext;

    /** The WebAudio specific context */
    private _webAudioContext: WebAudioContext;

    /** The HTML Audio (legacy) context. */
    private _htmlAudioContext: HTMLAudioContext;

    /** The map of all sounds by alias. */
    private _sounds: SoundMap;

    constructor(name: string, library?: SoundLibrary)
    {
        this.name = name;
        this.init(library);
    }

    /**
     * Re-initialize the sound library, this will
     * recreate the AudioContext. If there's a hardware-failure
     * call `close` and then `init`.
     * @return Sound instance
     */
    public init(library?: SoundLibrary): this
    {
        const lib = library || getInstance();

        if (lib.supported)
        {
            this._webAudioContext = new WebAudioContext();
        }
        this._htmlAudioContext = new HTMLAudioContext();
        this._sounds = {};

        return this;
    }

    /**
     * The global context to use.
     * @readonly
     */
    public get context(): IMediaContext
    {
        if (!this._context) this.updateContext();

        return this._context;
    }

    /**
     * The sounds in the channel.
     * @readonly
     */
    public get sounds(): SoundMap
    {
        return this._sounds;
    }

    /** Updates the context to use based on the current instance. */
    public updateContext(): void
    {
        this._context = getInstance().useLegacy ? this._htmlAudioContext : this._webAudioContext;
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
        if (!getInstance().useLegacy)
        {
            return this.context.filters;
        }

        return [];
    }
    public set filtersAll(filtersAll: Filter[])
    {
        if (!getInstance().useLegacy)
        {
            this.context.filters = filtersAll;
        }
    }

    /**
     * Register an existing sound with the library cache.
     * @method add
     * @instance
     * @param {string} alias - The sound alias reference.
     * @param {Sound} sound - Sound reference to use.
     * @return {Sound} Instance of the Sound object.
     */
    public add(name: string, sound: Sound): any
    {
        this._sounds[name] = sound;

        return sound;
    }

    /**
     * Removes a sound by alias.
     * @param alias - The sound alias reference.
     * @param assert - Whether enable console.assert.
     * @return Instance for chaining.
     */
    public remove(alias: string, assert = true): this
    {
        if (!this.exists(alias, assert)) return this;
        this._sounds[alias].destroy();
        delete this._sounds[alias];

        return this;
    }

    /**
     * Set the global volume for all sounds. To set per-sound volume see {@link SoundChannel#volume}.
     */
    public get volumeAll(): number
    {
        return this.context.volume;
    }
    public set volumeAll(volume: number)
    {
        this.context.volume = volume;
        this.context.refresh();
    }

    /**
     * Set the global speed for all sounds. To set per-sound speed see {@link SoundChannel#speed}.
     */
    public get speedAll(): number
    {
        return this.context.speed;
    }
    public set speedAll(speed: number)
    {
        this.context.speed = speed;
        this.context.refresh();
    }

    /**
     * Toggle paused property for all sounds.
     * @return `true` if all sounds are paused.
     */
    public togglePauseAll(): boolean
    {
        return this.context.togglePause();
    }

    /**
     * Pauses any playing sounds.
     * @return Instance for chaining.
     */
    public pauseAll(): this
    {
        this.context.paused = true;
        this.context.refreshPaused();

        return this;
    }

    /**
     * Resumes any sounds.
     * @return Instance for chaining.
     */
    public resumeAll(): this
    {
        this.context.paused = false;
        this.context.refreshPaused();

        return this;
    }

    /**
     * Toggle muted property for all sounds.
     * @return `true` if all sounds are muted.
     */
    public toggleMuteAll(): boolean
    {
        return this.context.toggleMute();
    }

    /**
     * Mutes all playing sounds.
     * @return Instance for chaining.
     */
    public muteAll(): this
    {
        this.context.muted = true;
        this.context.refresh();

        return this;
    }

    /**
     * Unmutes all playing sounds.
     * @return Instance for chaining.
     */
    public unmuteAll(): this
    {
        this.context.muted = false;
        this.context.refresh();

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

export { SoundChannel };
export type { SoundSourceMap, SoundMap };

