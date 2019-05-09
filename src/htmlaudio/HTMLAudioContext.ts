import { EventEmitter } from "@pixi/utils";
import { Filter } from "../filters/Filter";
import { IMediaContext } from "../interfaces/IMediaContext";

/**
 * The fallback version of WebAudioContext which uses `<audio>` instead of WebAudio API.
 * @private
 * @class HTMLAudioContext
 * @extends PIXI.util.EventEmitter
 * @memberof PIXI.sound.htmlaudio
 */
export class HTMLAudioContext extends EventEmitter implements IMediaContext
{
    /**
     * Current global speed from 0 to 1
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#speed
     * @type {number}
     * @default 1
     */
    public speed: number;

    /**
     * Current muted status of the context
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#muted
     * @type {boolean}
     * @default false
     */
    public muted: boolean;

    /**
     * Current volume from 0 to 1
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#volume
     * @type {number}
     * @default 1
     */
    public volume: number;

    /**
     * Current paused status
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#paused
     * @type {boolean}
     * @default false
     */
    public paused: boolean;

    constructor()
    {
        super();

        this.speed = 1;
        this.volume = 1;
        this.muted = false;
        this.paused = false;
    }

    /**
     * Internal trigger when volume, mute or speed changes
     * @method PIXI.sound.htmlaudio.HTMLAudioContext#refresh
     * @private
     */
    public refresh(): void
    {
        this.emit("refresh");
    }

    /**
     * Internal trigger paused changes
     * @method PIXI.sound.htmlaudio.HTMLAudioContext#refreshPaused
     * @private
     */
    public refreshPaused(): void
    {
        this.emit("refreshPaused");
    }

    /**
     * HTML Audio does not support filters, this is non-functional API.
     * @type {Array<PIXI.sound.filters.Filter>}
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#filters
     * @default null
     */
    public get filters(): Filter[]
    {
        console.warn("HTML Audio does not support filters");
        return null;
    }
    public set filters(filters: Filter[])
    {
        console.warn("HTML Audio does not support filters");
    }

    /**
     * HTML Audio does not support `audioContext`
     * @type {null}
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#audioContext
     * @default null
     * @readonly
     */
    public get audioContext(): AudioContext
    {
        console.warn("HTML Audio does not support audioContext");
        return null;
    }

    /**
     * Toggles the muted state.
     * @method PIXI.sound.htmlaudio.HTMLAudioContext#toggleMute
     * @return {boolean} The current muted state.
     */
    public toggleMute(): boolean
    {
        this.muted = !this.muted;
        this.refresh();
        return this.muted;
    }

    /**
     * Toggles the paused state.
     * @method PIXI.sound.htmlaudio.HTMLAudioContext#togglePause
     * @return {boolean} The current paused state.
     */
    public togglePause(): boolean
    {
        this.paused = !this.paused;
        this.refreshPaused();
        return this.paused;
    }

    /**
     * Destroy and don't use after this
     * @method PIXI.sound.htmlaudio.HTMLAudioContext#destroy
     */
    public destroy(): void
    {
        this.removeAllListeners();
    }
}
