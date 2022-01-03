import { Filterable } from '../Filterable';
import { WebAudioContext } from './WebAudioContext';
import { WebAudioUtils } from './WebAudioUtils';

/** Output for cloning source node. */
interface SourceClone {
    /** Cloned audio buffer source */
    source: AudioBufferSourceNode;
    /** Independent volume control */
    gain: GainNode;
}

/**
 * @memberof webaudio
 */
class WebAudioNodes extends Filterable
{
    /**
     * The buffer size for script processor, default is `0` which auto-detects. If you plan to use
     * script node on iOS, you'll need to provide a non-zero amount.
     * @default 0
     */
    public static BUFFER_SIZE = 0;

    /**
     * Get the buffer source node
     * @readonly
     */
    public bufferSource: AudioBufferSourceNode;

    /**
     * Get the gain node
     * @readonly
     */
    public gain: GainNode;

    /**
     * Get the analyser node
     * @readonly
     */
    public analyser: AnalyserNode;

    /**
     * Reference to the SoundContext
     * @readonly
     */
    public context: WebAudioContext;

    /** Private reference to the script processor node. */
    private _script: ScriptProcessorNode;

    /**
     * @param context - The audio context.
     */
    constructor(context: WebAudioContext)
    {
        const audioContext: AudioContext = context.audioContext;

        const bufferSource: AudioBufferSourceNode = audioContext.createBufferSource();
        const gain: GainNode = audioContext.createGain();
        const analyser: AnalyserNode = audioContext.createAnalyser();

        bufferSource.connect(analyser);
        analyser.connect(gain);
        gain.connect(context.destination);

        super(analyser, gain);

        this.context = context;
        this.bufferSource = bufferSource;
        this.gain = gain;
        this.analyser = analyser;
    }

    /**
     * Get the script processor node.
     * @readonly
     */
    public get script(): ScriptProcessorNode
    {
        if (!this._script)
        {
            this._script = this.context.audioContext.createScriptProcessor(WebAudioNodes.BUFFER_SIZE);
            this._script.connect(this.context.destination);
        }

        return this._script;
    }

    /** Cleans up. */
    public destroy(): void
    {
        super.destroy();

        this.bufferSource.disconnect();
        if (this._script)
        {
            this._script.disconnect();
        }
        this.gain.disconnect();
        this.analyser.disconnect();

        this.bufferSource = null;
        this._script = null;
        this.gain = null;
        this.analyser = null;

        this.context = null;
    }

    /**
     * Clones the bufferSource. Used just before playing a sound.
     * @returns {SourceClone} The clone AudioBufferSourceNode.
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
     * @readonly
     */
    get bufferSize(): number
    {
        return this.script.bufferSize;
    }
}

export type { SourceClone };
export { WebAudioNodes };
