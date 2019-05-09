import { Filterable } from "./Filterable";
import { Filter } from "./filters";
import * as htmlaudio from "./htmlaudio";
import { getInstance } from "./instance";
import { IMediaContext, IMediaInstance } from "./interfaces";
import { SoundLoader } from "./loader";
import { CompleteCallback, Options, PlayOptions, Sound } from "./Sound";
import * as webaudio from "./webaudio";

export type SoundMap = {[id: string]: Options | string | ArrayBuffer | HTMLAudioElement};

/**
 * Contains all of the functionality for using the **pixi-sound** library.
 * This is deisnged to play audio with WebAudio and fallback to HTML5.
 * @namespace PIXI.sound
 */

/**
 * @description Manages the playback of sounds.
 * @class SoundLibrary
 * @memberof PIXI.sound
 * @private
 */
export class SoundLibrary
{
    /**
     * For legacy approach for Audio. Instead of using WebAudio API
     * for playback of sounds, it will use HTML5 `<audio>` element.
     * @name PIXI.sound#_useLegacy
     * @type {boolean}
     * @default false
     * @private
     */
    private _useLegacy: boolean;

    /**
     * The global context to use.
     * @name PIXI.sound#_context
     * @type {PIXI.sound.webaudio.WebAudioContext}
     * @private
     */
    private _context: IMediaContext;

    /**
     * The WebAudio specific context
     * @name PIXI.sound#_webAudioContext
     * @type {PIXI.sound.webaudio.WebAudioContext}
     * @private
     */
    private _webAudioContext: webaudio.WebAudioContext;

    /**
     * The HTML Audio (legacy) context.
     * @name PIXI.sound#_htmlAudioContext
     * @type {PIXI.sound.webaudio.WebAudioContext}
     * @private
     */
    private _htmlAudioContext: htmlaudio.HTMLAudioContext;

    /**
     * The map of all sounds by alias.
     * @name PIXI.sound#_sounds
     * @type {Object}
     * @private
     */
    private _sounds: {[id: string]: Sound};

    constructor()
    {
        this.init();
    }

    /**
     * Re-initialize the sound library, this will
     * recreate the AudioContext. If there's a hardware-failure
     * call `close` and then `init`.
     * @method PIXI.sound#init
     * @return {PIXI.sound} Sound instance
     */
    public init(): SoundLibrary
    {
        if (this.supported)
        {
            this._webAudioContext = new webaudio.WebAudioContext();
        }
        this._htmlAudioContext = new htmlaudio.HTMLAudioContext();
        this._sounds = {};
        this.useLegacy = !this.supported;
        return this;
    }

    /**
     * The global context to use.
     * @name PIXI.sound#context
     * @readonly
     * @type {PIXI.sound.IMediaContext}
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
     * // Adds a filter to pan all output left
     * PIXI.sound.filtersAll = [
     *     new PIXI.sound.filters.StereoFilter(-1)
     * ];
     * @name PIXI.sound#filtersAll
     * @type {PIXI.sound.filters.Filter[]}
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
     * @name PIXI.sound#supported
     * @readonly
     * @type {boolean}
     */
    public get supported(): boolean
    {
        return webaudio.WebAudioContext.AudioContext !== null;
    }

    /**
     * Register an existing sound with the library cache.
     * @method PIXI.sound#add
     * @param {String} alias The sound alias reference.
     * @param {PIXI.sound.Sound} sound Sound reference to use.
     * @return {PIXI.sound.Sound} Instance of the Sound object.
     */

    /**
     * Adds a new sound by alias.
     * @method PIXI.sound#add
     * @param {String} alias The sound alias reference.
     * @param {ArrayBuffer|String|Object|HTMLAudioElement} options Either the path or url to the source file.
     *        or the object of options to use.
     * @param {String} [options.url] If `options` is an object, the source of file.
     * @param {ArrayBuffer|HTMLAudioElement} [options.source] If sound is already preloaded, available.
     * @param {boolean} [options.autoPlay=false] true to play after loading.
     * @param {boolean} [options.preload=false] true to immediately start preloading.
     * @param {boolean} [options.singleInstance=false] `true` to disallow playing multiple layered instances at once.
     * @param {number} [options.volume=1] The amount of volume 1 = 100%.
     * @param {number} [options.speed=1] The playback rate where 1 is 100% speed.
     * @param {Object} [options.sprites] The map of sprite data. Where a sprite is an object
     *        with a `start` and `end`, which are the times in seconds. Optionally, can include
     *        a `speed` amount where 1 is 100% speed.
     * @param {PIXI.sound.Sound~completeCallback} [options.complete=null] Global complete callback when
     *        play is finished.
     * @param {PIXI.sound.Sound~loadedCallback} [options.loaded=null] Call when finished loading.
     * @return {PIXI.sound.Sound} Instance of the Sound object.
     */
    public add(alias: string, options: Options | string | ArrayBuffer | HTMLAudioElement | Sound): Sound;

    /**
     * Adds multiple sounds at once.
     * @method PIXI.sound#add
     * @param {Object} map Map of sounds to add, the key is the alias, the value is the
     *        `string`, `ArrayBuffer`, `HTMLAudioElement` or the list of options
     *        (see {@link PIXI.sound.add} for options).
     * @param {Object} globalOptions The default options for all sounds.
     *        if a property is defined, it will use the local property instead.
     * @return {PIXI.sound.Sound} Instance to the Sound object.
     */
    public add(map: SoundMap, globalOptions?: Options): {[id: string]: Sound};

    // Actual method
    public add(source: string | SoundMap, sourceOptions?: Options | string | ArrayBuffer | HTMLAudioElement | Sound):
        {[id: string]: Sound} | Sound
    {
        if (typeof source === "object")
        {
            const results: {[id: string]: Sound} = {};

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
        else if (typeof source === "string")
        {
            // tslint:disable-next-line no-console
            console.assert(!this._sounds[source], `Sound with alias ${source} already exists.`);

            if (sourceOptions instanceof Sound)
            {
                this._sounds[source] = sourceOptions;
                return sourceOptions;
            }
            else
            {
                const options: Options = this._getOptions(sourceOptions);
                const sound: Sound = Sound.from(options);
                this._sounds[source] = sound;
                return sound;
            }
        }
    }

    /**
     * Internal methods for getting the options object
     * @method PIXI.sound#_getOptions
     * @private
     * @param {string|ArrayBuffer|HTMLAudioElement|Object} source The source options
     * @param {Object} [overrides] Override default options
     * @return {Object} The construction options
     */
    private _getOptions(source: string | ArrayBuffer | HTMLAudioElement | Options, overrides?: Options): Options
    {
        let options: Options;

        if (typeof source === "string")
        {
            options = { url: source };
        }
        else if (source instanceof ArrayBuffer || source instanceof HTMLAudioElement)
        {
            options = { source };
        }
        else
        {
            options = source as Options;
        }
        options = {...options, ...(overrides || {})};

        return options;
    }

    /**
     * Do not use WebAudio, force the use of legacy. This **must** be called before loading any files.
     * @name PIXI.sound#useLegacy
     * @type {boolean}
     */
    public get useLegacy(): boolean
    {
        return this._useLegacy;
    }
    public set useLegacy(legacy: boolean)
    {
        SoundLoader.legacy = legacy;
        this._useLegacy = legacy;

        // Set the context to use
        this._context = (!legacy && this.supported) ?
            this._webAudioContext :
            this._htmlAudioContext;
    }

    /**
     * Removes a sound by alias.
     * @method PIXI.sound#remove
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound} Instance for chaining.
     */
    public remove(alias: string): SoundLibrary
    {
        this.exists(alias, true);
        this._sounds[alias].destroy();
        delete this._sounds[alias];
        return this;
    }

    /**
     * Set the global volume for all sounds. To set per-sound volume see {@link PIXI.sound#volume}.
     * @name PIXI.sound#volumeAll
     * @type {number}
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
     * Set the global speed for all sounds. To set per-sound speed see {@link PIXI.sound#speed}.
     * @name PIXI.sound#speedAll
     * @type {number}
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
     * @method PIXI.sound#togglePauseAll
     * @return {boolean} `true` if all sounds are paused.
     */
    public togglePauseAll(): boolean
    {
        return this._context.togglePause();
    }

    /**
     * Pauses any playing sounds.
     * @method PIXI.sound#pauseAll
     * @return {PIXI.sound} Instance for chaining.
     */
    public pauseAll(): SoundLibrary
    {
        this._context.paused = true;
        this._context.refreshPaused();
        return this;
    }

    /**
     * Resumes any sounds.
     * @method PIXI.sound#resumeAll
     * @return {PIXI.sound} Instance for chaining.
     */
    public resumeAll(): SoundLibrary
    {
        this._context.paused = false;
        this._context.refreshPaused();
        return this;
    }

    /**
     * Toggle muted property for all sounds.
     * @method PIXI.sound#toggleMuteAll
     * @return {boolean} `true` if all sounds are muted.
     */
    public toggleMuteAll(): boolean
    {
        return this._context.toggleMute();
    }

    /**
     * Mutes all playing sounds.
     * @method PIXI.sound#muteAll
     * @return {PIXI.sound} Instance for chaining.
     */
    public muteAll(): SoundLibrary
    {
        this._context.muted = true;
        this._context.refresh();
        return this;
    }

    /**
     * Unmutes all playing sounds.
     * @method PIXI.sound#unmuteAll
     * @return {PIXI.sound} Instance for chaining.
     */
    public unmuteAll(): SoundLibrary
    {
        this._context.muted = false;
        this._context.refresh();
        return this;
    }

    /**
     * Stops and removes all sounds. They cannot be used after this.
     * @method PIXI.sound#removeAll
     * @return {PIXI.sound} Instance for chaining.
     */
    public removeAll(): SoundLibrary
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
     * @method PIXI.sound#stopAll
     * @return {PIXI.sound} Instance for chaining.
     */
    public stopAll(): SoundLibrary
    {
        for (const alias in this._sounds)
        {
            this._sounds[alias].stop();
        }
        return this;
    }

    /**
     * Checks if a sound by alias exists.
     * @method PIXI.sound#exists
     * @param {String} alias Check for alias.
     * @return {boolean} true if the sound exists.
     */
    public exists(alias: string, assert: boolean= false): boolean
    {
        const exists = !!this._sounds[alias];
        if (assert)
        {
            // tslint:disable-next-line no-console
            console.assert(exists, `No sound matching alias '${alias}'.`);
        }
        return exists;
    }

    /**
     * Find a sound by alias.
     * @method PIXI.sound#find
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    public find(alias: string): Sound
    {
        this.exists(alias, true);
        return this._sounds[alias];
    }

    /**
     * Plays a sound.
     * @method PIXI.sound#play
     * @param {String} alias The sound alias reference.
     * @param {String} sprite The alias of the sprite to play.
     * @return {PIXI.sound.IMediaInstance|null} The sound instance, this cannot be reused
     *         after it is done playing. Returns `null` if the sound has not yet loaded.
     */

    /**
     * Plays a sound.
     * @method PIXI.sound#play
     * @param {String} alias The sound alias reference.
     * @param {Object|Function} options The options or callback when done.
     * @param {Function} [options.complete] When completed.
     * @param {Function} [options.loaded] If not already preloaded, callback when finishes load.
     * @param {number} [options.start=0] Start time offset.
     * @param {number} [options.end] End time offset.
     * @param {number} [options.speed] Override default speed, default to the Sound's speed setting.
     * @param {boolean} [options.loop] Override default loop, default to the Sound's loop setting.
     * @return {PIXI.sound.IMediaInstance|Promise<PIXI.sound.IMediaInstance>} The sound instance,
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
     * @method PIXI.sound#stop
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    public stop(alias: string): Sound
    {
        return this.find(alias).stop();
    }

    /**
     * Pauses a sound.
     * @method PIXI.sound#pause
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    public pause(alias: string): Sound
    {
        return this.find(alias).pause();
    }

    /**
     * Resumes a sound.
     * @method PIXI.sound#resume
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound} Instance for chaining.
     */
    public resume(alias: string): Sound
    {
        return this.find(alias).resume();
    }

    /**
     * Get or set the volume for a sound.
     * @method PIXI.sound#volume
     * @param {String} alias The sound alias reference.
     * @param {number} [volume] Optional current volume to set.
     * @return {number} The current volume.
     */
    public volume(alias: string, volume?: number): number
    {
        const sound = this.find(alias);
        if (volume !== undefined) {
            sound.volume = volume;
        }
        return sound.volume;
    }

    /**
     * Get or set the speed for a sound.
     * @method PIXI.sound#speed
     * @param {String} alias The sound alias reference.
     * @param {number} [speed] Optional current speed to set.
     * @return {number} The current speed.
     */
    public speed(alias: string, speed?: number): number
    {
        const sound = this.find(alias);
        if (speed !== undefined) {
            sound.speed = speed;
        }
        return sound.speed;
    }

    /**
     * Get the length of a sound in seconds.
     * @method PIXI.sound#duration
     * @param {String} alias The sound alias reference.
     * @return {number} The current duration in seconds.
     */
    public duration(alias: string): number
    {
        return this.find(alias).duration;
    }

    /**
     * Closes the sound library. This will release/destroy
     * the AudioContext(s). Can be used safely if you want to
     * initialize the sound library later. Use `init` method.
     * @method PIXI.sound#close
     * @return {PIXI.sound}
     */
    public close(): SoundLibrary
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
