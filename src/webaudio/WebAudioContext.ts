import Filterable from "../Filterable";
import { IMediaContext } from "../interfaces/IMediaContext";

/**
 * @description Main class to handle WebAudio API. There's a simple chain
 * of AudioNode elements: analyser > gainNode > compressor > context.destination.
 * any filters that are added are inserted between the analyser and gainNode nodes
 * @class WebAudioContext
 * @extends PIXI.sound.Filterable
 * @memberof PIXI.sound.webaudio
 */
export default class WebAudioContext extends Filterable implements IMediaContext
{
    /**
     * Handle the volume.
     * @name PIXI.sound.webaudio.WebAudioContext#gain
     * @type {GainNode}
     * @readonly
     */
    public gain: GainNode;

    /**
     * Context Compressor node
     * @name PIXI.sound.webaudio.WebAudioContext#compressor
     * @type {DynamicsCompressorNode}
     * @readonly
     */
    public compressor: DynamicsCompressorNode;

    /**
     * Context Analyser node
     * @name PIXI.sound.webaudio.WebAudioContext#analyser
     * @type {AnalyserNode}
     * @readonly
     */
    public analyser: AnalyserNode;

    /**
     * The instance of the AudioContext for WebAudio API.
     * @name PIXI.sound.webaudio.WebAudioContext#_ctx
     * @type {AudioContext}
     * @private
     */
    private _ctx: AudioContext;

    /**
     * The instance of the OfflineAudioContext for fast decoding audio.
     * @name PIXI.sound.webaudio.WebAudioContext#_offlineCtx
     * @type {OfflineAudioContext}
     * @private
     */
    private _offlineCtx: OfflineAudioContext;

    /**
     * Current muted status of the context
     * @name PIXI.sound.webaudio.WebAudioContext#_muted
     * @type {Boolean}
     * @private
     * @default false
     */
    private _muted: boolean;

    /**
     * Current volume from 0 to 1
     * @name PIXI.sound.webaudio.WebAudioContext#_volume
     * @type {Number}
     * @private
     * @default 1
     */
    private _volume: number;

    /**
     * Current paused status
     * @name PIXI.sound.webaudio.WebAudioContext#_paused
     * @type {Boolean}
     * @private
     * @default false
     */
    private _paused: boolean;

    /**
     * Indicated whether audio on iOS has been unlocked, which requires a touchend/mousedown event that plays an
     * empty sound.
     * @name PIXI.sound.webaudio.WebAudioContext#_unlocked
     * @type {boolean}
     * @private
     */
    private _unlocked: boolean;

    constructor()
    {
        const ctx = new WebAudioContext.AudioContext();
        const gain: GainNode = ctx.createGain();
        const compressor: DynamicsCompressorNode = ctx.createDynamicsCompressor();
        const analyser: AnalyserNode = ctx.createAnalyser();

        // setup the end of the node chain
        analyser.connect(gain);
        gain.connect(compressor);
        compressor.connect(ctx.destination);

        super(analyser, gain);

        this._ctx = ctx;
        this._offlineCtx = new WebAudioContext.OfflineAudioContext(1, 2, ctx.sampleRate);
        this._unlocked = false;

        this.gain = gain;
        this.compressor = compressor;
        this.analyser = analyser;

        // Set the defaults
        this.volume = 1;
        this.muted = false;
        this.paused = false;

        // Listen for document level clicks to unlock WebAudio on iOS. See the _unlock method.
        if ("ontouchstart" in window && ctx.state !== "running")
        {
            this._unlock(); // When played inside of a touch event, this will enable audio on iOS immediately.
            this._unlock = this._unlock.bind(this);
            document.addEventListener("mousedown", this._unlock, true);
            document.addEventListener("touchstart", this._unlock, true);
            document.addEventListener("touchend", this._unlock, true);
        }
    }

    /**
     * Try to unlock audio on iOS. This is triggered from either WebAudio plugin setup (which will work if inside of
     * a `mousedown` or `touchend` event stack), or the first document touchend/mousedown event. If it fails (touchend
     * will fail if the user presses for too long, indicating a scroll event instead of a click event.
     *
     * Note that earlier versions of iOS supported `touchstart` for this, but iOS9 removed this functionality. Adding
     * a `touchstart` event to support older platforms may preclude a `mousedown` even from getting fired on iOS9, so we
     * stick with `mousedown` and `touchend`.
     * @method PIXI.sound.webaudio.WebAudioContext#_unlock
     * @private
     */
    private _unlock(): void
    {
        if (this._unlocked)
        {
            return;
        }
        this.playEmptySound();
        if (this._ctx.state === "running")
        {
            document.removeEventListener("mousedown", this._unlock, true);
            document.removeEventListener("touchend", this._unlock, true);
            document.removeEventListener("touchstart", this._unlock, true);
            this._unlocked = true;
        }
    }

    /**
     * Plays an empty sound in the web audio context.  This is used to enable web audio on iOS devices, as they
     * require the first sound to be played inside of a user initiated event (touch/click).
     * @method PIXI.sound.webaudio.WebAudioContext#playEmptySound
     */
    public playEmptySound(): void
    {
        const source = this._ctx.createBufferSource();
        source.buffer = this._ctx.createBuffer(1, 1, 22050);
        source.connect(this._ctx.destination);
        source.start(0, 0, 0);
    }

    /**
     * Get AudioContext class, if not supported returns `null`
     * @name PIXI.sound.webaudio.WebAudioContext.AudioContext
     * @type {Function}
     * @static
     */
    public static get AudioContext(): typeof AudioContext
    {
        const win: any = window as any;
        return (
            win.AudioContext ||
            win.webkitAudioContext ||
            null
        );
    }

    /**
     * Get OfflineAudioContext class, if not supported returns `null`
     * @name PIXI.sound.webaudio.WebAudioContext.OfflineAudioContext
     * @type {Function}
     * @static
     */
    public static get OfflineAudioContext(): typeof OfflineAudioContext
    {
        const win: any = window as any;
        return (
            win.OfflineAudioContext ||
            win.webkitOfflineAudioContext ||
            null
        );
    }

    /**
     * Destroy this context.
     * @method PIXI.sound.webaudio.WebAudioContext#destroy
     */
    public destroy()
    {
        super.destroy();

        const ctx: any = this._ctx as any;
        // check if browser supports AudioContext.close()
        if (typeof ctx.close !== "undefined")
        {
            ctx.close();
        }
        this.analyser.disconnect();
        this.gain.disconnect();
        this.compressor.disconnect();
        this.gain = null;
        this.analyser = null;
        this.compressor = null;
        this._offlineCtx = null;
        this._ctx = null;
    }

    /**
     * The WebAudio API AudioContext object.
     * @name PIXI.sound.webaudio.WebAudioContext#audioContext
     * @type {AudioContext}
     * @readonly
     */
    public get audioContext(): AudioContext
    {
        return this._ctx;
    }

    /**
     * The WebAudio API OfflineAudioContext object.
     * @name PIXI.sound.webaudio.WebAudioContext#offlineContext
     * @type {OfflineAudioContext}
     * @readonly
     */
    public get offlineContext(): OfflineAudioContext
    {
        return this._offlineCtx;
    }

    /**
     * Sets the muted state.
     * @type {Boolean}
     * @name PIXI.sound.webaudio.WebAudioContext#muted
     * @default false
     */
    public get muted(): boolean
    {
        return this._muted;
    }
    public set muted(muted: boolean)
    {
        this._muted = !!muted;
        this.gain.gain.value = this._muted ? 0 : this._volume;
    }

    /**
     * Sets the volume from 0 to 1.
     * @type {Number}
     * @name PIXI.sound.webaudio.WebAudioContext#volume
     * @default 1
     */
    public set volume(volume: number)
    {
        // update volume
        this._volume = volume;

        // update actual volume IIF not muted
        if (!this._muted)
        {
            this.gain.gain.value = this._volume;
        }
    }
    public get volume(): number
    {
        return this._volume;
    }

    /**
     * Pauses all sounds.
     * @type {Boolean}
     * @name PIXI.sound.webaudio.WebAudioContext#paused
     * @default false
     */
    public set paused(paused: boolean)
    {
        if (paused && this._ctx.state === "running")
        {
            (this._ctx as any).suspend();
        }
        else if (!paused && this._ctx.state === "suspended")
        {
            (this._ctx as any).resume();
        }
        this._paused = paused;
    }
    public get paused(): boolean
    {
        return this._paused;
    }

    /**
     * Toggles the muted state.
     * @method PIXI.sound.webaudio.WebAudioContext#toggleMute
     * @return {Boolean} The current muted state.
     */
    public toggleMute(): boolean
    {
        this.muted = !this.muted;
        return this._muted;
    }

    /**
     * Decode the audio data
     * @method decode
     * @param {ArrayBuffer} arrayBuffer Buffer from loader
     * @param {Function} callback When completed, error and audioBuffer are parameters.
     */
    public decode(arrayBuffer: ArrayBuffer, callback: (err?: Error, buffer?: AudioBuffer) => void): void
    {
        this._offlineCtx.decodeAudioData(
            arrayBuffer, (buffer: AudioBuffer) => {
                callback(null, buffer);
            },
            () => {
                callback(new Error("Unable to decode file"));
            },
        );
    }
}
