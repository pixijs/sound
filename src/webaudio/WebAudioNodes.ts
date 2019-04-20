import { Filterable } from "../Filterable";
import { Filter } from "../filters/Filter";
import { WebAudioContext } from "./WebAudioContext";
import { WebAudioUtils } from "./WebAudioUtils";

/**
 * Output for cloneing node
 * @interface PIXI.sound.SoundNodes~SourceClone
 * @property {AudioBufferSourceNode} source Cloned audio buffer source
 * @property {GainNode} gain Independent volume control
 */
export interface SourceClone {
    source: AudioBufferSourceNode;
    gain: GainNode;
}

/**
 * @private
 * @class WebAudioNodes
 * @extends PIXI.sound.Filterable
 * @private
 * @memberof PIXI.sound.webaudio
 * @param {PIXI.sound.webaudio.WebAudioContext} audioContext The audio context.
 */
export class WebAudioNodes extends Filterable
{
    /**
     * Get the buffer source node
     * @name PIXI.sound.SoundNodes#bufferSource
     * @type {AudioBufferSourceNode}
     * @readonly
     */
    public bufferSource: AudioBufferSourceNode;

    /**
     * Get the script processor node.
     * @name PIXI.sound.SoundNodes#script
     * @type {ScriptProcessorNode}
     * @readonly
     */
    public script: ScriptProcessorNode;

    /**
     * Get the gain node
     * @name PIXI.sound.SoundNodes#gain
     * @type {GainNode}
     * @readonly
     */
    public gain: GainNode;

    /**
     * Get the analyser node
     * @name PIXI.sound.SoundNodes#analyser
     * @type {AnalyserNode}
     * @readonly
     */
    public analyser: AnalyserNode;

    /**
     * Reference to the SoundContext
     * @name PIXI.sound.SoundNodes#context
     * @type {PIXI.sound.webaudio.WebAudioContext}
     * @readonly
     */
    public context: WebAudioContext;

    constructor(context: WebAudioContext)
    {
        const audioContext: AudioContext = context.audioContext;

        const bufferSource: AudioBufferSourceNode = audioContext.createBufferSource();
        const script: ScriptProcessorNode = audioContext.createScriptProcessor(0);
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
     * @returns {PIXI.sound.SoundNodes~SourceClone} The clone AudioBufferSourceNode.
     */
    public cloneBufferSource(): SourceClone
    {
        const orig: AudioBufferSourceNode = this.bufferSource;
        const source: AudioBufferSourceNode = this.context.audioContext.createBufferSource();
        source.buffer = orig.buffer;
        WebAudioUtils.setParamValue(source.playbackRate, orig.playbackRate.value);
        source.loop = orig.loop;

        const gain: GainNode = this.context.audioContext.createGain();
        source.connect(gain);
        gain.connect(this.destination);
        return { source, gain };
    }

    /**
     * Get buffer size of `ScriptProcessorNode`.
     * @type {number}
     * @readonly
     */
    get bufferSize(): number
    {
        return this.script.bufferSize;
    }
}
