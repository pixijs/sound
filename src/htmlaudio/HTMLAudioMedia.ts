import { EventEmitter } from "@pixi/utils";
import { Filter } from "../filters/Filter";
import { IMedia } from "../interfaces/IMedia";
import { CompleteCallback, LoadedCallback, Options, PlayOptions, Sound } from "../Sound";
import { SoundSpriteData, SoundSprites } from "../sprites";
import { HTMLAudioContext } from "./HTMLAudioContext";
import { HTMLAudioInstance } from "./HTMLAudioInstance";

/**
 * The fallback version of Sound which uses `<audio>` instead of WebAudio API.
 * @private
 * @class HTMLAudioMedia
 * @memberof PIXI.sound.htmlaudio
 * @param {HTMLAudioElement|String|Object} options Either the path or url to the source file.
 *        or the object of options to use. See {@link PIXI.sound.Sound.from}
 */
export class HTMLAudioMedia extends EventEmitter implements IMedia
{
    public parent: Sound;
    private _source: HTMLAudioElement;

    public init(parent: Sound): void
    {
        this.parent = parent;
        this._source = parent.options.source as HTMLAudioElement || new Audio();
        if (parent.url)
        {
            this._source.src = parent.url;
        }
    }

    // Implement create
    public create(): HTMLAudioInstance
    {
        return new HTMLAudioInstance(this);
    }

    // Implement isPlayable
    public get isPlayable(): boolean
    {
        return !!this._source && this._source.readyState === 4;
    }

    // Implement duration
    public get duration(): number
    {
        return this._source.duration;
    }

    // Implement context
    public get context(): HTMLAudioContext
    {
        return this.parent.context as HTMLAudioContext;
    }

    // Implement filters
    public get filters(): Filter[]
    {
        return null;
    }
    public set filters(filters: Filter[])
    {
        console.warn("HTML Audio does not support filters");
    }

    // Override the destroy
    public destroy(): void
    {
        this.removeAllListeners();

        this.parent = null;

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
        const sound = this.parent;

        // See if the source is already loaded
        if (source.readyState === 4)
        {
            sound.isLoaded = true;
            const instance = sound.autoPlayStart();
            if (callback)
            {
                setTimeout(() =>
                {
                    callback(null, sound, instance);
                }, 0);
            }
            return;
        }

        // If there's no source, we cannot load
        if (!sound.url)
        {
            return callback(new Error("sound.url or sound.source must be set"));
        }

        // Set the source
        source.src = sound.url;

        // Remove all event listeners
        const removeListeners = () =>
        {
            // Listen for callback
            source.removeEventListener("canplaythrough", onLoad);
            source.removeEventListener("load", onLoad);
            source.removeEventListener("abort", onAbort);
            source.removeEventListener("error", onError);
        };

        const onLoad = () =>
        {
            removeListeners();
            sound.isLoaded = true;
            const instance = sound.autoPlayStart();
            if (callback)
            {
                callback(null, sound, instance);
            }
        };

        const onAbort = () =>
        {
            removeListeners();
            if (callback)
            {
                callback(new Error("Sound loading has been aborted"));
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
        source.addEventListener("canplaythrough", onLoad, false);
        source.addEventListener("load", onLoad, false);
        source.addEventListener("abort", onAbort, false);
        source.addEventListener("error", onError, false);

        // Begin the loading
        source.load();
    }
}
