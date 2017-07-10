import Filter from './Filter';
import SoundLibrary from '../SoundLibrary';

/**
 * Combine all channels into mono channel.
 *
 * @class MonoFilter
 * @memberof PIXI.sound.filters
 */
export default class MonoFilter extends Filter
{
    /**
     * Merger node
     * @name PIXI.sound.filters.MonoFilter#_merge
     * @type {ChannelMergerNode}
     * @private
     */
    private _merger:ChannelMergerNode;

    constructor()
    {
        if (SoundLibrary.instance.useLegacy)
        {
            super(null);
        }
        const audioContext:AudioContext = SoundLibrary.instance.context.audioContext;
        const splitter:ChannelSplitterNode = audioContext.createChannelSplitter();
        const merger:ChannelMergerNode = audioContext.createChannelMerger();
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
