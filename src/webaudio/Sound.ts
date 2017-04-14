import * as path from "path";
import Filter from "../filters/Filter";
import soundLibrary from "../index";
import SoundContext from "./SoundContext";
import SoundInstance from "./SoundInstance";
import SoundNodes from "./SoundNodes";
import SoundSprite from "../sprites/SoundSprite";
import LegacySound from "../legacy/LegacySound";
import {SoundSpriteData, SoundSprites} from "../sprites/SoundSprite";
import BaseSound from "../bases/BaseSound";
import {Options, PlayOptions, LoadedCallback, CompleteCallback} from "../bases/BaseSound";

/**
 * Represents a single sound element. Can be used to play, pause, etc. sound instances.
 *
 * @class Sound
 * @memberof PIXI.sound
 * @example
 * const foo = PIXI.sound.Sound.from('foo.mp3');
 * foo.play();
 * @param {PIXI.sound.SoundContext} context The SoundContext instance.
 * @param {ArrayBuffer|String|Object} options Either the path or url to the source file.
 *        or the object of options to use. See {@link PIXI.sound.Sound.from}
 */
export default class Sound extends BaseSound
{
    /**
     * The file buffer to load.
     * @name PIXI.sound.Sound#srcBuffer
     * @type {ArrayBuffer}
     * @readonly
     */
    public srcBuffer: ArrayBuffer;

    /**
     * `true` to use XMLHttpRequest object to load.
     * Default is to use NodeJS's fs module to read the sound.
     * @name PIXI.sound.Sound#useXHR
     * @type {Boolean}
     * @default false
     */
    public useXHR: boolean;

    /**
     * Reference to the sound context.
     * @name PIXI.sound.Sound#_context
     * @type {SoundContext}
     * @private
     */
    private _context: SoundContext;

    /**
     * Instance of the chain builder.
     * @name PIXI.sound.Sound#_nodes
     * @type {SoundNodes}
     * @private
     */
    private _nodes: SoundNodes;

    /**
     * Instance of the source node.
     * @name PIXI.sound.Sound#_source
     * @type {AudioBufferSourceNode}
     * @private
     */
    private _source: AudioBufferSourceNode;

    /**
     * Create a new sound instance from source.
     * @method PIXI.sound.Sound.from
     * @param {ArrayBuffer|String|Object} options Either the path or url to the source file.
     *        or the object of options to use.
     * @param {ArrayBuffer|String} [options.src] If `options` is an object, the source of file.
     * @param {Boolean} [options.autoPlay=false] true to play after loading.
     * @param {Boolean} [options.preload=false] true to immediately start preloading.
     * @param {Boolean} [options.singleInstance=false] `true` to disallow playing multiple layered instances at once.
     * @param {Number} [options.volume=1] The amount of volume 1 = 100%.
     * @param {Boolean} [options.useXHR=true] true to use XMLHttpRequest to load the sound. Default is false,
     *        loaded with NodeJS's `fs` module.
     * @param {Number} [options.speed=1] The playback rate where 1 is 100% speed.
     * @param {Object} [options.sprites] The map of sprite data. Where a sprite is an object
     *        with a `start` and `end`, which are the times in seconds. Optionally, can include
     *        a `speed` amount where 1 is 100% speed.
     * @param {PIXI.sound.Sound~completeCallback} [options.complete=null] Global complete callback
     *        when play is finished.
     * @param {PIXI.sound.Sound~loadedCallback} [options.loaded=null] Call when finished loading.
     * @param {Boolean} [options.loop=false] true to loop the audio playback.
     * @return {PIXI.sound.Sound} Created sound instance.
     */
    public static from(options: string|Options|ArrayBuffer): BaseSound
    {
        let sound:BaseSound;
        if (soundLibrary.useLegacy)
        {
            sound = new LegacySound(options);
        }
        else
        {
            sound = new Sound(soundLibrary.context, options);
        }
        return sound;
    }

    constructor(context: SoundContext, source: string|Options|ArrayBuffer)
    {
        super(source);

        const options = this._options;

        this._context = context;
        this._nodes = new SoundNodes(this._context);
        this._source = this._nodes.bufferSource;
        this.srcBuffer = options.srcBuffer as ArrayBuffer;
        this.useXHR = options.useXHR;
        this.speed = options.speed;

        this._init();
    }

    /**
     * Destructor, safer to use `SoundLibrary.remove(alias)` to remove this sound.
     * @private
     * @method PIXI.sound.Sound#destroy
     */
    public destroy(): void
    {
        super.destroy();

        // destroy this._nodes
        this._nodes.destroy();
        this._nodes = null;
        this._context = null;
        this._source = null;
        this.srcBuffer = null;
    }
    
    public get isPlayable(): boolean
    {
        return this.isLoaded && !!this._source && !!this._source.buffer;
    }

    /**
     * The current current sound being played in.
     * @name PIXI.sound.Sound#context
     * @type {PIXI.sound.SoundContext}
     * @readonly
     */
    public get context(): SoundContext
    {
        return this._context;
    }

    /**
     * Method for handling volume change
     * @method PIXI.sound.Sound#_changeVolume
     * @protected
     */
    protected _changeVolume(volume: number): void
    {
        this._nodes.gain.gain.value = volume;
    }

    /**
     * Method for handling volume change
     * @method PIXI.sound.Sound#_changeVolume
     * @protected
     */
    protected _changeLoop(loop: boolean): void
    {
        this._source.loop = loop;
    }

    /**
     * Gets and sets the buffer.
     * @name PIXI.sound.Sound#buffer
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
     * Get the duration in seconds.
     * @name PIXI.sound.Sound#duration
     * @type {number}
     */
    public get duration(): number
    {
        // @if DEBUG
        console.assert(this.isPlayable, "Sound not yet playable, no duration");
        // @endif
        return this._source.buffer.duration;
    }

    /**
     * Get the current chained nodes object
     * @private
     * @name PIXI.sound.Sound#nodes
     * @type {PIXI.sound.SoundNodes}
     */
    public get nodes(): SoundNodes
    {
        return this._nodes;
    }

    /**
     * Push the collection of filters. **Only supported with WebAudio.**
     * @name PIXI.sound.Sound#filters
     * @type {PIXI.sound.SoundNodes}
     */
    public get filters(): Filter[]
    {
        return this._nodes.filters;
    }
    public set filters(filters: Filter[])
    {
        this._nodes.filters = filters;
    }

    /**
     * The playback rate where 1 is 100%. **Only supported with WebAudio.**
     * @name PIXI.sound.Sound#speed
     * @type {Number}
     * @default 1
     */
    public get speed(): number
    {
        return this._source.playbackRate.value;
    }
    public set speed(value: number)
    {
        this._source.playbackRate.value = value;
    }

    /**
     * Starts the preloading of sound.
     * @method PIXI.sound.Sound#_beginPreload
     * @protected
     */
    protected _beginPreload(callback?: LoadedCallback): void
    {
        // Load from the file path
        if (this.src)
        {
            this.useXHR ? this._loadUrl(callback) : this._loadPath(callback);
        }
        // Load from the arraybuffer, incase it was loaded outside
        else if (this.srcBuffer)
        {
            this._decode(this.srcBuffer, callback);
        }
        else if (callback)
        {
            callback(new Error("sound.src or sound.srcBuffer must be set"));
        }
        else
        {
            console.error("sound.src or sound.srcBuffer must be set");
        }
    }

    /**
     * Loads a sound using XHMLHttpRequest object.
     * @method PIXI.sound.Sound#_loadUrl
     * @private
     */
    private _loadUrl(callback?: LoadedCallback): void
    {
        const request = new XMLHttpRequest();
        const src: string = this.src;
        request.open("GET", src, true);
        request.responseType = "arraybuffer";

        // Decode asynchronously
        request.onload = () => {
            this.srcBuffer = request.response as ArrayBuffer;
            this._decode(request.response, callback);
        };

        // actually start the request
        request.send();
    }

    /**
     * Loads using the file system (NodeJS's fs module).
     * @method PIXI.sound.Sound#_loadPath
     * @private
     */
    private _loadPath(callback?: LoadedCallback)
    {
        const fs = require("fs");
        const src: string = this.src;
        fs.readFile(src, (err: Error, data: Buffer) => {
            if (err)
            {
                // @if DEBUG
                console.error(err);
                // @endif
                if (callback)
                {
                    callback(new Error(`File not found ${this.src}`));
                }
                return;
            }
            const arrayBuffer = new ArrayBuffer(data.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < data.length; ++i)
            {
                view[i] = data[i];
            }
            this.srcBuffer = arrayBuffer;
            this._decode(arrayBuffer, callback);
        });
    }

    /**
     * Decodes the array buffer.
     * @method PIXI.sound.Sound#decode
     * @param {ArrayBuffer} arrayBuffer From load.
     * @private
     */
    private _decode(arrayBuffer: ArrayBuffer, callback?: LoadedCallback): void
    {
        this._context.decode(arrayBuffer, (err: Error, buffer: AudioBuffer) =>
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
                    this.isLoaded = true;
                    this.buffer = buffer;
                    const instance = this._autoPlay();
                    if (callback)
                    {
                        callback(null, this, instance);
                    }
                }
            },
        );
    }
}
