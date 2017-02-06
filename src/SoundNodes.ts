import SoundContext from './SoundContext';

/**
 * @class SoundNodes
 * @private
 * @memberof PIXI.sound
 * @param {SoundContext} audioContext The audio context.
 */
export default class SoundNodes
{
    private _destination:AudioNode;
    private _bufferSource:AudioBufferSourceNode;
    private _gainNode:GainNode;
    private _analyser:AnalyserNode
    private _panner:StereoPannerNode;

    constructor(private _context:SoundContext)
    {
        const audioContext:AudioContext = this._context.audioContext;

        const bufferSource:AudioBufferSourceNode = audioContext.createBufferSource();
        const gainNode:GainNode = audioContext.createGain();
        const analyser:AnalyserNode = audioContext.createAnalyser();
        const panner:StereoPannerNode = audioContext.createStereoPanner();

        gainNode.connect(this._context.destination);
        analyser.connect(gainNode);
        panner.connect(analyser);
        bufferSource.connect(panner);

        this._bufferSource = bufferSource;
        this._gainNode = gainNode;
        this._analyser = analyser;
        this._panner = panner;
        this._destination = panner; // needed for .cloneBufferSource()
    }

    /**
     * Cleans up.
     * @method PIXI.sound.SoundNodes#destroy
     */
    public destroy():void
    {
        this._bufferSource.disconnect();
        this._gainNode.disconnect();
        this._analyser.disconnect();
        this._panner.disconnect();

        this._bufferSource = null;
        this._gainNode = null;
        this._analyser = null;
        this._panner = null;

        this._context = null;
    }

    /**
     * Get the analyser node
     * @name PIXI.sound.SoundNodes#analyser
     * @type {AnalyserNode}
     * @readOnly
     */
    public get analyser():AnalyserNode
    {
        return this._analyser;
    }

    /**
     * Get the gain node
     * @name PIXI.sound.SoundNodes#gainNode
     * @type {GainNode}
     * @readOnly
     */
    public get gainNode():GainNode
    {
        return this._gainNode;
    }

    /**
     * Get the panner node
     * @name PIXI.sound.SoundNodes#panner
     * @type {StereoPannerNode}
     * @readOnly
     */
    public get panner():StereoPannerNode
    {
        return this._panner;
    }

    /**
     * Get the buffer source node
     * @name PIXI.sound.SoundNodes#bufferSource
     * @type {AudioBufferSourceNode}
     * @readOnly
     */
    public get bufferSource():AudioBufferSourceNode
    {
        return this._bufferSource;
    }

    /**
     * Clones the bufferSource. Used just before playing a sound.
     * @method PIXI.sound.SoundNodes#cloneBufferSource
     * @returns {AudioBufferSourceNode} The clone AudioBufferSourceNode.
     */
    public cloneBufferSource():AudioBufferSourceNode
    {
        const orig:AudioBufferSourceNode = this._bufferSource;
        const clone:AudioBufferSourceNode = this._context.audioContext.createBufferSource();
        clone.buffer = orig.buffer;
        clone.playbackRate.value = orig.playbackRate.value;
        clone.loop = orig.loop;
        clone.connect(this._destination);
        return clone;
    }
}
