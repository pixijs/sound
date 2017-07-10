import {IMediaContext} from "../interfaces/IMediaContext";
import Filter from "../filters/Filter";

/**
 * The fallback version of WebAudioContext which uses `<audio>` instead of WebAudio API.
 * @class HTMLAudioContext
 * @extends PIXI.util.EventEmitter
 * @memberof PIXI.sound.htmlaudio
 */
export default class HTMLAudioContext extends PIXI.utils.EventEmitter implements IMediaContext
{
    /**
     * Current muted status of the context
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#_muted
     * @type {Boolean}
     * @private
     * @default false
     */
    private _muted: boolean;

    /**
     * Current volume from 0 to 1
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#_volume
     * @type {Number}
     * @private
     * @default 1
     */
    private _volume: number;

    /**
     * Current paused status
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#_paused
     * @type {Boolean}
     * @private
     * @default false
     */
    private _paused: boolean;

    constructor()
    {
        super();

        this._volume = 1;
        this._muted = false;
        this._paused = false;
    }

    /**
     * Pauses all sounds.
     * @type {Boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#paused
     * @default false
     */
    public set paused(paused: boolean)
    {
        const oldPaused = this._paused;

        this._paused = paused;
        if (paused !== oldPaused)
        {
            /**
             * Fired when paused state changes
             * @event PIXI.sound.htmlaudio.HTMLAudioContext#paused
             * @param {Boolean} paused - Paused state of context
             * @private
             */
            this.emit('paused', paused);
        }
    }
    public get paused(): boolean
    {
        return this._paused;
    }

    /**
     * Sets the muted state.
     * @type {Boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#muted
     * @default false
     */
    public set muted(muted: boolean)
    {
        const oldMuted = this._muted;

        this._muted = muted;
        if (muted !== oldMuted)
        {
            /**
             * Fired when muted state changes
             * @event PIXI.sound.htmlaudio.HTMLAudioContext#muted
             * @param {Boolean} muted - Muted state of context
             * @private
             */
            this.emit('muted', muted);
        }
    }
    public get muted(): boolean
    {
        return this._muted;
    }

    /**
     * Sets the volume from 0 to 1.
     * @type {Number}
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#volume
     * @default 1
     */
    public set volume(volume: number)
    {
        const oldVolume = this._volume;
        
        this._volume = volume;
        if (volume !== oldVolume)
        {
            /**
             * Fired when volume changes
             * @event PIXI.sound.htmlaudio.HTMLAudioContext#volume
             * @param {Boolean} volume - Current context volume
             * @private
             */
            this.emit('volume', volume);
        }
    }
    public get volume(): number
    {
        return this._volume;
    }

    /**
     * HTML Audio does not support filters, this is non-functional API.
     * @type {Array<PIXI.sound.filters.Filter>}
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#filters
     * @default null
     */
    public get filters(): Filter[]
    {
        // @if DEBUG
        console.warn('HTML Audio does not support filters');
        // @endif
        return null;
    }
    public set filters(filters: Filter[])
    {
        // @if DEBUG
        console.warn('HTML Audio does not support filters');
        // @endif
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
        // @if DEBUG
        console.warn('HTML Audio does not support audioContext');
        // @endif
        return null;
    }

    /**
     * Toggles the muted state.
     * @method PIXI.sound.htmlaudio.HTMLAudioContext#toggleMute
     * @return {Boolean} The current muted state.
     */
    public toggleMute(): boolean
    {
        this.muted = !this.muted;
        return this._muted;
    }

    /**
     * Toggles the paused state.
     * @method PIXI.sound.htmlaudio.HTMLAudioContext#togglePause
     * @return {Boolean} The current paused state.
     */
    public togglePause(): boolean
    {
        this.paused = !this.paused;
        return this._paused;
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