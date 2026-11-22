/**
 * Base class for all filters. Wraps any WebAudio `AudioNode`, or a chain of them,
 * so it can be used in `Sound.filters`, `PlayOptions.filters` or `sound.filtersAll`.
 * Wrap a node directly, or extend this class for a reusable filter.
 * **Only supported with WebAudio.**
 * @example
 * import { filters, sound } from '@pixi/sound';
 * const { audioContext } = sound.context;
 *
 * // Wrap a single node
 * const lowpass = audioContext.createBiquadFilter();
 * lowpass.frequency.value = 800;
 * sound.find('music').filters = [new filters.Filter(lowpass)];
 *
 * // Wrap a chain: pass the first node (input) and the last node (output)
 * const highpass = audioContext.createBiquadFilter();
 * const gain = audioContext.createGain();
 * highpass.type = 'highpass';
 * highpass.connect(gain);
 * sound.play('music', { filters: [new filters.Filter(highpass, gain)] });
 * @memberof filters
 */
class Filter
{
    /** The input node, which the previous filter connects to. */
    public destination: AudioNode;

    /** The output node, which connects to the next filter. */
    public source: AudioNode;

    /**
     * @param {AudioNode} destination - The audio node to use as the destination for the input AudioNode
     * @param {AudioNode} [source] - Optional output node, defaults to destination node. This is useful
     *        when creating filters which contains multiple AudioNode elements chained together.
     */
    constructor(destination: AudioNode, source?: AudioNode)
    {
        this.init(destination, source);
    }

    /** Reinitialize */
    protected init(destination: AudioNode, source?: AudioNode): void
    {
        this.destination = destination;
        this.source = source || destination;
    }

    /**
     * Connect to the destination.
     * @param {AudioNode} destination - The destination node to connect the output to
     */
    public connect(destination: AudioNode): void
    {
        this.source?.connect(destination);
    }

    /** Completely disconnect filter from destination and source nodes. */
    public disconnect(): void
    {
        this.source?.disconnect();
    }

    /** Destroy the filter and don't use after this. */
    public destroy(): void
    {
        this.disconnect();
        this.destination = null;
        this.source = null;
    }
}

export { Filter };
