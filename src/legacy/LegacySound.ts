import {Options, SoundSprites, LoadedCallback, CompleteCallback, PlayOptions} from '../base/BaseSound';
import {SoundSpriteData} from "../base/SoundSprite";
import SoundSprite from "../base/SoundSprite";
import BaseSound from '../base/BaseSound';

export default class LegacySound extends BaseSound
{
    private _source: HTMLAudioElement;

    constructor(source: string|Options|HTMLAudioElement)
    {
        super(source);
        const options = this._options;
        this._source = options.srcBuffer as HTMLAudioElement || new Audio();
        this.speed = options.speed;

        // Make sure it has a source
        if (this.src)
        {
            this._source.src = this.src;
        }
        this._init();
    }

    // override isplayable getter
    public get isPlayable(): boolean
    {
        return this.isLoaded && !!this._source && this._source.readyState === 4;
    }

    // Override volume setter
    protected _changeVolume(volume:number):void
    {
        this._source.volume = volume;
    }

    // Override loop setter
    protected _changeLoop(loop:boolean):void
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
        super.destroy();

        if (this._source)
        {
            this._source.pause();
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
    protected _beginPreload(callback?: LoadedCallback): void
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
        if (!this.src)
        {
            return callback(new Error("sound.src or sound.srcBuffer must be set"));
        }

        // Set the source
        source.src = this.src;

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
