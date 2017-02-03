/**
 * @description Main class to handle webkit audio.
 *
 * @class SoundContext
 * @memberof PIXI.sound
 */
export default class SoundContext
{
    private _ctx:AudioContext;
    private _gainNode:GainNode;
    private _compressor:DynamicsCompressorNode;
    private _muted:boolean;
    private _volume:number;
    private _paused:boolean;

    constructor()
    {
        /**
         * The instance of the AudioContext for WebAudio API.
         * @private
         * @property {AudioContext} _ctx
         */
        this._ctx = new AudioContext();

        // setup the end of the node chain
        this._gainNode = this._ctx.createGain();
        this._compressor = this._ctx.createDynamicsCompressor();
        this._gainNode.connect(this._compressor);
        this._compressor.connect(this._ctx.destination);

        // Set the defaults
        this.volume = 1;
        this.muted = false;
        this.paused = false;
    }

    destroy()
    {
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
    get audioContext():AudioContext
    {
        return this._ctx;
    }

    /**
     * Sets the muted state.
     * @type {Boolean}
     * @name PIXI.sound.SoundContext#muted
     * @default false
     */
    get muted():boolean
    {
        return this._muted;
    }
    set muted(muted:boolean)
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
    set volume(volume:number)
    {
        // update volume
        this._volume = volume;

        // update actual volume IIF not muted
        if (!this._muted)
        {
            this._gainNode.gain.value = this._volume;
        }
    }
    get volume():number
    {
        return this._volume;
    }

    /**
     * Pauses all sounds.
     * @type {Boolean}
     * @name PIXI.sound.SoundContext#paused
     * @default false
     */
    set paused(paused:boolean)
    {
        if (paused && this._ctx.state === 'running')
        {
            (<any>this._ctx).suspend();
        }
        else if (!paused && this._ctx.state === 'suspended')
        {
            (<any>this._ctx).resume();
        }
        this._paused = paused;
    }
    get paused():boolean
    {
        return this._paused;
    }

    /**
     * Returns the entry node in the master node chains.
     * @private
     */
    _entryNode():GainNode
    {
        //return this._ctx.destination;
        return this._gainNode;
    }

    /**
     * Toggles the muted state.
     * @method PIXI.sound.SoundContext#toggleMute
     * @return {Boolean} The current muted state.
     */
    toggleMute():boolean
    {
        this.muted = !this.muted;
        return this._muted;
    }
}
