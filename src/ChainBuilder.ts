/**
 * @class ChainBuilder
 * @private
 * @param {AudioContext} audioContext The audio context.
 */
export default class ChainBuilder
{
    private _firstNode:any;
    private _lastNode:any;
    private _nodes:any;
    private _bufferSourceDst:any;

    constructor(private _context:AudioContext)
    {
        this._firstNode = null;
        this._lastNode  = null;
        this._nodes = {};
    }

    /**
     * Cleans up.
     * @method ChainBuilder#destroy
     */
    destroy():void
    {
        this._nodes = null;
        this._context = null;
        this._firstNode = null;
        this._lastNode = null;
    }

    /**
     * Gets the nodes.
     * @method ChainBuilder#nodes
     * @return {Object}
     */
    nodes():any
    {
        return this._nodes;
    }

    /**
     * Gets the first node.
     * @method ChainBuilder#first
     * @return {Object}
     */
    first():any
    {
        return this._firstNode;
    }

    /**
     * Gets the last node.
     * @method ChainBuilder#last
     * @return {Object}
     */
    last():any
    {
        return this._lastNode;
    }

    /**
     * Adds a node to the chain.
     * @method ChainBuilder#_addNode
     * @private
     * @param {*} node
     * @param {*} properties
     */
    _addNode(node:any, properties?:any): ChainBuilder
    {
        // update this._bufferSourceDst - needed for .cloneBufferSource()
        const lastIsBufferSource = this._lastNode && ('playbackRate' in this._lastNode);
        if (lastIsBufferSource)
        {
            this._bufferSourceDst = node;
        }

        // connect this._lastNode to node if suitable
        if (this._lastNode)
        {
            this._lastNode.connect(node);
        }

        // update this._firstNode && this._lastNode
        if (!this._firstNode)
        {
            this._firstNode = node;
        }
        this._lastNode = node;

        // apply properties to the node
        for (let property in properties)
        {
            node[property] = properties[property];
        }
        // for chained API
        return this;
    }

    /**
     * Clones the bufferSource. Used just before playing a sound.
     * @method ChainBuilder#cloneBufferSource
     * @returns {AudioBufferSourceNode} The clone AudioBufferSourceNode.
     */
    cloneBufferSource():AudioBufferSourceNode
    {
        // @if DEBUG
        console.assert(this._nodes.bufferSource, "No buffersource presents. Add one.");
        // @endif
        const orig = this._nodes.bufferSource;
        const clone = this._context.createBufferSource();
        clone.buffer = orig.buffer;
        clone.playbackRate.value = orig.playbackRate.value;
        clone.loop = orig.loop;
        clone.connect(this._bufferSourceDst);
        return clone;
    }

    /**
     * Adds a bufferSource.
     * @method ChainBuilder#bufferSrouce
     * @param {Object} [properties] Properties to set in the created node.
     */
    bufferSource(properties?:any):ChainBuilder
    {
        const node = this._context.createBufferSource();
        this._nodes.bufferSource = node;
        return this._addNode(node, properties);
    }

    /**
     * Adds a createMediaStreamSource.
     * @method ChainBuilder#mediaStreamSource
     * @param {Object} [properties] Properties to set in the created node.
     */
    // mediaStreamSource(stream:any, properties?:any):ChainBuilder
    // {
    //     const node = this._context.createMediaStreamSource(stream);
    //     this._nodes.bufferSource = node;
    //     return this._addNode(node, properties);
    // }

    /**
     * Adds a createMediaElementSource.
     * @method ChainBuilder#mediaElementSource
     * @param  {HTMLElement} element    The element to add.
     * @param {Object} [properties] Properties to set in the created node.
     */
    // mediaElementSource(element:HTMLElement, properties?:any):ChainBuilder
    // {
    //     console.assert(element instanceof HTMLAudioElement || element instanceof HTMLVideoElement);
    //     const node = this._context.createMediaElementSource(element);
    //     this._nodes.bufferSource = node;
    //     return this._addNode(node, properties);
    // }

    /**
     * Adds a panner.
     * @method ChainBuilder#panner
     * @param {Object} [properties] Properties to set in the created node.
     */
    panner(properties?:any):ChainBuilder
    {
        const node = this._context.createStereoPanner();
        this._nodes.panner = node;
        return this._addNode(node, properties);
    }

    /**
     * Adds an analyser.
     * @method ChainBuilder#analyser
     * @param {Object} [properties] Properties to set in the created node.
     */
    analyser(properties?:any):ChainBuilder
    {
        const node = this._context.createAnalyser();
        this._nodes.analyser = node;
        return this._addNode(node, properties);
    }

    /**
     * Adds a gainNode.
     * @method ChainBuilder#gainNode
     * @param {Object} [properties] Properties to set in the created node.
     */
    gainNode(properties?:any):ChainBuilder
    {
        const node = this._context.createGain();
        this._nodes.gainNode = node;
        return this._addNode(node, properties);
    }
}
