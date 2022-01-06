import { Filter } from './filters/Filter';

/**
 * Abstract class which SoundNodes and SoundContext
 * both extend. This provides the functionality for adding
 * dynamic filters.
 */
class Filterable
{
    /** Get the gain node */
    private _input: AudioNode;

    /** The destination output audio node */
    private _output: AudioNode;

    /** Collection of filters. */
    private _filters: Filter[];

    /**
     * @param input - The source audio node
     * @param output - The output audio node
     */
    constructor(input: AudioNode, output: AudioNode)
    {
        this._output = output;
        this._input = input;
    }

    /** The destination output audio node */
    get destination(): AudioNode
    {
        return this._input;
    }

    /** The collection of filters. */
    get filters(): Filter[]
    {
        return this._filters;
    }
    set filters(filters: Filter[])
    {
        if (this._filters)
        {
            this._filters.forEach((filter: Filter) =>
            {
                if (filter)
                {
                    filter.disconnect();
                }
            });
            this._filters = null;
            // Reconnect direct path
            this._input.connect(this._output);
        }

        if (filters && filters.length)
        {
            this._filters = filters.slice(0);

            // Disconnect direct path before inserting filters
            this._input.disconnect();

            // Connect each filter
            let prevFilter: Filter = null;

            filters.forEach((filter: Filter) =>
            {
                if (prevFilter === null)
                {
                    // first filter is the destination
                    // for the analyser
                    this._input.connect(filter.destination);
                }
                else
                {
                    prevFilter.connect(filter.destination);
                }
                prevFilter = filter;
            });
            prevFilter.connect(this._output);
        }
    }

    /** Cleans up. */
    public destroy(): void
    {
        this.filters = null;
        this._input = null;
        this._output = null;
    }
}

export { Filterable };
