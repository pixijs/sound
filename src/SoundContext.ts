import webAudioIOS = require("web-audio-ios");

/**
 * @description Main class to handle webkit audio.
 *
 * @class SoundContext
 * @memberof PIXI.sound
 */
export default class SoundContext
{
    /**
     * The instance of the AudioContext for WebAudio API.
     * @name PIXI.sound.SoundContext#_ctx
     * @type {AudioContext}
     * @private
     */
    private _ctx: AudioContext;

    /**
     * The instance of the OfflineAudioContext for fast decoding audio.
     * @name PIXI.sound.SoundContext#_offlineCtx
     * @type {OfflineAudioContext}
     * @private
     */
    private _offlineCtx: OfflineAudioContext;

    /**
     * Handle the volume.
     * @name PIXI.sound.SoundContext#_gainNode
     * @type {GainNode}
     * @private
     */
    private _gainNode: GainNode;

    /**
     * Context Compressor node
     * @name PIXI.sound.SoundContext#_compressor
     * @type {DynamicsCompressorNode}
     * @private
     */
    private _compressor: DynamicsCompressorNode;

    /**
     * Current muted status of the context
     * @name PIXI.sound.SoundContext#_muted
     * @type {Boolean}
     * @private
     * @default false
     */
    private _muted: boolean;

    /**
     * Current volume from 0 to 1
     * @name PIXI.sound.SoundContext#_volume
     * @type {Number}
     * @private
     * @default 1
     */
    private _volume: number;

    /**
     * Current paused status
     * @name PIXI.sound.SoundContext#_paused
     * @type {Boolean}
     * @private
     * @default false
     */
    private _paused: boolean;

    constructor()
    {
        this._ctx = new SoundContext.AudioContext();
        this._offlineCtx = new SoundContext.OfflineAudioContext(1, 2, this._ctx.sampleRate);

        // setup the end of the node chain
        this._gainNode = this._ctx.createGain();
        this._compressor = this._ctx.createDynamicsCompressor();
        this._gainNode.connect(this._compressor);
        this._compressor.connect(this._ctx.destination);

        // Set the defaults
        this.volume = 1;
        this.muted = false;
        this.paused = false;

        // Unlock WebAudio on iOS
        webAudioIOS(window, this._ctx, () => {
            // do nothing
        });
    }

    /**
     * Get AudioContext class, if not supported returns `null`
     * @name PIXI.sound.SoundContext.AudioContext
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
     * @name PIXI.sound.SoundContext.OfflineAudioContext
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
     * @method PIXI.sound.SoundContext#destroy
     */
    public destroy()
    {
        const ctx: any = this._ctx as any;
        // check if browser supports AudioContext.close()
        if (typeof ctx.close !== "undefined")
        {
            ctx.close();
        }
        this._gainNode.disconnect();
        this._compressor.disconnect();
        this._offlineCtx = null;
        this._ctx = null;
        this._gainNode = null;
        this._compressor = null;
    }

    /**
     * The WebAudio API AudioContext object.
     * @name PIXI.sound.SoundContext#audioContext
     * @type {AudioContext}
     * @readOnly
     */
    public get audioContext(): AudioContext
    {
        return this._ctx;
    }

    /**
     * The WebAudio API OfflineAudioContext object.
     * @name PIXI.sound.SoundContext#offlineContext
     * @type {OfflineAudioContext}
     * @readOnly
     */
    public get offlineContext(): OfflineAudioContext
    {
        return this._offlineCtx;
    }

    /**
     * Sets the muted state.
     * @type {Boolean}
     * @name PIXI.sound.SoundContext#muted
     * @default false
     */
    public get muted(): boolean
    {
        return this._muted;
    }
    public set muted(muted: boolean)
    {
        this._muted = !!muted;
        this._gainNode.gain.value = this._muted ? 0 : this._volume;
    }

    /**
     * Sets the volume from 0 to 1.
     * @type {Number}
     * @name PIXI.sound.SoundContext#volume
     * @default 1
     */
    public set volume(volume: number)
    {
        // update volume
        this._volume = volume;

        // update actual volume IIF not muted
        if (!this._muted)
        {
            this._gainNode.gain.value = this._volume;
        }
    }
    public get volume(): number
    {
        return this._volume;
    }

    /**
     * Pauses all sounds.
     * @type {Boolean}
     * @name PIXI.sound.SoundContext#paused
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
     * Returns the entry node in the master node chains.
     * @name PIXI.sound.SoundContext#destination
     * @type {AudioNode}
     */
    public get destination(): AudioNode
    {
        return this._gainNode;
    }

    /**
     * Toggles the muted state.
     * @method PIXI.sound.SoundContext#toggleMute
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
