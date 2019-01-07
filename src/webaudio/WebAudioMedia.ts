import * as path from "path";
import { Filter } from "../filters";
import { IMedia } from "../interfaces";
import { CompleteCallback, LoadedCallback, Options, PlayOptions, Sound } from "../Sound";
import { SoundSprite, SoundSpriteData, SoundSprites } from "../sprites";
import { WebAudioContext } from "./WebAudioContext";
import { WebAudioInstance } from "./WebAudioInstance";
import { WebAudioNodes } from "./WebAudioNodes";

/**
 * Represents a single sound element. Can be used to play, pause, etc. sound instances.
 * @private
 * @class WebAudioMedia
 * @memberof PIXI.sound.webaudio
 * @param {PIXI.sound.Sound} parent - Instance of parent Sound container
 */
export class WebAudioMedia implements IMedia
{
    /**
     * Reference to the parent Sound container.
     * @name PIXI.sound.webaudio.WebAudioMedia#parent
     * @type {PIXI.sound.Sound}
     * @readonly
     */
    public parent: Sound;

    /**
     * The file buffer to load.
     * @name PIXI.sound.webaudio.WebAudioMedia#source
     * @type {ArrayBuffer}
     * @readonly
     */
    public source: ArrayBuffer;

    /**
     * Instance of the chain builder.
     * @name PIXI.sound.webaudio.WebAudioMedia#_nodes
     * @type {PIXI.sound.webaudio.WebAudioNodes}
     * @private
     */
    private _nodes: WebAudioNodes;

    /**
     * Instance of the source node.
     * @name PIXI.sound.webaudio.WebAudioMedia#_source
     * @type {AudioBufferSourceNode}
     * @private
     */
    private _source: AudioBufferSourceNode;

    public init(parent: Sound): void
    {
        this.parent = parent;
        this._nodes = new WebAudioNodes(this.context);
        this._source = this._nodes.bufferSource;
        this.source = parent.options.source as ArrayBuffer;
    }

    /**
     * Destructor, safer to use `SoundLibrary.remove(alias)` to remove this sound.
     * @private
     * @method PIXI.sound.webaudio.WebAudioMedia#destroy
     */
    public destroy(): void
    {
        this.parent = null;
        this._nodes.destroy();
        this._nodes = null;
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
        console.assert(this.isPlayable, "Sound not yet playable, no duration");
        return this._source.buffer.duration;
    }

    /**
     * Gets and sets the buffer.
     * @name PIXI.sound.webaudio.WebAudioMedia#buffer
     * @type {AudioBuffer}
     */
    public get buffer(): AudioBuffer
    {
        return this._source.buffer;
    }
    public set buffer(buffer: AudioBuffer)
    {
        this._source.buffer = buffer;
    }

    /**
     * Get the current chained nodes object
     * @private
     * @name PIXI.sound.webaudio.WebAudioMedia#nodes
     * @type {PIXI.sound.webaudio.WebAudioNodes}
     */
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
            callback(new Error("sound.url or sound.source must be set"));
        }
        else
        {
            console.error("sound.url or sound.source must be set");
        }
    }

    /**
     * Loads a sound using XHMLHttpRequest object.
     * @method PIXI.sound.webaudio.WebAudioMedia#_loadUrl
     * @private
     */
    private _loadUrl(callback?: LoadedCallback): void
    {
        const request = new XMLHttpRequest();
        const url: string = this.parent.url;
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        // Decode asynchronously
        request.onload = () => {
            this.source = request.response as ArrayBuffer;
            this._decode(request.response, callback);
        };

        // actually start the request
        request.send();
    }

    /**
     * Decodes the array buffer.
     * @method PIXI.sound.webaudio.WebAudioMedia#decode
     * @param {ArrayBuffer} arrayBuffer From load.
     * @private
     */
    private _decode(arrayBuffer: ArrayBuffer, callback?: LoadedCallback): void
    {
        const context = this.parent.context as WebAudioContext;
        context.decode(arrayBuffer, (err: Error, buffer: AudioBuffer) =>
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
        });
    }
}
