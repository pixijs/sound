/**
 * Represents a single sound element. Can be used to play, pause, etc. sound instances.
 *
 * @class Filter
 * @memberof PIXI.sound.filters
 * @param {AudioNode} destination The audio node to use as the destination for the input AudioNode
 * @param {AudioNode} [source] Optional output node, defaults to destination node. This is useful
 *        when creating filters which contains multiple AudioNode elements chained together.
 */
export default class Filter
{
    /**
     * The node to connect for the filter to the previous filter.
     * @name PIXI.sound.filters.Filter#destination
     * @type {AudioNode}
     */
    public destination:AudioNode;

    /**
     * The node to connect for the filter to the previous filter.
     * @name PIXI.sound.filters.Filter#source
     * @type {AudioNode}
     */
    public source:AudioNode;
    
    constructor(destination:AudioNode, source?:AudioNode)
    {
        this.destination = destination;
        this.source = source || destination;
    }

    /**
     * Connect to the destination.
     * @method PIXI.sound.filters.Filter#connect
     * @param {AudioNode} destination The destination node to connect the output to
     */
    connect(destination:AudioNode): void
    {
        this.source.connect(destination);
    }

    /**
     * Completely disconnect filter from destination and source nodes.
     * @method PIXI.sound.filters.Filter#disconnect
     */
    disconnect(): void
    {
        this.source.disconnect();
    }

    /**
     * Destroy the filter and don't use after this.
     * @method PIXI.sound.filters.Filter#destroy
     */
    destroy(): void
    {
        this.disconnect();
        this.destination = null;
        this.source = null;
    }
}
