import { Filter } from './filters/Filter';
import { HTMLAudioMedia } from './htmlaudio/HTMLAudioMedia';
import { getInstance } from './instance';
import { IMedia, IMediaContext, IMediaInstance } from './interfaces';
import { SoundSprite, SoundSpriteData, SoundSprites } from './SoundSprite';
import { resolveUrl } from './utils/resolveUrl';
import { WebAudioMedia } from './webaudio/WebAudioMedia';

/**
 * Options to use for creating sounds.
 */
interface Options {
    /**
     * `true` to immediately start preloading.
     * @default false
     */
    autoPlay?: boolean;
    /**
     * `true` to disallow playing multiple layered instances at once.
     * @default false
     */
    singleInstance?: boolean;
    /**
     * The amount of volume 1 = 100%.
     * @default 1
     */
    volume?: number;
    /**
     * The playback rate where 1 is 100% speed.
     * @default 1
     */
    speed?: number;
    /**
     * Global complete callback when play is finished.
     * @type {Function}
     */
    complete?: CompleteCallback;
    /**
     * Call when finished loading.
     * @type {Function}
     */
    loaded?: LoadedCallback;
    /**
     * `true` to immediately start preloading if loading from `url`.
     */
    preload?: boolean;
    /**
     * Initial loop value, `true` is loop infinitely
     * @default false
     */
    loop?: boolean;
    /**
     * The source of the file being loaded
     */
    url?: string;
    /**
     * If sound is already preloaded, available.
     */
    source?: ArrayBuffer | AudioBuffer | HTMLAudioElement;
    /**
     * The map of sprite data. Where a sprite is an object
     * with a `start` and `end`, which are the times in seconds. Optionally, can include
     * a `speed` amount where 1 is 100% speed.
     */
    sprites?: Record<string, SoundSpriteData>;
}

/**
 * Options used for sound playback.
 */
interface PlayOptions {
    /**
     * Start time offset in seconds.
     * @default 0
     */
    start?: number;
    /**
     * End time in seconds.
     */
    end?: number;
    /**
     * Override default speed, default to the Sound's speed setting.
     */
    speed?: number;
    /**
    * Override default loop, default to the Sound's loop setting.
    */
    loop?: boolean;
    /**
     * Override default volume, default to the Sound's volume setting.
     */
    volume?: number;
    /**
     * The sprite to play.
     */
    sprite?: string;
    /**
     * If sound instance is muted by default.
     * @default false
     */
    muted?: boolean;
    /**
     * Filters that apply to play.
     * Only supported with WebAudio.
     */
    filters?: Filter[];
    /**
     * When completed.
     * @type {Function}
     */
    complete?: CompleteCallback;
    /**
     * If not already preloaded, callback when finishes load.
     * @type {Function}
     */
    loaded?: LoadedCallback;
    /**
     * Setting `true` will stop any playing instances. This is the same as
     * the singleInstance property on Sound, but is play-specific.
     */
    singleInstance?: boolean;
}

/**
 * Callback when sound is loaded.
 * @ignore
 * @param {Error} err - The callback error.
 * @param {Sound} sound - The instance of new sound.
 * @param {IMediaInstance} instance - The instance of auto-played sound.
 */
type LoadedCallback = (err: Error, sound?: Sound, instance?: IMediaInstance) => void;

/**
 * Callback when sound is completed.
 * @ignore
 * @param {Sound} sound - The instance of sound.
 */
type CompleteCallback = (sound: Sound) => void;

type SoundSpriteDataMap = Record<string, SoundSpriteData>;

/**
 * Sound represents a single piece of loaded media. When playing a sound {@link IMediaInstance} objects
 * are created. Properties such a `volume`, `pause`, `mute`, `speed`, etc will have an effect on all instances.
 */
class Sound
{
    /** Pool of instances */
    private static _pool: IMediaInstance[] = [];

    /**
     * `true` if the buffer is loaded.
     * @default false
     */
    public isLoaded: boolean;

    /**
     * `true` if the sound is currently being played.
     * @default false
     * @readonly
     */
    public isPlaying: boolean;

    /**
     * true to start playing immediate after load.
     * @default false
     * @readonly
     */
    public autoPlay: boolean;

    /**
     * `true` to disallow playing multiple layered instances at once.
     * @default false
     */
    public singleInstance: boolean;

    /**
     * `true` to immediately start preloading.
     * @default false
     * @readonly
     */
    public preload: boolean;

    /**
     * The file source to load.
     * @readonly
     */
    public url: string;

    /**
     * The constructor options.
     * @readonly
     */
    public options: Options;

    /** The audio source */
    public media: IMedia;

    /** The collection of instances being played. */
    private _instances: IMediaInstance[];

    /** The user defined sound sprites. */
    private _sprites: SoundSprites;

    /** The options when auto-playing. */
    private _autoPlayOptions: PlayOptions;

    /** The internal volume. */
    private _volume: number;

    /** The internal paused state. */
    private _paused: boolean;

    /** The internal muted state. */
    private _muted: boolean;

    /** The internal volume. */
    private _loop: boolean;

    /** The internal playbackRate */
    private _speed: number;

    /**
     * Create a new sound instance from source.
     * @param source - Either the path or url to the source file.
     *        or the object of options to use.
     * @return Created sound instance.
     */
    public static from(source: string | Options | ArrayBuffer | HTMLAudioElement | AudioBuffer): Sound
    {
        let options: Options = {};

        if (typeof source === 'string')
        {
            options.url = source as string;
        }
        else if (source instanceof ArrayBuffer || source instanceof AudioBuffer || source instanceof HTMLAudioElement)
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
            loop: false, ...options };

        // Resolve url in-case it has a special format
        if (options.url)
        {
            options.url = resolveUrl(options.url);
        }

        Object.freeze(options);

        const media: IMedia = getInstance().useLegacy
            ? new HTMLAudioMedia()
            : new WebAudioMedia();

        return new Sound(media, options);
    }

    /**
     * Use `Sound.from`
     * @ignore
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

    /** Instance of the media context. */
    public get context(): IMediaContext
    {
        return getInstance().context;
    }

    /** Stops all the instances of this sound from playing. */
    public pause(): this
    {
        this.isPlaying = false;
        this.paused = true;

        return this;
    }

    /** Resuming all the instances of this sound from playing */
    public resume(): this
    {
        this.isPlaying = this._instances.length > 0;
        this.paused = false;

        return this;
    }

    /** Stops all the instances of this sound from playing. */
    public get paused(): boolean
    {
        return this._paused;
    }
    public set paused(paused: boolean)
    {
        this._paused = paused;
        this.refreshPaused();
    }

    /** The playback rate. */
    public get speed(): number
    {
        return this._speed;
    }
    public set speed(speed: number)
    {
        this._speed = speed;
        this.refresh();
    }

    /** Set the filters. Only supported with WebAudio. */
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
     * @param alias - The unique name of the sound sprite.
     * @param data - Either completed function or play options.
     */
    public addSprites(alias: string, data: SoundSpriteData): SoundSprite;

    /**
     * Convenience method to add more than one sprite add a time.
     * @param data - Map of sounds to add where the key is the alias,
     *        and the data are configuration options.
     * @return The map of sound sprites added.
     */
    public addSprites(data: SoundSpriteDataMap): SoundSprites;

    /**
     * @ignore
     */
    public addSprites(source: string | SoundSpriteDataMap, data?: SoundSpriteData): any
    {
        if (typeof source === 'object')
        {
            const results: SoundSprites = {};

            for (const alias in source)
            {
                results[alias] = this.addSprites(alias, source[alias]);
            }

            return results;
        }

        // eslint-disable-next-line no-console
        console.assert(!this._sprites[source], `Alias ${source} is already taken`);
        const sprite = new SoundSprite(this, data);

        this._sprites[source] = sprite;

        return sprite;
    }

    /** Destructor, safer to use `SoundLibrary.remove(alias)` to remove this sound. */
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
     * Remove a sound sprite.
     * @param alias - The unique name of the sound sprite, if alias is omitted, removes all sprites.
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

    /** If the current sound is playable (loaded). */
    public get isPlayable(): boolean
    {
        return this.isLoaded && this.media && this.media.isPlayable;
    }

    /** Stops all the instances of this sound from playing. */
    public stop(): this
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
     * @method play
     * @instance
     * @param alias - The unique name of the sound sprite.
     * @param {Function} callback - Callback when completed.
     * @return The sound instance,
     *        this cannot be reused after it is done playing. Returns a Promise if the sound
     *        has not yet loaded.
     */
    public play(alias: string, callback?: CompleteCallback): IMediaInstance | Promise<IMediaInstance>;

    /**
     * Plays the sound.
     * @method play
     * @instance
     * @param {Function|PlayOptions} source - Either completed function or play options.
     * @param {Function} callback - Callback when completed.
     * @return The sound instance,
     *        this cannot be reused after it is done playing. Returns a Promise if the sound
     *        has not yet loaded.
     */
    public play(source?: string | PlayOptions | CompleteCallback,
                callback?: CompleteCallback): IMediaInstance | Promise<IMediaInstance>;

    // Overloaded function
    public play(source?: string | PlayOptions | CompleteCallback,
        complete?: CompleteCallback): IMediaInstance | Promise<IMediaInstance>
    {
        let options: PlayOptions;

        if (typeof source === 'string')
        {
            const sprite: string = source as string;

            options = { sprite, loop: this.loop, complete };
        }
        else if (typeof source === 'function')
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
            loop: false, ...(options || {}) };

        // A sprite is specified, add the options
        if (options.sprite)
        {
            const alias: string = options.sprite;

            // eslint-disable-next-line no-console
            console.assert(!!this._sprites[alias], `Alias ${alias} is not available`);
            const sprite: SoundSprite = this._sprites[alias];

            options.start = sprite.start + (options.start || 0);
            options.end = sprite.end;
            options.speed = sprite.speed || 1;
            options.loop = sprite.loop || options.loop;
            delete options.sprite;
        }

        // @deprecated offset option
        if ((options as any).offset)
        {
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
        if (this.singleInstance || options.singleInstance)
        {
            this._removeInstances();
        }

        // clone the bufferSource
        const instance = this._createInstance();

        this._instances.push(instance);
        this.isPlaying = true;
        instance.once('end', () =>
        {
            if (options.complete)
            {
                options.complete(this);
            }
            this._onComplete(instance);
        });
        instance.once('stop', () =>
        {
            this._onComplete(instance);
        });

        instance.play(options);

        return instance;
    }

    /** Internal only, speed, loop, volume change occured. */
    public refresh(): void
    {
        const len = this._instances.length;

        for (let i = 0; i < len; i++)
        {
            this._instances[i].refresh();
        }
    }

    /** Handle changes in paused state. Internal only. */
    public refreshPaused(): void
    {
        const len = this._instances.length;

        for (let i = 0; i < len; i++)
        {
            this._instances[i].refreshPaused();
        }
    }

    /** Gets and sets the volume. */
    public get volume(): number
    {
        return this._volume;
    }
    public set volume(volume: number)
    {
        this._volume = volume;
        this.refresh();
    }

    /** Gets and sets the muted flag. */
    public get muted(): boolean
    {
        return this._muted;
    }
    public set muted(muted: boolean)
    {
        this._muted = muted;
        this.refresh();
    }

    /** Gets and sets the looping. */
    public get loop(): boolean
    {
        return this._loop;
    }
    public set loop(loop: boolean)
    {
        this._loop = loop;
        this.refresh();
    }

    /** Starts the preloading of sound. */
    private _preload(callback?: LoadedCallback): void
    {
        this.media.load(callback);
    }

    /** Gets the list of instances that are currently being played of this sound. */
    public get instances(): IMediaInstance[]
    {
        return this._instances;
    }

    /** Get the map of sprites. */
    public get sprites(): SoundSprites
    {
        return this._sprites;
    }

    /** Get the duration of the audio in seconds. */
    public get duration(): number
    {
        return this.media.duration;
    }

    /** Auto play the first instance. */
    public autoPlayStart(): IMediaInstance
    {
        let instance: IMediaInstance;

        if (this.autoPlay)
        {
            instance = this.play(this._autoPlayOptions) as IMediaInstance;
        }

        return instance;
    }

    /** Removes all instances. */
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
     * @param instance
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

    /** Create a new instance. */
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
     * @param instance - Instance to recycle
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

export { Sound };
export type {
    Options,
    PlayOptions,
    LoadedCallback,
    CompleteCallback,
    SoundSpriteDataMap
};
