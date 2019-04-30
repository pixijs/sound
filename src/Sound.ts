import { Filter } from "./filters";
import { HTMLAudioMedia } from "./htmlaudio";
import { getInstance } from "./instance";
import { IMedia, IMediaContext, IMediaInstance } from "./interfaces";
import { SoundSprite, SoundSpriteData, SoundSprites } from "./sprites";
import { resolveUrl } from "./utils/resolveUrl";
import { WebAudioMedia } from "./webaudio";

// Constructor options
export interface Options {
    autoPlay?: boolean;
    singleInstance?: boolean;
    volume?: number;
    speed?: number;
    complete?: CompleteCallback;
    loaded?: LoadedCallback;
    preload?: boolean;
    loop?: boolean;
    url?: string;
    source?: ArrayBuffer | HTMLAudioElement;
    sprites?: {[id: string]: SoundSpriteData};
}

// Interface for play options
export interface PlayOptions {
    start?: number;
    end?: number;
    speed?: number;
    loop?: boolean;
    volume?: number;
    sprite?: string;
    muted?: boolean;
    complete?: CompleteCallback;
    loaded?: LoadedCallback;
}

/**
 * Callback when sound is loaded.
 * @callback PIXI.sound.Sound~loadedCallback
 * @param {Error} err The callback error.
 * @param {PIXI.sound.Sound} sound The instance of new sound.
 * @param {PIXI.sound.IMediaInstance} instance The instance of auto-played sound.
 */
export declare type LoadedCallback = (err: Error, sound?: Sound, instance?: IMediaInstance) => void;

/**
 * Callback when sound is completed.
 * @callback PIXI.sound.Sound~completeCallback
 * @param {PIXI.sound.Sound} sound The instance of sound.
 */
export declare type CompleteCallback = (sound: Sound) => void;

/**
 * Sound represents a single piece of loaded media. When playing a sound {@link PIXI.sound.IMediaInstance} objects
 * are created. Properties such a `volume`, `pause`, `mute`, `speed`, etc will have an effect on all instances.
 * @class Sound
 * @memberof PIXI.sound
 */
export class Sound
{
    /**
     * Pool of instances
     * @name PIXI.sound.Sound#_pool
     * @type {Array<IMediaInstance>}
     * @private
     */
    private static _pool: IMediaInstance[] = [];

    /**
     * `true` if the buffer is loaded.
     * @name PIXI.sound.Sound#isLoaded
     * @type {boolean}
     * @default false
     */
    public isLoaded: boolean;

    /**
     * `true` if the sound is currently being played.
     * @name PIXI.sound.Sound#isPlaying
     * @type {boolean}
     * @default false
     * @readonly
     */
    public isPlaying: boolean;

    /**
     * true to start playing immediate after load.
     * @name PIXI.sound.Sound#autoPlay
     * @type {boolean}
     * @default false
     * @readonly
     */
    public autoPlay: boolean;

    /**
     * `true` to disallow playing multiple layered instances at once.
     * @name PIXI.sound.Sound#singleInstance
     * @type {boolean}
     * @default false
     */
    public singleInstance: boolean;

    /**
     * `true` to immediately start preloading.
     * @name PIXI.sound.Sound#preload
     * @type {boolean}
     * @default false
     * @readonly
     */
    public preload: boolean;

    /**
     * The file source to load.
     * @name PIXI.sound.Sound#url
     * @type {String}
     * @readonly
     */
    public url: string;

    /**
     * The constructor options.
     * @name PIXI.sound.Sound#options
     * @type {Object}
     * @readonly
     */
    public options: Options;

    /**
     * The audio source
     * @name PIXI.sound.Sound#media
     * @type {PIXI.sound.IMedia}
     * @private
     */
    public media: IMedia;

    /**
     * The collection of instances being played.
     * @name PIXI.sound.Sound#_instances
     * @type {Array<IMediaInstance>}
     * @private
     */
    private _instances: IMediaInstance[];

    /**
     * Reference to the sound context.
     * @name PIXI.sound.Sound#_sprites
     * @type {SoundContext}
     * @private
     */
    private _sprites: SoundSprites;

    /**
     * The options when auto-playing.
     * @name PIXI.sound.Sound#_autoPlayOptions
     * @type {PlayOptions}
     * @private
     */
    private _autoPlayOptions: PlayOptions;

    /**
     * The internal volume.
     * @name PIXI.sound.Sound#_volume
     * @type {number}
     * @private
     */
    private _volume: number;

    /**
     * The internal paused state.
     * @name PIXI.sound.Sound#_paused
     * @type {boolean}
     * @private
     */
    private _paused: boolean;

    /**
     * The internal muted state.
     * @name PIXI.sound.Sound#_muted
     * @type {boolean}
     * @private
     */
    private _muted: boolean;

    /**
     * The internal volume.
     * @name PIXI.sound.Sound#_loop
     * @type {boolean}
     * @private
     */
    private _loop: boolean;

    /**
     * The internal playbackRate
     * @name PIXI.sound.Sound#_speed
     * @type {number}
     * @private
     */
    private _speed: number;

    /**
     * Create a new sound instance from source.
     * @method PIXI.sound.Sound.from
     * @param {ArrayBuffer|String|Object|HTMLAudioElement} options Either the path or url to the source file.
     *        or the object of options to use.
     * @param {String} [options.url] If `options` is an object, the source of file.
     * @param {HTMLAudioElement|ArrayBuffer} [options.source] The source, if already preloaded.
     * @param {boolean} [options.autoPlay=false] true to play after loading.
     * @param {boolean} [options.preload=false] true to immediately start preloading.
     * @param {boolean} [options.singleInstance=false] `true` to disallow playing multiple layered instances at once.
     * @param {number} [options.volume=1] The amount of volume 1 = 100%.
     * @param {number} [options.speed=1] The playback rate where 1 is 100% speed.
     * @param {Object} [options.sprites] The map of sprite data. Where a sprite is an object
     *        with a `start` and `end`, which are the times in seconds. Optionally, can include
     *        a `speed` amount where 1 is 100% speed.
     * @param {PIXI.sound.Sound~completeCallback} [options.complete=null] Global complete callback
     *        when play is finished.
     * @param {PIXI.sound.Sound~loadedCallback} [options.loaded=null] Call when finished loading.
     * @param {boolean} [options.loop=false] true to loop the audio playback.
     * @return {PIXI.sound.Sound} Created sound instance.
     */
    public static from(source: string | Options | ArrayBuffer | HTMLAudioElement): Sound
    {
        let options: Options = {};

        if (typeof source === "string")
        {
            options.url = source as string;
        }
        else if (source instanceof ArrayBuffer || source instanceof HTMLAudioElement)
        {
            options.source = source;
        }
        else
        {
            options = source;
        }

        // Default settings
        options = {
            autoPlay: false,
            singleInstance: false,
            url: null,
            source: null,
            preload: false,
            volume: 1,
            speed: 1,
            complete: null,
            loaded: null,
            loop: false, ...options};

        // Resolve url in-case it has a special format
        if (options.url)
        {
            options.url = resolveUrl(options.url);
        }

        Object.freeze(options);

        const media: IMedia = getInstance().useLegacy ?
            new HTMLAudioMedia() :
            new WebAudioMedia();

        return new Sound(media, options);
    }

    /**
     * Constructor, use `PIXI.sound.Sound.from`
     * @private
     */
    constructor(media: IMedia, options: Options)
    {
        this.media = media;
        this.options = options;
        this._instances = [];
        this._sprites = {};

        this.media.init(this);

        const complete = options.complete;
        this._autoPlayOptions = complete ? { complete } : null;
        this.isLoaded = false;
        this.isPlaying = false;
        this.autoPlay = options.autoPlay;
        this.singleInstance = options.singleInstance;
        this.preload = options.preload || this.autoPlay;
        this.url = options.url;
        this.speed = options.speed;
        this.volume = options.volume;
        this.loop = options.loop;

        if (options.sprites)
        {
            this.addSprites(options.sprites);
        }

        if (this.preload)
        {
            this._preload(options.loaded);
        }
    }

    /**
     * Instance of the media context
     * @name PIXI.sound.Sound#context
     * @type {PIXI.sound.IMediaContext}
     * @readonly
     */
    public get context(): IMediaContext
    {
        return getInstance().context;
    }

    /**
     * Stops all the instances of this sound from playing.
     * @method PIXI.sound.Sound#pause
     * @return {PIXI.sound.Sound} Instance of this sound.
     */
    public pause(): Sound
    {
        this.isPlaying = false;
        this.paused = true;
        return this;
    }

    /**
     * Resuming all the instances of this sound from playing
     * @method PIXI.sound.Sound#resume
     * @return {PIXI.sound.Sound} Instance of this sound.
     */
    public resume(): Sound
    {
        this.isPlaying = this._instances.length > 0;
        this.paused = false;
        return this;
    }

    /**
     * Stops all the instances of this sound from playing.
     * @name PIXI.sound.Sound#paused
     * @type {boolean}
     * @readonly
     */
    public get paused(): boolean
    {
        return this._paused;
    }
    public set paused(paused: boolean)
    {
        this._paused = paused;
        this.refreshPaused();
    }

    /**
     * The playback rate
     * @name PIXI.sound.Sound#speed
     * @type {number}
     */
    public get speed(): number
    {
        return this._speed;
    }
    public set speed(speed: number)
    {
        this._speed = speed;
        this.refresh();
    }

    /**
     * Set the filters. Only supported with WebAudio.
     * @name PIXI.sound.Sound#filters
     * @type {Array<PIXI.sound.filters.Filter>}
     */
    public get filters(): Filter[]
    {
        return this.media.filters;
    }
    public set filters(filters: Filter[])
    {
        this.media.filters = filters;
    }

    /**
     * Add a sound sprite, which is a saved instance of a longer sound.
     * Similar to an image spritesheet.
     * @method PIXI.sound.Sound#addSprites
     * @param {String} alias The unique name of the sound sprite.
     * @param {object} data Either completed function or play options.
     * @param {number} data.start Time when to play the sound in seconds.
     * @param {number} data.end Time to end playing in seconds.
     * @param {number} [data.speed] Override default speed, default to the Sound's speed setting.
     * @return {PIXI.sound.SoundSprite} Sound sprite result.
     */
    public addSprites(alias: string, data: SoundSpriteData): SoundSprite;

    /**
     * Convenience method to add more than one sprite add a time.
     * @method PIXI.sound.Sound#addSprites
     * @param {Object} data Map of sounds to add where the key is the alias,
     *        and the data are configuration options, see {@PIXI.sound.Sound#addSprite} for info on data.
     * @return {Object} The map of sound sprites added.
     */
    public addSprites(sprites: {[id: string]: SoundSpriteData}): SoundSprites;

    // Actual implementation
    public addSprites(
        source: string | {[id: string]: SoundSpriteData},
        data?: SoundSpriteData): SoundSprite | SoundSprites
    {
        if (typeof source === "object")
        {
            const results: SoundSprites = {};
            for (const alias in source)
            {
                results[alias] = this.addSprites(alias, source[alias]);
            }
            return results;
        }
        else if (typeof source === "string")
        {
            // tslint:disable-next-line no-console
            console.assert(!this._sprites[source], `Alias ${source} is already taken`);
            const sprite = new SoundSprite(this, data);
            this._sprites[source] = sprite;
            return sprite;
        }
    }

    /**
     * Destructor, safer to use `SoundLibrary.remove(alias)` to remove this sound.
     * @method PIXI.sound.Sound#destroy
     */
    public destroy(): void
    {
        this._removeInstances();
        this.removeSprites();
        this.media.destroy();
        this.media = null;
        this._sprites = null;
        this._instances = null;
    }

    /**
     * Remove all sound sprites.
     * @method PIXI.sound.Sound#removeSprites
     * @return {PIXI.sound.Sound} Sound instance for chaining.
     */

    /**
     * Remove a sound sprite.
     * @method PIXI.sound.Sound#removeSprites
     * @param {String} alias The unique name of the sound sprite.
     * @return {PIXI.sound.Sound} Sound instance for chaining.
     */
    public removeSprites(alias?: string): Sound
    {
        if (!alias)
        {
            for (const name in this._sprites)
            {
                this.removeSprites(name);
            }
        }
        else
        {
            const sprite: SoundSprite = this._sprites[alias];

            if (sprite !== undefined)
            {
                sprite.destroy();
                delete this._sprites[alias];
            }
        }
        return this;
    }

    /**
     * If the current sound is playable (loaded).
     * @name PIXI.sound.Sound#isPlayable
     * @type {boolean}
     * @readonly
     */
    public get isPlayable(): boolean
    {
        return this.isLoaded && this.media && this.media.isPlayable;
    }

    /**
     * Stops all the instances of this sound from playing.
     * @method PIXI.sound.Sound#stop
     * @return {PIXI.sound.Sound} Instance of this sound.
     */
    public stop(): Sound
    {
        if (!this.isPlayable)
        {
            this.autoPlay = false;
            this._autoPlayOptions = null;
            return this;
        }
        this.isPlaying = false;

        // Go in reverse order so we don't skip items
        for (let i = this._instances.length - 1; i >= 0; i--)
        {
            this._instances[i].stop();
        }
        return this;
    }

    /**
     * Play a sound sprite, which is a saved instance of a longer sound.
     * Similar to an image spritesheet.
     * @method PIXI.sound.Sound#play
     * @param {String} alias The unique name of the sound sprite.
     * @param {object} data Either completed function or play options.
     * @param {number} data.start Time when to play the sound in seconds.
     * @param {number} data.end Time to end playing in seconds.
     * @param {number} [data.speed] Override default speed, default to the Sound's speed setting.
     * @param {PIXI.sound.Sound~completeCallback} [callback] Callback when completed.
     * @return {PIXI.sound.IMediaInstance|Promise<PIXI.sound.IMediaInstance>} The sound instance,
     *        this cannot be reused after it is done playing. Returns a Promise if the sound
     *        has not yet loaded.
     */
    public play(alias: string, callback?: CompleteCallback): IMediaInstance | Promise<IMediaInstance>;

    /**
     * Plays the sound.
     * @method PIXI.sound.Sound#play
     * @param {PIXI.sound.Sound~completeCallback|object} options Either completed function or play options.
     * @param {number} [options.start=0] Time when to play the sound in seconds.
     * @param {number} [options.end] Time to end playing in seconds.
     * @param {String} [options.sprite] Play a named sprite. Will override end, start and speed options.
     * @param {number} [options.speed] Override default speed, default to the Sound's speed setting.
     * @param {number} [options.volume] Current volume amount for instance.
     * @param {boolean} [options.muted] Override default muted, default to the Sound's muted setting.
     * @param {boolean} [options.loop] Override default loop, default to the Sound's loop setting.
     * @param {PIXI.sound.Sound~completeCallback} [options.complete] Callback when complete.
     * @param {PIXI.sound.Sound~loadedCallback} [options.loaded] If the sound isn't already preloaded, callback when
     *        the audio has completely finished loading and decoded.
     * @return {PIXI.sound.IMediaInstance|Promise<PIXI.sound.IMediaInstance>} The sound instance,
     *        this cannot be reused after it is done playing. Returns a Promise if the sound
     *        has not yet loaded.
     */
    public play(source?: string | PlayOptions | CompleteCallback,
                callback?: CompleteCallback): IMediaInstance | Promise<IMediaInstance>;

    // Overloaded function
    public play(source?: any, complete?: CompleteCallback): IMediaInstance | Promise<IMediaInstance>
    {
        let options: PlayOptions;

        if (typeof source === "string")
        {
            const sprite: string = source as string;
            options = { sprite, loop: this.loop, complete };
        }
        else if (typeof source === "function")
        {
            options = {};
            options.complete = source as CompleteCallback;
        }
        else
        {
            options = source as PlayOptions;
        }

        options = {
            complete: null,
            loaded: null,
            sprite: null,
            end: null,
            start: 0,
            volume: 1,
            speed: 1,
            muted: false,
            loop: false, ...(options || {})};

        // A sprite is specified, add the options
        if (options.sprite)
        {
            const alias: string = options.sprite;
            // tslint:disable-next-line no-console
            console.assert(!!this._sprites[alias], `Alias ${alias} is not available`);
            const sprite: SoundSprite = this._sprites[alias];
            options.start = sprite.start;
            options.end = sprite.end;
            options.speed = sprite.speed || 1;
            options.loop = sprite.loop || options.loop;
            delete options.sprite;
        }

        // @deprecated offset option
        if ((options as any).offset) {
            options.start = (options as any).offset as number;
        }

        // if not yet playable, ignore
        // - usefull when the sound download isnt yet completed
        if (!this.isLoaded)
        {
            return new Promise<IMediaInstance>((resolve, reject) =>
            {
                this.autoPlay = true;
                this._autoPlayOptions = options;
                this._preload((err: Error, sound: Sound, media: IMediaInstance) =>
                {
                    if (err)
                    {
                        reject(err);
                    }
                    else
                    {
                        if (options.loaded)
                        {
                            options.loaded(err, sound, media);
                        }
                        resolve(media);
                    }
                });
            });
        }

        // Stop all sounds
        if (this.singleInstance)
        {
            this._removeInstances();
        }

        // clone the bufferSource
        const instance = this._createInstance();
        this._instances.push(instance);
        this.isPlaying = true;
        instance.once("end", () => {
            if (options.complete)
            {
                options.complete(this);
            }
            this._onComplete(instance);
        });
        instance.once("stop", () => {
            this._onComplete(instance);
        });

        instance.play(options);

        return instance;
    }

    /**
     * Internal only, speed, loop, volume change occured.
     * @method refresh
     * @private
     */
    public refresh(): void
    {
        const len = this._instances.length;
        for (let i = 0; i < len; i++)
        {
            this._instances[i].refresh();
        }
    }

    /**
     * Handle changes in paused state. Internal only.
     * @method refreshPaused
     * @private
     */
    public refreshPaused(): void
    {
        const len = this._instances.length;
        for (let i = 0; i < len; i++)
        {
            this._instances[i].refreshPaused();
        }
    }

    /**
     * Gets and sets the volume.
     * @name PIXI.sound.Sound#volume
     * @type {number}
     */
    public get volume(): number
    {
        return this._volume;
    }
    public set volume(volume: number)
    {
        this._volume = volume;
        this.refresh();
    }

    /**
     * Gets and sets the muted flag.
     * @name PIXI.sound.Sound#muted
     * @type {number}
     */
    public get muted(): boolean
    {
        return this._muted;
    }
    public set muted(muted: boolean)
    {
        this._muted = muted;
        this.refresh();
    }

    /**
     * Gets and sets the looping.
     * @name PIXI.sound.Sound#loop
     * @type {boolean}
     */
    public get loop(): boolean
    {
        return this._loop;
    }
    public set loop(loop: boolean)
    {
        this._loop = loop;
        this.refresh();
    }

    /**
     * Starts the preloading of sound.
     * @method PIXI.sound.Sound#_preload
     * @private
     */
    private _preload(callback?: LoadedCallback): void
    {
        this.media.load(callback);
    }

    /**
     * Gets the list of instances that are currently being played of this sound.
     * @name PIXI.sound.Sound#instances
     * @type {Array<PIXI.sound.IMediaInstance>}
     * @readonly
     */
    public get instances(): IMediaInstance[]
    {
        return this._instances;
    }

    /**
     * Get the map of sprites.
     * @name PIXI.sound.Sound#sprites
     * @type {Object}
     * @readonly
     */
    public get sprites(): SoundSprites
    {
        return this._sprites;
    }

    /**
     * Get the duration of the audio in seconds.
     * @name PIXI.sound.Sound#duration
     * @type {number}
     */
    public get duration(): number
    {
        return this.media.duration;
    }

    /**
     * Auto play the first instance.
     * @method PIXI.sound.Sound#autoPlayStart
     * @private
     */
    public autoPlayStart(): IMediaInstance
    {
        let instance: IMediaInstance;
        if (this.autoPlay)
        {
            instance = this.play(this._autoPlayOptions) as IMediaInstance;
        }
        return instance;
    }

    /**
     * Removes all instances.
     * @method PIXI.sound.Sound#_removeInstances
     * @private
     */
    private _removeInstances(): void
    {
        // destroying also stops
        for (let i = this._instances.length - 1; i >= 0; i--)
        {
            this._poolInstance(this._instances[i]);
        }
        this._instances.length = 0;
    }

    /**
     * Sound instance completed.
     * @method PIXI.sound.Sound#_onComplete
     * @private
     * @param {PIXI.sound.IMediaInstance} instance
     */
    private _onComplete(instance: IMediaInstance): void
    {
        if (this._instances)
        {
            const index = this._instances.indexOf(instance);
            if (index > -1)
            {
                this._instances.splice(index, 1);
            }
            this.isPlaying = this._instances.length > 0;
        }
        this._poolInstance(instance);
    }

    /**
     * Create a new instance.
     * @method PIXI.sound.Sound#_createInstance
     * @private
     * @return {PIXI.sound.IMediaInstance} New instance to use
     */
    private _createInstance(): IMediaInstance
    {
        if (Sound._pool.length > 0)
        {
            const instance: IMediaInstance = Sound._pool.pop();
            instance.init(this.media);
            return instance;
        }
        return this.media.create();
    }

    /**
     * Destroy/recycling the instance object.
     * @method PIXI.sound.Sound#_poolInstance
     * @private
     * @param {PIXI.sound.IMediaInstance} instance - Instance to recycle
     */
    private _poolInstance(instance: IMediaInstance): void
    {
        instance.destroy();
        // Add it if it isn't already added
        if (Sound._pool.indexOf(instance) < 0)
        {
            Sound._pool.push(instance);
        }
    }
}
