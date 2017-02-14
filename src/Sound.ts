import SoundContext from './SoundContext';
import SoundNodes from './SoundNodes';
import SoundInstance from './SoundInstance';
import soundLibrary from './index';
import Filter from './filters/Filter';
import * as path from 'path';

export interface Options {
    autoPlay?:boolean;
    preaload?:boolean;
    singleInstance?:boolean;
    volume?:number;
    speed?:number;
    complete?:CompleteCallback;
    loaded?:LoadedCallback;
    preload?:boolean;
    loop?:boolean;
    src?:string;
    srcBuffer?:ArrayBuffer;
    useXHR?:boolean;
}

export interface PlayOptions {
    start?:number;
    end?:number;
    speed?:number;
    loop?:boolean;
    complete?:CompleteCallback;
    loaded?:LoadedCallback;
}

/**
 * Callback when sound is loaded.
 * @callback PIXI.sound.Sound~loadedCallback
 * @param {Error} err The callback error.
 * @param {PIXI.sound.Sound} sound The instance of new sound.
 */
export declare type LoadedCallback = (err:Error, sound?:Sound) => void;

/**
 * Callback when sound is completed.
 * @callback PIXI.sound.Sound~completeCallback
 * @param {PIXI.sound.Sound} sound The instance of sound.
 */
export declare type CompleteCallback = (sound:Sound) => void;

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
export default class Sound
{   
    /**
     * `true` if the buffer is loaded.
     * @name PIXI.sound.Sound#isLoaded
     * @type {Boolean}
     * @default false
     */
    public isLoaded:boolean;

    /**
     * `true` if the sound is currently being played.
     * @name PIXI.sound.Sound#isPlaying
     * @type {Boolean}
     * @default false
     * @readOnly
     */
    public isPlaying:boolean;

    /**
     * true to start playing immediate after load.
     * @name PIXI.sound.Sound#autoPlay
     * @type {Boolean}
     * @private
     * @default false
     * @readOnly
     */
    public autoPlay:boolean;

    /**
     * Callback when finished playing.
     * @name PIXI.sound.Sound#complete
     * @type {PIXI.sound.Sound~completeCallback}
     * @default false
     */
    public complete:CompleteCallback;

    /**
     * Callback when load is finished.
     * @type {PIXI.sound.Sound~loadedCallback}
     * @name PIXI.sound.Sound#loaded
     * @readOnly
     */
    public loaded:LoadedCallback;

    /**
     * `true` to disallow playing multiple layered instances at once.
     * @name PIXI.sound.Sound#singleInstance
     * @type {Boolean}
     * @default false
     */
    public singleInstance:boolean;

    /**
     * `true` to immediately start preloading.
     * @name PIXI.sound.Sound#preload
     * @type {Boolean}
     * @default false
     * @readOnly
     */
    public preload:boolean;

    /**
     * The file source to load.
     * @name PIXI.sound.Sound#src
     * @type {String}
     * @readOnly
     */
    public src:string;

    /**
     * The file buffer to load.
     * @name PIXI.sound.Sound#srcBuffer
     * @type {ArrayBuffer}
     * @readOnly
     */
    public srcBuffer:ArrayBuffer;

    /**
     * `true` to use XMLHttpRequest object to load.
     * Default is to use NodeJS's fs module to read the sound.
     * @name PIXI.sound.Sound#useXHR
     * @type {Boolean}
     * @default false
     */
    public useXHR:boolean;

    /**
     * Reference to the sound context.
     * @name PIXI.sound.Sound#_context
     * @type {SoundContext}
     * @private
     */
    private _context:SoundContext;

    /**
     * Instance of the chain builder.
     * @name PIXI.sound.Sound#_nodes
     * @type {SoundNodes}
     * @private
     */
    private _nodes:SoundNodes;

    /**
     * Instance of the source node.
     * @name PIXI.sound.Sound#_source
     * @type {AudioBufferSourceNode}
     * @private
     */
    private _source:AudioBufferSourceNode;

    /**
     * The collection of instances being played.
     * @name PIXI.sound.Sound#_instances
     * @type {Array<SoundInstance>}
     * @private
     */
    private _instances:Array<SoundInstance>;

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
     * @param {Boolean} [options.useXHR=true] true to use XMLHttpRequest to load the sound. Default is false, loaded with NodeJS's `fs` module.
     * @param {Number} [options.speed=1] The playback rate where 1 is 100% speed.
     * @param {PIXI.sound.Sound~completeCallback} [options.complete=null] Global complete callback when play is finished.
     * @param {PIXI.sound.Sound~loadedCallback} [options.loaded=null] Call when finished loading.
     * @param {Boolean} [options.loop=false] true to loop the audio playback.
     * @return {PIXI.sound.Sound} Created sound instance.
     */
    static from(options:string|Options|ArrayBuffer): Sound
    {
        return new Sound(soundLibrary.context, options);
    }

    constructor(context:SoundContext, source:string|Options|ArrayBuffer)
    {
        let options:Options = {};

        if (typeof source === "string")
        {
            options.src = source as string;
        }
        else if (source instanceof ArrayBuffer)
        {
            options.srcBuffer = source as ArrayBuffer;
        }
        else
        {
            options = source;
        }

        // Default settings
        options = Object.assign({
            autoPlay: false,
            singleInstance: false,
            src: null,
            srcBuffer: null,
            preload: false,
            volume: 1,
            speed: 1,
            complete: null,
            loaded: null,
            loop: false,
            useXHR: true
        }, options);

        this._context = context;
        this._nodes = new SoundNodes(this._context);
        this._source = this._nodes.bufferSource;
        this.isLoaded = false;
        this.isPlaying = false;
        this.autoPlay = options.autoPlay;
        this.singleInstance = options.singleInstance;
        this.preload = options.preload || this.autoPlay;
        this.complete = options.complete;
        this.loaded = options.loaded;
        this.src = options.src;
        this.srcBuffer = options.srcBuffer;
        this.useXHR = options.useXHR;
        this.volume = options.volume;
        this.loop = options.loop;
        this.speed = options.speed;
        this._instances = [];

        if (this.preload)
        {
            this._beginPreload();
        }
    }

    /**
     * Destructor, safer to use `SoundLibrary.remove(alias)` to remove this sound.
     * @private
     * @method PIXI.sound.Sound#destroy
     */
    public destroy():void
    {
        // destroy this._nodes
        this._nodes.destroy();
        this._nodes = null;
        this._context = null;
        this._source = null;

        this.complete = null;
        this.loaded = null;
        this.srcBuffer = null;

        this._removeInstances();
        this._instances = null;
    }

    /**
     * If the current sound is playable (loaded).
     * @name PIXI.sound.Sound#isPlayable
     * @type {Boolean}
     * @readOnly
     */
    public get isPlayable():boolean
    {
        return this.isLoaded && !!this._source && !!this._source.buffer;
    }

    /**
     * The current current sound being played in.
     * @name PIXI.sound.Sound#context
     * @type {PIXI.sound.SoundContext}
     * @readOnly
     */
    public get context():SoundContext
    {
        return this._context;
    }

    /**
     * Gets and sets the volume.
     * @name PIXI.sound.Sound#volume
     * @type {Number}
     */
    public get volume():number
    {
        return this._nodes.gainNode.gain.value;
    }
    public set volume(volume:number)
    {
        this._nodes.gainNode.gain.value = volume;
    }

    /**
     * Gets and sets the looping.
     * @name PIXI.sound.Sound#loop
     * @type {Boolean}
     */
    public get loop():boolean
    {
        return this._source.loop;
    }
    public set loop(loop:boolean)
    {
        this._source.loop = !!loop;
    }

    /**
     * Gets and sets the buffer.
     * @name PIXI.sound.Sound#buffer
     * @type {AudioBuffer}
     */
    public get buffer():AudioBuffer
    {
        return this._source.buffer;
    }
    public set buffer(buffer:AudioBuffer)
    {
        this._source.buffer = buffer;
    }

    /**
     * Get the duration in seconds.
     * @name PIXI.sound.Sound#duration
     * @type {number}
     */
    public get duration():number
    {
        // @if DEBUG
        console.assert(this.isPlayable, 'Sound not yet playable, no duration');
        // @endif
        return this._source.buffer.duration;
    }

    /**
     * Get the current chained nodes object
     * @private
     * @name PIXI.sound.Sound#nodes
     * @type {PIXI.sound.SoundNodes}
     */
    public get nodes():SoundNodes
    {
        return this._nodes;
    }

    /**
     * Push the collection of filteres
     * @name PIXI.sound.Sound#filters
     * @type {PIXI.sound.SoundNodes}
     */
    public get filters(): Filter[]
    {
        return this._nodes.filters;
    }
    public set filters(filters:Filter[])
    {
        this._nodes.filters = filters;
    }

    /**
     * The playback rate where 1 is 100%
     * @name PIXI.sound.Sound#speed
     * @type {Number}
     * @default 1
     */
    public get speed():number
    {
        return this._source.playbackRate.value;
    }
    public set speed(value:number)
    {
        this._source.playbackRate.value = value;
    }

    /**
     * Gets the list of instances that are currently being played of this sound.
     * @name PIXI.sound.Sound#instances
     * @type {Array<SoundInstance>}
     * @readOnly
     */
    public get instances():Array<SoundInstance>
    {
        return this._instances;
    }

    /**
     * Plays the sound.
     * @method PIXI.sound.Sound#play
     * @param {PIXI.sound.Sound~completeCallback|object} options Either completed function or play options.
     * @param {Number} [options.start=0] Time when to play the sound in seconds.
     * @param {Number} [options.end] Time to end playing in seconds.
     * @param {Number} [options.speed] Override default speed, default to the Sound's speed setting.
     * @param {Boolean} [options.loop] Override default loop, default to the Sound's loop setting.
     * @param {PIXI.sound.Sound~completeCallback} [options.complete] Callback when complete.
     * @param {PIXI.sound.Sound~loadedCallback} [options.loaded] If the sound isn't already preloaded, callback when
     *        the audio has completely finished loading and decoded.
     * @return {PIXI.sound.SoundInstance} Current playing instance.
     */
    public play(source?:PlayOptions|CompleteCallback):SoundInstance
    {
        let options:PlayOptions;
        if (typeof source === "function")
        {
            options = {};
            options.complete = source as CompleteCallback;
        }
        else
        {
            options = source as PlayOptions;
        }
        
        options = Object.assign({
            complete: null,
            loaded: null,
            start: 0
        }, options || {});

        // @deprecated offset option
        if ((options as any).offset) {
            options.start = (options as any).offset as number;
        }

        // if not yet playable, ignore
        // - usefull when the sound download isnt yet completed
        if (!this.isPlayable)
        {
            this.autoPlay = true;
            if (!this.isLoaded)
            {
                const loaded = options.loaded;
                if (loaded)
                {
                    this.loaded = loaded;
                }
                this._beginPreload();
            }
            return;
        }

        // Stop all sounds
        if (this.singleInstance)
        {
            this._removeInstances();
        }

        // clone the bufferSource
        const instance = SoundInstance.create(this);
        this._instances.push(instance);
        this.isPlaying = true;
        instance.once('end', () => {
            if (options.complete)
            {
                options.complete(this);
            }
            this._onComplete(instance);
        });
        instance.once('stop', () => {
            this._onComplete(instance);
        });
        instance.play(
            options.start,
            options.end,
            options.speed,
            options.loop
        );
        return instance;
    }

    /**
     * Stops all the instances of this sound from playing.
     * @method PIXI.sound.Sound#stop
     * @return {PIXI.sound.Sound} Instance of this sound.
     */
    public stop():Sound
    {
        if (!this.isPlayable)
        {
            this.autoPlay = false;
            return this;
        }
        this.isPlaying = false;

        // Go in reverse order so we don't skip items
        for (let i = this._instances.length - 1; i >= 0; i--)
        {
            this._instances[i].stop();
        }
        return this;
    }

    /**
     * Stops all the instances of this sound from playing.
     * @method PIXI.sound.Sound#pause
     * @return {PIXI.sound.Sound} Instance of this sound.
     */
    public pause():Sound
    {
        for (let i = this._instances.length - 1; i >= 0; i--)
        {
            this._instances[i].paused = true;
        }
        this.isPlaying = false;
        return this;
    };

    /**
     * Resuming all the instances of this sound from playing
     * @method PIXI.sound.Sound#resume
     * @return {PIXI.sound.Sound} Instance of this sound.
     */
    public resume():Sound
    {
        for (let i = this._instances.length - 1; i >= 0; i--)
        {
            this._instances[i].paused = false;
        }
        this.isPlaying = this._instances.length > 0;
        return this;
    }

    /**
     * Starts the preloading of sound.
     * @method PIXI.sound.Sound#_beginPreload
     * @private
     */
    private _beginPreload():void
    {
        // Load from the file path
        if (this.src)
        {
            this.useXHR ? this._loadUrl() : this._loadPath();
        }
        // Load from the arraybuffer, incase it was loaded outside
        else if (this.srcBuffer)
        {
            this._decode(this.srcBuffer);
        }
        else if (this.loaded)
        {
            this.loaded(new Error("sound.src or sound.srcBuffer must be set"));
        }
        else
        {
            console.error('sound.src or sound.srcBuffer must be set');
        }
    }

    /**
     * Sound instance completed.
     * @method PIXI.sound.Sound#_onComplete
     * @private
     * @param {PIXI.sound.SoundInstance} instance
     */
    private _onComplete(instance:SoundInstance): void
    {
        if (this._instances)
        {
            const index = this._instances.indexOf(instance);
            if (index > -1)
            {
                this._instances.splice(index, 1);
            }
            this.isPlaying = this._instances.length > 0;
        }
        instance.destroy();
    }

    /**
     * Removes all instances.
     * @method PIXI.sound.Sound#_removeInstances
     * @private
     */
    private _removeInstances():void
    {
        // destroying also stops
        for (let i = this._instances.length - 1; i >= 0; i--)
        {
            this._instances[i].destroy();
        }
        this._instances.length = 0;
    }

    /**
     * Loads a sound using XHMLHttpRequest object.
     * @method PIXI.sound.Sound#_loadUrl
     * @private
     */
    private _loadUrl():void
    {
        const request = new XMLHttpRequest();
        let src:string = this.src;
        request.open('GET', src, true);
        request.responseType = 'arraybuffer';

        // Decode asynchronously
        request.onload = () => {
            this.isLoaded = true;
            this.srcBuffer = request.response as ArrayBuffer;
            this._decode(request.response);
        };

        // actually start the request
        request.send();
    }

    /**
     * Loads using the file system (NodeJS's fs module).
     * @method PIXI.sound.Sound#_loadPath
     * @private
     */
    private _loadPath()
    {
        const fs = require('fs');
        let src:string = this.src;
        fs.readFile(src, (err:Error, data:Buffer) => {
            if (err)
            {
                // @if DEBUG
                console.error(err);
                // @endif
                if (this.loaded)
                {
                    this.loaded(new Error(`File not found ${this.src}`));
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
            this._decode(arrayBuffer);
        });
    }

    /**
     * Decodes the array buffer.
     * @method PIXI.sound.Sound#decode
     * @param {ArrayBuffer} arrayBuffer From load.
     * @private
     */
    private _decode(arrayBuffer:ArrayBuffer): void
    {
        this._context.decode(arrayBuffer, (err:Error, buffer:AudioBuffer) =>
        {
                if (err)
                {
                    this.loaded(err);
                }
                else
                {
                    this.isLoaded = true;
                    this.buffer = buffer;
                    if (this.loaded)
                    {
                        this.loaded(null, this);
                    }
                    if (this.autoPlay)
                    {
                        this.play(this.complete);
                    }
                }
            }
        );
    }
}
