import Filterable from "./Filterable";
import Filter from "./filters/Filter";
import SoundContext from "./SoundContext";

/**
 * @class SoundNodes
 * @extends PIXI.sound.Filterable
 * @private
 * @memberof PIXI.sound
 * @param {SoundContext} audioContext The audio context.
 */
export default class SoundNodes extends Filterable
{
    /**
     * The buffer size for script processor
     * @name PIXI.sound.SoundNodes.BUFFER_SIZE
     * @type {Number}
     * @default 256
     */
    public static BUFFER_SIZE: number = 256;

    /**
     * Get the buffer source node
     * @name PIXI.sound.SoundNodes#bufferSource
     * @type {AudioBufferSourceNode}
     * @readOnly
     */
    public bufferSource: AudioBufferSourceNode;

    /**
     * Get the script processor node.
     * @name PIXI.sound.SoundNodes#script
     * @type {ScriptProcessorNode}
     * @readOnly
     */
    public script: ScriptProcessorNode;

    /**
     * Get the gain node
     * @name PIXI.sound.SoundNodes#gain
     * @type {GainNode}
     * @readOnly
     */
    public gain: GainNode;

    /**
     * Get the analyser node
     * @name PIXI.sound.SoundNodes#analyser
     * @type {AnalyserNode}
     * @readOnly
     */
    public analyser: AnalyserNode;

    /**
     * Reference to the SoundContext
     * @name PIXI.sound.SoundNodes#context
     * @type {PIXI.sound.SoundContext}
     * @readOnly
     */
    public context: SoundContext;

    constructor(context: SoundContext)
    {
        const audioContext: AudioContext = context.audioContext;

        const bufferSource: AudioBufferSourceNode = audioContext.createBufferSource();
        const script: ScriptProcessorNode = audioContext.createScriptProcessor(SoundNodes.BUFFER_SIZE);
        const gain: GainNode = audioContext.createGain();
        const analyser: AnalyserNode = audioContext.createAnalyser();

        bufferSource.connect(analyser);
        analyser.connect(gain);
        gain.connect(context.destination);
        script.connect(context.destination);

        super(analyser, gain);

        this.context = context;
        this.bufferSource = bufferSource;
        this.script = script;
        this.gain = gain;
        this.analyser = analyser;
    }

    /**
     * Cleans up.
     * @method PIXI.sound.SoundNodes#destroy
     */
    public destroy(): void
    {
        super.destroy();

        this.bufferSource.disconnect();
        this.script.disconnect();
        this.gain.disconnect();
        this.analyser.disconnect();

        this.bufferSource = null;
        this.script = null;
        this.gain = null;
        this.analyser = null;

        this.context = null;
    }

    /**
     * Clones the bufferSource. Used just before playing a sound.
     * @method PIXI.sound.SoundNodes#cloneBufferSource
     * @returns {AudioBufferSourceNode} The clone AudioBufferSourceNode.
     */
    public cloneBufferSource(): AudioBufferSourceNode
    {
        const orig: AudioBufferSourceNode = this.bufferSource;
        const clone: AudioBufferSourceNode = this.context.audioContext.createBufferSource();
        clone.buffer = orig.buffer;
        clone.playbackRate.value = orig.playbackRate.value;
        clone.loop = orig.loop;
        clone.connect(this.destination);
        return clone;
    }
}
