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
        let merger: ChannelMergerNode;
        let splitter: ChannelSplitterNode;

        if (!getInstance().useLegacy)
        {
            const { audioContext } = getInstance().context;

            splitter = audioContext.createChannelSplitter();
            merger = audioContext.createChannelMerger();
            merger.connect(splitter);
        }
        super(merger, splitter);
        this._merger = merger;
    }

    public destroy(): void
    {
        this._merger?.disconnect();
        this._merger = null;
        super.destroy();
    }
}

export { MonoFilter };
