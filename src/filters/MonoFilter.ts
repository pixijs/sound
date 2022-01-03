import { getInstance } from '../instance';
import { Filter } from './Filter';

/**
 * Combine all channels into mono channel.
 *
 * @memberof filters
 */
class MonoFilter extends Filter
{
    /** Merger node */
    private _merger: ChannelMergerNode;

    constructor()
    {
        if (getInstance().useLegacy)
        {
            super(null);

            return;
        }
        const audioContext: AudioContext = getInstance().context.audioContext;
        const splitter: ChannelSplitterNode = audioContext.createChannelSplitter();
        const merger: ChannelMergerNode = audioContext.createChannelMerger();

        merger.connect(splitter);
        super(merger, splitter);
        this._merger = merger;
    }

    public destroy(): void
    {
        this._merger.disconnect();
        this._merger = null;
        super.destroy();
    }
}

export { MonoFilter };
