import { DOMAdapter } from 'pixi.js';
import { Filter } from '../filters/Filter';
import { IMedia } from '../interfaces/IMedia';
import { LoadedCallback, Sound } from '../Sound';
import { WebAudioContext } from './WebAudioContext';
import { WebAudioInstance } from './WebAudioInstance';
import { WebAudioNodes } from './WebAudioNodes';

/**
 * Represents a single sound element. Can be used to play, pause, etc. sound instances.
 * @memberof webaudio
 */
class WebAudioMedia implements IMedia
{
    /**
     * Reference to the parent Sound container.
     * @readonly
     */
    public parent: Sound;

    /**
     * The file buffer to load.
     * @readonly
     */
    public source: ArrayBuffer | AudioBuffer;

    /** Instance of the chain builder. */
    private _nodes: WebAudioNodes;

    /** Instance of the source node. */
    private _source: AudioBufferSourceNode;

    /**
     * Re-initialize without constructing.
     * @param parent - - Instance of parent Sound container
     */
    public init(parent: Sound): void
    {
        this.parent = parent;
        this._nodes = new WebAudioNodes(this.context);
        this._source = this._nodes.bufferSource;
        this.source = parent.options.source as ArrayBuffer | AudioBuffer;
    }

    /** Destructor, safer to use `SoundLibrary.remove(alias)` to remove this sound. */
    public destroy(): void
    {
        this.parent = null;
        this._nodes.destroy();
        this._nodes = null;
        try
        {
            this._source.buffer = null;
        }
        catch (err)
        {
            // try/catch workaround for bug in older Chrome versions
            console.warn('Failed to set AudioBufferSourceNode.buffer to null:', err);
        }
        this._source = null;
        this.source = null;
    }

    // Implement create
    public create(): WebAudioInstance
    {
        return new WebAudioInstance(this);
    }

    // Implement context
    public get context(): WebAudioContext
    {
        return this.parent.context as WebAudioContext;
    }

    // Implement isPlayable
    public get isPlayable(): boolean
    {
        return !!this._source && !!this._source.buffer;
    }

    // Implement filters
    public get filters(): Filter[]
    {
        return this._nodes.filters;
    }
    public set filters(filters: Filter[])
    {
        this._nodes.filters = filters;
    }

    // Implements duration
    public get duration(): number
    {
        // eslint-disable-next-line no-console
        console.assert(this.isPlayable, 'Sound not yet playable, no duration');

        return this._source.buffer.duration;
    }

    /** Gets and sets the buffer. */
    public get buffer(): AudioBuffer
    {
        return this._source.buffer;
    }
    public set buffer(buffer: AudioBuffer)
    {
        this._source.buffer = buffer;
    }

    /** Get the current chained nodes object */
    public get nodes(): WebAudioNodes
    {
        return this._nodes;
    }

    // Implements load
    public load(callback?: LoadedCallback): void
    {
        // Load from the arraybuffer, incase it was loaded outside
        if (this.source)
        {
            this._decode(this.source, callback);
        }
        // Load from the file path
        else if (this.parent.url)
        {
            this._loadUrl(callback);
        }
        else if (callback)
        {
            callback(new Error('sound.url or sound.source must be set'));
        }
        else
        {
            console.error('sound.url or sound.source must be set');
        }
    }

    /** Loads a sound using XHMLHttpRequest object. */
    private async _loadUrl(callback?: LoadedCallback): Promise<void>
    {
        try
        {
            this._decode(await this._fetch(this.parent.url), callback);
        }
        catch (err)
        {
            if (callback)
            {
                callback(err);
            }
            else
            {
                console.error(err);
            }
        }
    }

    /** Fetches the file, adding the URL to network and HTTP errors. */
    private async _fetch(url: string): Promise<ArrayBuffer>
    {
        let response: Response;

        try
        {
            response = await DOMAdapter.get().fetch(url);
            if (response.ok)
            {
                return await response.arrayBuffer();
            }
        }
        catch (err)
        {
            // Object.assign because the ES2020 target has no ErrorOptions
            throw Object.assign(new Error(`Failed to load sound from ${url}: ${err.message}`), { cause: err });
        }

        throw new Error(`Failed to load sound from ${url}: HTTP ${response.status}`);
    }

    /**
     * Decodes the array buffer.
     * @param arrayBuffer - From load.
     * @param {Function} callback - Callback optional
     */
    private _decode(arrayBuffer: ArrayBuffer | AudioBuffer, callback?: LoadedCallback): void
    {
        const audioBufferReadyFn = (err: Error, buffer: AudioBuffer) =>
        {
            if (err)
            {
                if (callback)
                {
                    callback(err);
                }
            }
            else
            {
                this.parent.isLoaded = true;
                this.buffer = buffer;
                const instance = this.parent.autoPlayStart();

                if (callback)
                {
                    callback(null, this.parent, instance);
                }
            }
        };

        if (arrayBuffer instanceof AudioBuffer)
        {
            audioBufferReadyFn(null, arrayBuffer);
        }
        else
        {
            const context = this.parent.context as WebAudioContext;

            context.decode(arrayBuffer, audioBufferReadyFn);
        }
    }
}

export { WebAudioMedia };
