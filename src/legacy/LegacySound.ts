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
        this._source = this._options.srcBuffer as HTMLAudioElement || document.createElement('audio');
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
            return callback(null, this, this._autoPlay());
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
            source.removeEventListener('load', onLoad);
            source.removeEventListener('abort', onAbort);
            source.removeEventListener('error', onError);
        };

        const onLoad = () =>
        {
            removeListeners();
            this.isLoaded = true;
            callback(null, this, this._autoPlay());
        };

        const onAbort = () =>
        {
            removeListeners();
            callback(new Error('Sound loading has been aborted'));
        };

        const onError = () =>
        {
            removeListeners();
            callback(new Error('Sound loading error has occured'));
        };

        // Listen for callback
        source.addEventListener('load', onLoad);
        source.addEventListener('abort', onAbort);
        source.addEventListener('error', onError);

        // Begin the loading
        source.load();
    }
}
