import SoundSprite from './SoundSprite';
import Sound from "../webaudio/Sound";
import soundLibrary from '../index';
import {ISoundInstance} from './ISoundInstance';
import {poolInstance, createInstance} from "../utils/InstanceUtils";
import {SoundSpriteData} from "./SoundSprite";

// Constructor options
export interface Options {
    autoPlay?: boolean;
    preaload?: boolean;
    singleInstance?: boolean;
    volume?: number;
    speed?: number;
    complete?: CompleteCallback;
    loaded?: LoadedCallback;
    preload?: boolean;
    loop?: boolean;
    src?: string;
    srcBuffer?: ArrayBuffer|HTMLAudioElement;
    useXHR?: boolean;
    sprites?: {[id: string]: SoundSpriteData};
}

// Collection of sound sprites
export type SoundSprites = {[id: string]: SoundSprite};

// Interface for play options
export interface PlayOptions {
    start?: number;
    end?: number;
    speed?: number;
    loop?: boolean;
    fadeIn?: number;
    fadeOut?: number;
    sprite?: string;
    complete?: CompleteCallback;
    loaded?: LoadedCallback;
}

/**
 * Callback when sound is loaded.
 * @callback PIXI.sound.Sound~loadedCallback
 * @param {Error} err The callback error.
 * @param {PIXI.sound.Sound} sound The instance of new sound.
 * @param {PIXI.sound.SoundInstance} instance The instance of auto-played sound.
 */
export declare type LoadedCallback = (err: Error, sound?: BaseSound, instance?: ISoundInstance) => void;

/**
 * Callback when sound is completed.
 * @callback PIXI.sound.Sound~completeCallback
 * @param {PIXI.sound.Sound} sound The instance of sound.
 */
export declare type CompleteCallback = (sound: BaseSound) => void;

/**
 * Abstract base class for LegacySound and Sound.
 * @class BaseSound
 * @memberof PIXI.sound
 */
export default class BaseSound
{
    /**
     * `true` if the buffer is loaded.
     * @name PIXI.sound.BaseSound#isLoaded
     * @type {Boolean}
     * @default false
     */
    public isLoaded: boolean;

    /**
     * `true` if the sound is currently being played.
     * @name PIXI.sound.BaseSound#isPlaying
     * @type {Boolean}
     * @default false
     * @readonly
     */
    public isPlaying: boolean;

    /**
     * true to start playing immediate after load.
     * @name PIXI.sound.BaseSound#autoPlay
     * @type {Boolean}
     * @default false
     * @readonly
     */
    public autoPlay: boolean;

    /**
     * `true` to disallow playing multiple layered instances at once.
     * @name PIXI.sound.BaseSound#singleInstance
     * @type {Boolean}
     * @default false
     */
    public singleInstance: boolean;

    /**
     * `true` to immediately start preloading.
     * @name PIXI.sound.BaseSound#preload
     * @type {Boolean}
     * @default false
     * @readonly
     */
    public preload: boolean;

    /**
     * The file source to load.
     * @name PIXI.sound.BaseSound#src
     * @type {String}
     * @readonly
     */
    public src: string;

    /**
     * The constructor options.
     * @name PIXI.sound.BaseSound#_options
     * @type {Object}
     * @protected
     */
    protected _options:Options;

    /**
     * The collection of instances being played.
     * @name PIXI.sound.BaseSound#_instances
     * @type {Array<ISoundInstance>}
     * @protected
     */
    protected _instances: ISoundInstance[];

    /**
     * Reference to the sound context.
     * @name PIXI.sound.BaseSound#_context
     * @type {SoundContext}
     * @protected
     */
    protected _sprites: SoundSprites;

    /**
     * The options when auto-playing.
     * @name PIXI.sound.BaseSound#_autoPlayOptions
     * @type {PlayOptions}
     * @protected
     */
    protected _autoPlayOptions: PlayOptions;

    /**
     * The internal volume.
     * @name PIXI.sound.BaseSound#_volume
     * @type {Number}
     * @protected
     */
    protected _volume: number;

    /**
     * The internal volume.
     * @name PIXI.sound.BaseSound#_loop
     * @type {Boolean}
     * @protected
     */
    protected _loop: boolean;

    constructor(source: string|Options|HTMLAudioElement|ArrayBuffer)
    {
        let options: Options = {};

        if (typeof source === "string")
        {
            options.src = source as string;
        }
        else if (source instanceof ArrayBuffer || source instanceof HTMLAudioElement)
        {
            options.srcBuffer = source ;
        }
        else
        {
            options = source;
        }

        // Default settings
        this._options = Object.assign({
            autoPlay: false,
            singleInstance: false,
            src: null,
            srcBuffer: null,
            preload: false,
            volume: 1,
            speed: 1,
            complete: null,
            loaded: null,
            loop: false,
            useXHR: true,
        }, options);

        this._instances = [];
        this._sprites = {};

        const complete = options.complete;
        this._autoPlayOptions = complete ? { complete } : null;

        this.isLoaded = false;
        this.isPlaying = false;
        this.autoPlay = options.autoPlay;
        this.singleInstance = options.singleInstance;
        this.preload = options.preload || this.autoPlay;
        this.src = options.src;
        this._loop = options.loop;
        this._volume = options.volume;

        if (options.sprites)
        {
            this.addSprites(options.sprites);
        }
    }

    /**
     * Stops all the instances of this sound from playing.
     * @method PIXI.sound.BaseSound#pause
     * @return {PIXI.sound.BaseSound} Instance of this sound.
     */
    public pause(): BaseSound
    {
        for (let i = this._instances.length - 1; i >= 0; i--)
        {
            this._instances[i].paused = true;
        }
        this.isPlaying = false;
        return this;
    }

    /**
     * Resuming all the instances of this sound from playing
     * @method PIXI.sound.BaseSound#resume
     * @return {PIXI.sound.BaseSound} Instance of this sound.
     */
    public resume(): BaseSound
    {
        for (let i = this._instances.length - 1; i >= 0; i--)
        {
            this._instances[i].paused = false;
        }
        this.isPlaying = this._instances.length > 0;
        return this;
    }

    /**
     * Add a sound sprite, which is a saved instance of a longer sound.
     * Similar to an image spritesheet.
     * @method PIXI.sound.BaseSound#addSprites
     * @param {String} alias The unique name of the sound sprite.
     * @param {object} data Either completed function or play options.
     * @param {Number} data.start Time when to play the sound in seconds.
     * @param {Number} data.end Time to end playing in seconds.
     * @param {Number} [data.speed] Override default speed, default to the Sound's speed setting.
     * @return {PIXI.sound.SoundSprite} Sound sprite result.
     */
    public addSprites(alias: string, data: SoundSpriteData): SoundSprite;

    /**
     * Convenience method to add more than one sprite add a time.
     * @method PIXI.sound.BaseSound#addSprites
     * @param {Object} data Map of sounds to add where the key is the alias,
     *        and the data are configuration options, see {@PIXI.sound.BaseSound#addSprite} for info on data.
     * @return {Object} The map of sound sprites added.
     */
    public addSprites(sprites: {[id: string]: SoundSpriteData}): SoundSprites;

    // Actual implementation
    public addSprites(source: string|{[id: string]: SoundSpriteData}, data?: SoundSpriteData): SoundSprite|SoundSprites
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
            console.assert(!this._sprites[source], `Alias ${source} is already taken`);
            const sprite = new SoundSprite(this, data);
            this._sprites[source] = sprite;
            return sprite;
        }
    }

    /**
     * Destructor, safer to use `SoundLibrary.remove(alias)` to remove this sound.
     * @method PIXI.sound.BaseSound#destroy
     */
    public destroy(): void
    {
        this.removeSprites();
        this._sprites = null;

        this._removeInstances();
        this._instances = null;
    }

    /**
     * Remove all sound sprites.
     * @method PIXI.sound.BaseSound#removeSprites
     * @return {PIXI.sound.Sound} Sound instance for chaining.
     */

    /**
     * Remove a sound sprite.
     * @method PIXI.sound.BaseSound#removeSprites
     * @param {String} alias The unique name of the sound sprite.
     * @return {PIXI.sound.Sound} Sound instance for chaining.
     */
    public removeSprites(alias?: string): BaseSound
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
     * @name PIXI.sound.BaseSound#isPlayable
     * @type {Boolean}
     * @readonly
     */
    public get isPlayable(): boolean
    {
        return this.isLoaded;
    }

    /**
     * Stops all the instances of this sound from playing.
     * @method PIXI.sound.BaseSound#stop
     * @return {PIXI.sound.BaseSound} Instance of this sound.
     */
    public stop(): BaseSound
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
     * @method PIXI.sound.BaseSound#play
     * @param {String} alias The unique name of the sound sprite.
     * @param {object} data Either completed function or play options.
     * @param {Number} data.start Time when to play the sound in seconds.
     * @param {Number} data.end Time to end playing in seconds.
     * @param {Number} [data.speed] Override default speed, default to the Sound's speed setting.
     * @param {PIXI.sound.Sound~completeCallback} [callback] Callback when completed.
     * @return {PIXI.sound.SoundInstance|Promise<PIXI.sound.SoundInstance>} The sound instance,
     *        this cannot be reused after it is done playing. Returns a Promise if the sound
     *        has not yet loaded.
     */
    public play(alias: string, callback?: CompleteCallback): ISoundInstance|Promise<ISoundInstance>;

    /**
     * Plays the sound.
     * @method PIXI.sound.BaseSound#play
     * @param {PIXI.sound.Sound~completeCallback|object} options Either completed function or play options.
     * @param {Number} [options.start=0] Time when to play the sound in seconds.
     * @param {Number} [options.end] Time to end playing in seconds.
     * @param {String} [options.sprite] Play a named sprite. Will override end, start and speed options.
     * @param {Number} [options.fadeIn] Amount of time to fade in volume. If less than 10,
     *        considered seconds or else milliseconds.
     * @param {Number} [options.fadeOut] Amount of time to fade out volume. If less than 10,
     *        considered seconds or else milliseconds.
     * @param {Number} [options.speed] Override default speed, default to the Sound's speed setting.
     * @param {Boolean} [options.loop] Override default loop, default to the Sound's loop setting.
     * @param {PIXI.sound.Sound~completeCallback} [options.complete] Callback when complete.
     * @param {PIXI.sound.Sound~loadedCallback} [options.loaded] If the sound isn't already preloaded, callback when
     *        the audio has completely finished loading and decoded.
     * @return {PIXI.sound.SoundInstance|Promise<PIXI.sound.SoundInstance>} The sound instance,
     *        this cannot be reused after it is done playing. Returns a Promise if the sound
     *        has not yet loaded.
     */
    public play(source?: PlayOptions|CompleteCallback,
                callback?: CompleteCallback): ISoundInstance|Promise<ISoundInstance>;

    // Overloaded function
    public play(source?: any, complete?: CompleteCallback): ISoundInstance|Promise<ISoundInstance>
    {
        let options: PlayOptions;

        if (typeof source === "string")
        {
            const sprite: string = source as string;
            options = { sprite, complete };
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

        options = Object.assign({
            complete: null,
            loaded: null,
            sprite: null,
            start: 0,
            fadeIn: 0,
            fadeOut: 0,
        }, options || {});

        // A sprite is specified, add the options
        if (options.sprite)
        {
            const alias: string = options.sprite;
            // @if DEBUG
            console.assert(!!this._sprites[alias], `Alias ${alias} is not available`);
            // @endif
            const sprite: SoundSprite = this._sprites[alias];
            options.start = sprite.start;
            options.end = sprite.end;
            options.speed = sprite.speed;
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
            return new Promise<ISoundInstance>((resolve, reject) =>
            {
                this.autoPlay = true;
                this._autoPlayOptions = options;
                this._beginPreload((err: Error, sound: BaseSound, instance: ISoundInstance) =>
                {
                    if (err)
                    {
                        reject(err);
                    }
                    else
                    {
                        if (options.loaded)
                        {
                            options.loaded(err, sound, instance);
                        }
                        resolve(instance);
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
        const instance = createInstance(this);
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

        instance.play(
            options.start,
            options.end,
            options.speed,
            options.loop,
            options.fadeIn,
            options.fadeOut,
        );
        return instance;
    }

    /**
     * Gets and sets the volume.
     * @name PIXI.sound.BaseSound#volume
     * @type {Number}
     */
    public get volume(): number
    {
        return this._volume;
    }
    public set volume(volume: number)
    {
        this._volume = volume;
    }

    /**
     * Gets and sets the looping.
     * @name PIXI.sound.BaseSound#loop
     * @type {Boolean}
     */
    public get loop(): boolean
    {
        return this._loop;
    }
    public set loop(loop: boolean)
    {
        this._loop = loop;
    }

    /**
     * Sound instance completed.
     * @method PIXI.sound.BaseSound#_onComplete
     * @private
     * @param {PIXI.sound.SoundInstance} instance
     */
    private _onComplete(instance: ISoundInstance): void
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
        poolInstance(instance);
    }

    /**
     * Starts the preloading of sound.
     * @method PIXI.sound.BaseSound#_beginPreload
     * @protected
     */
    protected _beginPreload(callback?: LoadedCallback): void
    {
        // override
    }

    /**
     * Gets the list of instances that are currently being played of this sound.
     * @name PIXI.sound.Sound#instances
     * @type {Array<SoundInstance>}
     * @readonly
     */
    public get instances(): ISoundInstance[]
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
     * The speed, this is only support with WebAudio.
     * @name PIXI.sound.BaseSound#speed
     * @type {Number}
     */
    public get speed(): number
    {
        return 1;
    }

    /**
     * Get the duration of the audio in seconds.
     * @name PIXI.sound.BaseSound#duration
     * @type {Number}
     */
    public get duration(): number
    {
        // Must override
        return NaN;
    }

    /**
     * Removes all instances.
     * @method PIXI.sound.BaseSound#_removeInstances
     * @protected
     */
    protected _removeInstances(): void
    {
        // destroying also stops
        for (let i = this._instances.length - 1; i >= 0; i--)
        {
            poolInstance(this._instances[i]);
        }
        this._instances.length = 0;
    }

    /**
     * Auto play the first instance.
     * @method PIXI.sound.BaseSound#_autoPlay
     * @protected
     */
    protected _autoPlay(): ISoundInstance
    {
        let instance: ISoundInstance;
        if (this.autoPlay)
        {
            instance = this.play(this._autoPlayOptions) as ISoundInstance;
        }
        return instance;
    }
}