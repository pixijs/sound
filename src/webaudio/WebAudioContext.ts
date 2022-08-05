import { EventEmitter } from '@pixi/utils';
import { Filterable } from '../Filterable';
import { IMediaContext } from '../interfaces';

/**
 * Main class to handle WebAudio API. There's a simple chain
 * of AudioNode elements: analyser > compressor > context.destination.
 * any filters that are added are inserted between the analyser and compressor nodes
 * @memberof webaudio
 */
class WebAudioContext extends Filterable implements IMediaContext
{
    /**
     * Context Compressor node
     * @readonly
     */
    public compressor: DynamicsCompressorNode;

    /**
     * Context Analyser node
     * @readonly
     */
    public analyser: AnalyserNode;

    /**
     * Global speed of all sounds
     * @readonly
     */
    public speed: number;

    /**
     * Sets the muted state.
     * @default false
     */
    public muted: boolean;

    /**
     * Sets the volume from 0 to 1.
     * @default 1
     */
    public volume: number;

    /**
     * Handle global events
     * @type {PIXI.utils.EventEmitter}
     */
    public events: EventEmitter;

    /** The instance of the AudioContext for WebAudio API. */
    private _ctx: AudioContext;

    /** The instance of the OfflineAudioContext for fast decoding audio. */
    private _offlineCtx: OfflineAudioContext;

    /** Current paused status */
    private _paused: boolean;

    /**
     * Indicated whether audio on iOS has been unlocked, which requires a touchend/mousedown event that plays an
     * empty sound.
     */
    private _unlocked: boolean;

    constructor()
    {
        const win: any = window as any;
        const ctx = new WebAudioContext.AudioContext();
        const compressor: DynamicsCompressorNode = ctx.createDynamicsCompressor();
        const analyser: AnalyserNode = ctx.createAnalyser();

        // setup the end of the node chain
        analyser.connect(compressor);
        compressor.connect(ctx.destination);

        super(analyser, compressor);

        this._ctx = ctx;
        // ios11 safari's webkitOfflineAudioContext allows only 44100 Hz sample rate
        //
        // For the sample rate value passed to OfflineAudioContext constructor,
        // all browsers are required to support a range of 8000 to 96000.
        // Reference:
        // https://www.w3.org/TR/webaudio/#dom-offlineaudiocontext-offlineaudiocontext-numberofchannels-length-samplerate
        this._offlineCtx = new WebAudioContext.OfflineAudioContext(1, 2,
            (win.OfflineAudioContext) ? Math.max(8000, Math.min(96000, ctx.sampleRate)) : 44100);
        this._unlocked = false;

        this.compressor = compressor;
        this.analyser = analyser;
        this.events = new EventEmitter();

        // Set the defaults
        this.volume = 1;
        this.speed = 1;
        this.muted = false;
        this.paused = false;

        // Listen for document level clicks to unlock WebAudio. See the _unlock method.
        if (ctx.state !== 'running')
        {
            this._unlock(); // When played inside of a touch event, this will enable audio on iOS immediately.
            this._unlock = this._unlock.bind(this);
            document.addEventListener('mousedown', this._unlock, true);
            document.addEventListener('touchstart', this._unlock, true);
            document.addEventListener('touchend', this._unlock, true);
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
     */
    private _unlock(): void
    {
        if (this._unlocked)
        {
            return;
        }
        this.playEmptySound();
        if (this._ctx.state === 'running')
        {
            document.removeEventListener('mousedown', this._unlock, true);
            document.removeEventListener('touchend', this._unlock, true);
            document.removeEventListener('touchstart', this._unlock, true);
            this._unlocked = true;
        }
    }

    /**
     * Plays an empty sound in the web audio context.  This is used to enable web audio on iOS devices, as they
     * require the first sound to be played inside of a user initiated event (touch/click).
     */
    public playEmptySound(): void
    {
        const source = this._ctx.createBufferSource();

        source.buffer = this._ctx.createBuffer(1, 1, 22050);
        source.connect(this._ctx.destination);
        source.start(0, 0, 0);
        if (source.context.state === 'suspended')
        {
            (source.context as AudioContext).resume();
        }
    }

    /**
     * Get AudioContext class, if not supported returns `null`
     * @type {AudioContext}
     * @readonly
     */
    public static get AudioContext(): typeof AudioContext
    {
        const win: any = window as any;

        return (
            win.AudioContext
            || win.webkitAudioContext
            || null
        );
    }

    /**
     * Get OfflineAudioContext class, if not supported returns `null`
     * @type {OfflineAudioContext}
     * @readonly
     */
    public static get OfflineAudioContext(): typeof OfflineAudioContext
    {
        const win: any = window as any;

        return (
            win.OfflineAudioContext
            || win.webkitOfflineAudioContext
            || null
        );
    }

    /** Destroy this context. */
    public destroy(): void
    {
        super.destroy();

        const ctx: any = this._ctx as any;
        // check if browser supports AudioContext.close()

        if (typeof ctx.close !== 'undefined')
        {
            ctx.close();
        }
        this.events.removeAllListeners();
        this.analyser.disconnect();
        this.compressor.disconnect();
        this.analyser = null;
        this.compressor = null;
        this.events = null;
        this._offlineCtx = null;
        this._ctx = null;
    }

    /**
     * The WebAudio API AudioContext object.
     * @readonly
     * @type {AudioContext}
     */
    public get audioContext(): AudioContext
    {
        return this._ctx;
    }

    /**
     * The WebAudio API OfflineAudioContext object.
     * @readonly
     * @type {OfflineAudioContext}
     */
    public get offlineContext(): OfflineAudioContext
    {
        return this._offlineCtx;
    }

    /**
     * Pauses all sounds, even though we handle this at the instance
     * level, we'll also pause the audioContext so that the
     * time used to compute progress isn't messed up.
     * @default false
     */
    public set paused(paused: boolean)
    {
        if (paused && this._ctx.state === 'running')
        {
            (this._ctx as any).suspend();
        }
        else if (!paused && this._ctx.state === 'suspended')
        {
            (this._ctx as any).resume();
        }
        this._paused = paused;
    }
    public get paused(): boolean
    {
        return this._paused;
    }

    /** Emit event when muted, volume or speed changes */
    public refresh(): void
    {
        this.events.emit('refresh');
    }

    /** Emit event when muted, volume or speed changes */
    public refreshPaused(): void
    {
        this.events.emit('refreshPaused');
    }

    /**
     * Toggles the muted state.
     * @return The current muted state.
     */
    public toggleMute(): boolean
    {
        this.muted = !this.muted;
        this.refresh();

        return this.muted;
    }

    /**
     * Toggles the paused state.
     * @return The current muted state.
     */
    public togglePause(): boolean
    {
        this.paused = !this.paused;
        this.refreshPaused();

        return this._paused;
    }

    /**
     * Decode the audio data
     * @param arrayBuffer - Buffer from loader
     * @param callback - When completed, error and audioBuffer are parameters.
     */
    public decode(arrayBuffer: ArrayBuffer, callback: (err?: Error, buffer?: AudioBuffer) => void): void
    {
        const handleError = (err: Error) =>
        {
            callback(new Error(err?.message || 'Unable to decode file'));
        };
        const result = this._offlineCtx.decodeAudioData(
            arrayBuffer, (buffer: AudioBuffer) =>
            {
                callback(null, buffer);
            },
            handleError,
        );
        // Reference: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
        // decodeAudioData return value: Void, or a Promise object that fulfills with the decodedData.

        if (result)
        {
            result.catch(handleError);
        }
    }
}

export { WebAudioContext };
