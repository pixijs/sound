import { utils } from '@pixi/core';
import { Filterable } from '../Filterable';
import { IMediaContext } from '../interfaces';

/** A suspend() or resume() rejects when the context is closed or interrupted before it settles */
const ignore = (): void => { /* nothing to do */ };

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
    public events: utils.EventEmitter;

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
    private _locked: boolean;

    /** The paused state saved by a window blur, or undefined when no blur is waiting for its focus */
    private _pausedOnBlur: boolean;

    /** Set to false ignore suspending when window is blurred */
    public autoPause = true;

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

        this.compressor = compressor;
        this.analyser = analyser;
        this.events = new utils.EventEmitter();

        // Set the defaults
        this.volume = 1;
        this.speed = 1;
        this.muted = false;
        this.paused = false;

        this._locked = ctx.state === 'suspended' && ('ontouchstart' in globalThis || 'onclick' in globalThis);

        this._unlock = this._unlock.bind(this);
        this._checkUnlocked = this._checkUnlocked.bind(this);
        // Listen for document level clicks to unlock WebAudio. See the _unlock method.
        if (this._locked)
        {
            // The context can also start without one of these: the app resumes it, or a sound starts in a key press
            ctx.addEventListener('statechange', this._checkUnlocked);
            document.addEventListener('mousedown', this._unlock, true);
            document.addEventListener('touchstart', this._unlock, true);
            document.addEventListener('touchend', this._unlock, true);
            this._unlock(); // When played inside of a touch event, this will enable audio on iOS immediately.
        }

        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
        globalThis.addEventListener('focus', this.onFocus);
        globalThis.addEventListener('blur', this.onBlur);
    }

    /** Handle mobile WebAudio context resume */
    private onFocus(): void
    {
        if (!this.autoPause)
        {
            return;
        }
        const paused = this._pausedOnBlur;

        if (paused === undefined)
        {
            // No blur to undo. Safari can still have stopped the context (it uses the non-standard
            // "interrupted" state when the screen is locked or the user switches to another app)
            if (!this._paused)
            {
                this._resume();
            }

            return;
        }
        this._pausedOnBlur = undefined;
        this.paused = paused;
        this.refreshPaused();
    }

    /** Handle mobile WebAudio context suspend */
    private onBlur(): void
    {
        if (!this.autoPause)
        {
            return;
        }
        if (!this._locked && this._pausedOnBlur === undefined)
        {
            this._pausedOnBlur = this._paused;
            this.paused = true;
            this.refreshPaused();
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
        if (!this._locked)
        {
            return;
        }
        this.playEmptySound();
        this._checkUnlocked();
    }

    /**
     * Clear the lock once the context is running, whatever started it. Firefox and Safari only
     * update the state when resume() settles, so this also runs on `statechange` and after each resume().
     */
    private _checkUnlocked(): void
    {
        if (this._locked && this._ctx.state === 'running')
        {
            this._locked = false;
            this._removeUnlockListeners();
        }
    }

    /** Stop listening for the events that can unlock the context. */
    private _removeUnlockListeners(): void
    {
        this._ctx.removeEventListener('statechange', this._checkUnlocked);
        document.removeEventListener('mousedown', this._unlock, true);
        document.removeEventListener('touchend', this._unlock, true);
        document.removeEventListener('touchstart', this._unlock, true);
    }

    /** Resume the context, then suspend it again if that settles while paused. */
    private _resume(): void
    {
        const ctx = this._ctx;

        ctx.resume()?.then(() =>
        {
            if (this._ctx !== ctx)
            {
                return;
            }
            this._checkUnlocked();
            // An unlock gesture resumes the context even while paused, and
            // older Chromium ignores a suspend() made while a resume() is in flight
            if (this._paused && ctx.state === 'running')
            {
                ctx.suspend()?.catch(ignore);
            }
        }).catch(ignore);
    }

    /**
     * Plays an empty sound in the web audio context.  This is used to enable web audio on iOS devices, as they
     * require the first sound to be played inside of a user initiated event (touch/click).
     * If the context is paused, it's suspended again as soon as it has started.
     */
    public playEmptySound(): void
    {
        const source = this._ctx.createBufferSource();

        source.buffer = this._ctx.createBuffer(1, 1, 22050);
        source.connect(this._ctx.destination);
        source.start(0, 0, 0);
        if (source.context.state === 'suspended')
        {
            this._resume();
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
        this._removeUnlockListeners();
        globalThis.removeEventListener('focus', this.onFocus);
        globalThis.removeEventListener('blur', this.onBlur);
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
     * The audioContext follows the last value set, including when
     * it's changed more than once in the same tick.
     * @default false
     */
    public set paused(paused: boolean)
    {
        this._paused = paused;
        const ctx = this._ctx;

        if (ctx.state === 'closed')
        {
            return;
        }
        // The state can still show the old value while an earlier suspend() or resume() is in
        // flight (Firefox, Safari), so always ask for the state we want instead of checking it first
        if (paused)
        {
            ctx.suspend()?.catch(ignore);
        }
        else
        {
            this._resume();
        }
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
     * @param callback - Called once when decoding finishes, with the browser's error or the decoded buffer.
     */
    public decode(arrayBuffer: ArrayBuffer, callback: (err?: Error, buffer?: AudioBuffer) => void): void
    {
        // A failed decode rejects the promise and also calls the error callback, and some
        // errors only reject the promise, so listen to both and report the first outcome only
        let settled = false;
        const finish = (err: Error, buffer?: AudioBuffer) =>
        {
            if (settled)
            {
                return;
            }
            settled = true;
            callback(err, buffer);
        };
        const handleError = (err: Error) =>
        {
            // Old engines call back with no error at all
            finish(err?.message ? err : new Error('Unable to decode file'));
        };
        const result = this._offlineCtx.decodeAudioData(
            arrayBuffer, (buffer: AudioBuffer) =>
            {
                finish(null, buffer);
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
