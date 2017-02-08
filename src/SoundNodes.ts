import SoundContext from './SoundContext';
import Filter from './filters/Filter';

/**
 * @class SoundNodes
 * @private
 * @memberof PIXI.sound
 * @param {SoundContext} audioContext The audio context.
 */
export default class SoundNodes
{
    /**
     * The buffer size for script processor
     * @name PIXI.sound.SoundNodes.BUFFER_SIZE
     * @type {Number}
     * @default 256
     */
    public static BUFFER_SIZE:number = 256;

    /**
     * Get the buffer source node
     * @name PIXI.sound.SoundNodes#bufferSource
     * @type {AudioBufferSourceNode}
     * @readOnly
     */
    public bufferSource:AudioBufferSourceNode;

    /**
     * Get the script processor node.
     * @name PIXI.sound.SoundNodes#scriptNode
     * @type {ScriptProcessorNode}
     * @readOnly
     */
    public scriptNode:ScriptProcessorNode;

    /**
     * Get the gain node
     * @name PIXI.sound.SoundNodes#gainNode
     * @type {GainNode}
     * @readOnly
     */
    public gainNode:GainNode;

    /**
     * Get the analyser node
     * @name PIXI.sound.SoundNodes#analyser
     * @type {AnalyserNode}
     * @readOnly
     */
    public analyser:AnalyserNode;

    /**
     * The destination output audio node
     * @name PIXI.sound.SoundNodes#destination
     * @type {AudioNode}
     * @readOnly
     */
    public destination:AudioNode;

    /**
     * Collection of filters.
     * @name PIXI.sound.SoundNodes#_filters
     * @type {PIXI.sound.filters.Filter[]}
     * @private
     */
    private _filters:Filter[];

    /**
     * Reference to the SoundContext
     * @name PIXI.sound.SoundNodes#context
     * @type {PIXI.sound.SoundContext}
     * @readOnly
     */

    constructor(public context:SoundContext)
    {
        const audioContext:AudioContext = this.context.audioContext;

        const bufferSource:AudioBufferSourceNode = audioContext.createBufferSource();
        const scriptNode:ScriptProcessorNode = audioContext.createScriptProcessor(SoundNodes.BUFFER_SIZE);
        const gainNode:GainNode = audioContext.createGain();
        const analyser:AnalyserNode = audioContext.createAnalyser();

        gainNode.connect(this.context.destination);
        scriptNode.connect(this.context.destination);
        analyser.connect(gainNode);
        bufferSource.connect(analyser);

        this.bufferSource = bufferSource;
        this.scriptNode = scriptNode;
        this.gainNode = gainNode;
        this.analyser = analyser;
        this.destination = analyser;
    }

    /** 
     * The collection of filters
     * @name PIXI.sound.SoundNodes#filters
     * @type {PIXI.sound.filters.Filter[]}
     */
    get filters():Filter[]
    {
        return this._filters;
    }
    set filters(filters:Filter[])
    {
        if (this._filters)
        {
            this._filters.forEach((filter:Filter) => {
                filter && filter.disconnect();
            });
            this._filters = null;
            // Reconnect direct path
            this.analyser.connect(this.gainNode);
        }

        if (filters && filters.length)
        {
            this._filters = filters.slice(0);

            // Disconnect direct path before inserting filters
            this.analyser.disconnect();

            // Connect each filter
            let prevFilter:Filter = null;
            filters.forEach((filter:Filter) => {
                if (prevFilter === null)
                {
                    // first filter is the destination
                    // for the analyser
                    this.analyser.connect(filter.destination);
                }
                else
                {
                    prevFilter.connect(filter.destination);
                }
                prevFilter = filter;
            });
            prevFilter.connect(this.gainNode);
        }
    }

    /**
     * Cleans up.
     * @method PIXI.sound.SoundNodes#destroy
     */
    public destroy():void
    {
        this.filters = null;
        this.bufferSource.disconnect();
        this.scriptNode.disconnect();
        this.gainNode.disconnect();
        this.analyser.disconnect();

        this.bufferSource = null;
        this.scriptNode = null;
        this.gainNode = null;
        this.analyser = null;

        this.context = null;
    }

    /**
     * Clones the bufferSource. Used just before playing a sound.
     * @method PIXI.sound.SoundNodes#cloneBufferSource
     * @returns {AudioBufferSourceNode} The clone AudioBufferSourceNode.
     */
    public cloneBufferSource():AudioBufferSourceNode
    {
        const orig:AudioBufferSourceNode = this.bufferSource;
        const clone:AudioBufferSourceNode = this.context.audioContext.createBufferSource();
        clone.buffer = orig.buffer;
        clone.playbackRate.value = orig.playbackRate.value;
        clone.loop = orig.loop;
        clone.connect(this.destination);
        return clone;
    }
}
