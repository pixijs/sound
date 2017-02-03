import SoundContext from './SoundContext';
import ChainBuilder from './ChainBuilder';
import SoundInstance from './SoundInstance';
import soundLibrary from './index';
import * as path from 'path';

export interface Options {
    autoPlay?:boolean;
    preaload?:boolean;
    block?:boolean;
    volume?:number;
    panning?:number;
    complete?:CompleteCallback;
    loaded?:LoadedCallback;
    preload?:boolean;
    loop?:boolean;
    src?:string;
    srcBuffer?:ArrayBuffer;
    useXHR?:boolean;
}

export interface PlayOptions {
    offset?:number;
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
    public isLoaded:boolean;
    public isPlaying:boolean;
    public autoPlay:boolean;
    public complete:CompleteCallback;
    public loaded:LoadedCallback;
    public block:boolean;
    public preload:boolean;
    public src:string;
    public srcBuffer:ArrayBuffer;
    public useXHR:boolean;
    private _context:SoundContext;
    private _ctx:AudioContext;
    private _chain:ChainBuilder;
    private _instances:Array<SoundInstance>;
    private _source:any;
    private _gainNode:any;
    private _analyser:any;
    private _panner:any;

    /**
     * Create a new sound instance from source.
     * @method PIXI.sound.Sound.from
     * @param {ArrayBuffer|String|Object} options Either the path or url to the source file.
     *        or the object of options to use.
     * @param {ArrayBuffer|String} [options.src] If `options` is an object, the source of file.
     * @param {Boolean} [options.autoPlay=false] true to play after loading.
     * @param {Boolean} [options.preload=false] true to immediately start preloading.
     * @param {Boolean} [options.block=false] true to only play one instance of the sound at a time.
     * @param {Number} [options.volume=1] The amount of volume 1 = 100%.
     * @param {Boolean} [options.useXHR=true] true to use XMLHttpRequest to load the sound. Default is false, loaded with NodeJS's `fs` module.
     * @param {Number} [options.panning=0] The panning amount from -1 (left) to 1 (right).
     * @param {PIXI.sound.Sound~completeCallback} [options.complete=null] Global complete callback when play is finished.
     * @param {PIXI.sound.Sound~loadedCallback} [options.loaded=null] Call when finished loading.
     * @param {Boolean} [options.loop=false] true to loop the audio playback.
     * @return {PIXI.sound.Sound} Created sound instance.
     */
    static from(options:string|Options|ArrayBuffer): Sound
    {
        return new Sound(soundLibrary.context, options);
    }

    constructor(context:SoundContext, options:string|Options|ArrayBuffer)
    {
        if (typeof options === "string" || options instanceof ArrayBuffer)
        {
            options = {src: <string>options};
        }
        else if (options instanceof ArrayBuffer)
        {
            options = {srcBuffer: <ArrayBuffer>options};
        }

        // Default settings
        options = Object.assign({
            autoPlay: false,
            block: false,
            src: null,
            preload: false,
            volume: 1,
            panning: 0,
            complete: null,
            loaded: null,
            loop: false,
            useXHR: true
        }, options || {});

        /**
         * Reference to the sound context.
         * @name PIXI.sound.Sound#_context
         * @type {SoundContext}
         * @private
         */
        this._context = context;

        /**
         * Reference to the WebAudio API AudioContext.
         * @name PIXI.sound.Sound#_ctx
         * @type {AudioContext}
         * @private
         */
        this._ctx = this._context.audioContext;

        /**
         * Instance of the chain builder.
         * @name PIXI.sound.Sound#_chain
         * @type {ChainBuilder}
         * @private
         */
        this._chain = new ChainBuilder(this._ctx)
            .bufferSource()
            .gainNode()
            .analyser()
            .panner();

        /**
         * `true` if the buffer is loaded.
         * @name PIXI.sound.Sound#isLoaded
         * @type {Boolean}
         * @default false
         */
        this.isLoaded = false;

        /**
         * `true` if the sound is currently being played.
         * @name PIXI.sound.Sound#isPlaying
         * @type {Boolean}
         * @default false
         * @readOnly
         */
        this.isPlaying = false;

        /**
         * true to start playing immediate after load.
         * @name PIXI.sound.Sound#autoPlay
         * @type {Boolean}
         * @private
         * @default false
         * @readOnly
         */
        this.autoPlay = (<Options>options).autoPlay;

        /**
         * `true` to block successive plays.
         * @name PIXI.sound.Sound#block
         * @type {Boolean}
         * @default false
         */
        this.block = (<Options>options).block;

        /**
         * `true` to immediately start preloading.
         * @name PIXI.sound.Sound#preload
         * @type {Boolean}
         * @default false
         * @readOnly
         */
        this.preload = (<Options>options).preload;

        /**
         * Callback when finished playing.
         * @name PIXI.sound.Sound#complete
         * @type {PIXI.sound.Sound~completeCallback}
         * @default false
         */
        this.complete = (<Options>options).complete;

        /**
         * Callback when load is finished.
         * @type {PIXI.sound.Sound~loadedCallback}
         * @name PIXI.sound.Sound#loaded
         * @readOnly
         */
        this.loaded = (<Options>options).loaded;

        /**
         * The file source to load.
         * @name PIXI.sound.Sound#src
         * @type {String}
         * @readOnly
         */
        this.src = (<Options>options).src;

        /**
         * The file buffer to load.
         * @name PIXI.sound.Sound#srcBuffer
         * @type {ArrayBuffer}
         * @readOnly
         */
        this.srcBuffer = (<Options>options).srcBuffer;

        /**
         * `true` to use XMLHttpRequest object to load.
         * Default is to use NodeJS's fs module to read the sound.
         * @name PIXI.sound.Sound#useXHR
         * @type {Boolean}
         * @default false
         */
        this.useXHR = (<Options>options).useXHR;

        /**
         * The collection of instances being played.
         * @name PIXI.sound.Sound#_instances
         * @type {Array<SoundInstance>}
         * @private
         */
        this._instances = [];

        // connect this._chain.last() node to this._context._entryNode()
        this._chain.last().connect(this._context._entryNode());

        // create some alias
        this._source = this._chain.nodes().bufferSource;
        this._gainNode = this._chain.nodes().gainNode;
        this._analyser = this._chain.nodes().analyser;
        this._panner = this._chain.nodes().panner;

        // @if DEBUG
        // sanity check
        console.assert(this._source, "No bufferSource: not yet supported");
        console.assert(this._gainNode, "No gainNode: not yet supported");
        console.assert(this._analyser, "No analyser: not yet supported");
        console.assert(this._panner, "No panner: not yet supported");
        // @endif

        this.volume = (<Options>options).volume;
        this.panning = (<Options>options).panning;
        this.loop = (<Options>options).loop;

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
        // disconnect from this._context
        this._chain.last().disconnect();

        // destroy this._chain
        this._chain.destroy();
        this._chain = null;
        this._context = null;
        this._ctx = null;

        this._source = null;
        this._removeInstances();
        this._instances = null;
    }

    public get isPlayable():boolean
    {
        return this.isLoaded && !!this._source && !!this._source.buffer;
    }

    /**
     * Getter of the chain nodes.
     * @name PIXI.sound.Sound#nodes
     * @type {Object}
     * @readOnly
     */
    public get nodes():Object
    {
        return this._chain.nodes();
    }

    /**
     * Gets and sets the volume.
     * @name PIXI.sound.Sound#volume
     * @type {Number}
     */
    public get volume():number
    {
        return this._gainNode.gain.value;
    }
    public set volume(volume:number)
    {
        this._gainNode.gain.value = volume;
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
     * Gets and sets the panning -1 (full left pan) and 1 (full right pan).
     * @name PIXI.sound.Sound#panning
     * @type {Number}
     * @default 0
     */
    public get panning():number
    {
        return this._panner.pan;
    }
    public set panning(pan:number)
    {
        this._panner.pan.value = pan;
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
     * @param {Number} [options.offset=0] time when to play the sound in seconds.
     * @param {PIXI.sound.Sound~completeCallback} [options.complete] Callback when complete.
     * @param {PIXI.sound.Sound~loadedCallback} [options.loaded] If the sound isn't already preloaded, callback when
     *        the audio has completely finished loading and decoded.
     * @return {PIXI.sound.SoundInstance} Current playing instance.
     */
    public play(options?:PlayOptions|CompleteCallback):SoundInstance
    {
        if (typeof options === "function")
        {
            options = { complete: <CompleteCallback>options };
        }
        options = Object.assign({
            complete: null,
            loaded: null,
            offset: 0
        }, options || {});

        // if not yet playable, ignore
        // - usefull when the sound download isnt yet completed
        if (!this.isPlayable)
        {
            this.autoPlay = true;
            if (!this.isLoaded)
            {
                const loaded = (<PlayOptions>options).loaded;
                if (loaded)
                {
                    this.loaded = loaded;
                }
                this._beginPreload();
            }
            return;
        }

        // Stop all sounds
        if (this.block)
        {
            this._removeInstances();
        }

        // clone the bufferSource
        const instance = SoundInstance.create(this._chain);
        this._instances.push(instance);
        this.isPlaying = true;
        instance.once('end', () => {
            if ((<PlayOptions>options).complete)
            {
                (<PlayOptions>options).complete(this);
            }
            this._onComplete(instance);
        });
        instance.once('stop', () => {
            this._onComplete(instance);
        });
        instance.play((<PlayOptions>options).offset);
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
        fs.readFile(src, (err, data) => {
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
        this._ctx.decodeAudioData(
            arrayBuffer, (buffer) => {
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
            },
            () => {
                this.loaded(new Error('Unable to decode file'));
            }
        );
    }
}
