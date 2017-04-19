import {Options, LoadedCallback, CompleteCallback, PlayOptions} from '../bases/BaseSound';
import {SoundSpriteData, SoundSprites} from "../sprites/SoundSprite";
import SoundSprite from "../sprites/SoundSprite";
import {IMedia} from '../interfaces/IMedia';

/**
 * The fallback version of Sound which uses `<audio>` instead of WebAudio API.
 * @class HTMLAudioMedia
 * @memberof PIXI.sound.htmlaudio
 * @param {HTMLAudioElement|String|Object} options Either the path or url to the source file.
 *        or the object of options to use. See {@link PIXI.sound.Sound.from}
 */
export default class HTMLAudioMedia implements IMedia
{
    private _source: HTMLAudioElement;

    constructor(options: Options)
    {
        this._source = options.source as HTMLAudioElement || new Audio();
        this.speed = options.speed;
        if (options.url)
        {
            this._source.src = options.url;
        }
    }

    // override isplayable getter
    public get isPlayable(): boolean
    {
        return !!this._source && this._source.readyState === 4;
    }

    // Override volume setter
    public set volume(volume:number)
    {
        this._source.volume = volume;
    }

    // Override loop setter
    public set loop(loop:boolean)
    {
        this._source.loop = loop;
    }

    /**
     * The playback rate where 1 is 100%.
     * @name PIXI.sound.legacy.LegacySound#speed
     * @type {Number}
     * @default 1
     */
    public get speed(): number
    {
        return this._source.playbackRate;
    }
    public set speed(value: number)
    {
        this._source.playbackRate = value;
    }

    // Override duration getter
    public get duration(): number
    {
        return this._source.duration;
    }

    // Override the destroy
    public destroy(): void
    {
        if (this._source)
        {
            this._source.src = "";
            this._source.load();
            this._source = null;
        }
    }

    /**
     * Get the audio source element.
     * @name PIXI.sound.legacy.LegacySound#source
     * @type {HTMLAudioElement}
     * @readonly
     */
    public get source(): HTMLAudioElement
    {
        return this._source;
    }

    // Implement the method to being preloading
    public load(callback?: LoadedCallback): void
    {
        const source = this._source;

        // See if the source is already loaded
        if (source.readyState === 4)
        {
            this.isLoaded = true;
            const instance = this._autoPlay();
            if (callback)
            {
                setTimeout(() =>
                {
                    callback(null, this, instance)
                }, 0);
            }
            return;
        }

        // If there's no source, we cannot load
        if (!this.url)
        {
            return callback(new Error("sound.url or sound.source must be set"));
        }

        // Set the source
        source.src = this.url;

        // Remove all event listeners
        const removeListeners = () =>
        {
            // Listen for callback
            source.removeEventListener('canplaythrough', onLoad);
            source.removeEventListener('load', onLoad);
            source.removeEventListener('abort', onAbort);
            source.removeEventListener('error', onError);
        };

        const onLoad = () =>
        {
            removeListeners();
            this.isLoaded = true;
            const instance = this._autoPlay();
            if (callback)
            {
                callback(null, this, instance);
            }
        };

        const onAbort = () =>
        {
            removeListeners();
            if (callback)
            {
                callback(new Error('Sound loading has been aborted'));
            }
        };

        const onError = () =>
        {
            removeListeners();
            const message = `Failed to load audio element (code: ${source.error.code})`;
            if (callback)
            {
                callback(new Error(message));
            }
            else
            {
                console.error(message);
            }
        };

        // Listen for callback
        source.addEventListener('canplaythrough', onLoad, false);
        source.addEventListener('load', onLoad, false);
        source.addEventListener('abort', onAbort, false);
        source.addEventListener('error', onError, false);

        // Begin the loading
        source.load();
    }
}
