import {EventEmitter} from 'eventemitter3';
import ChainBuilder from './ChainBuilder';

let id = 0;

/**
 * A single play instance that handles the AudioBufferSourceNode.
 * @class SoundInstance
 * @memberof PIXI.sound
 * @param {ChainBuilder} source Reference to the ChainBuilder.
 * @private
 */
export default class SoundInstance extends EventEmitter
{
    /**
     * Recycle instance, because they will be created many times.
     * @type {Array}
     * @name PIXI.sound.SoundInstance._pool
     * @static
     * @private
     */
    static _pool:Array<SoundInstance> = [];

    public id:number;
    private _chain:ChainBuilder;
    private _startTime:number;
    private _paused:boolean;
    private _currentPosition:number;
    private _source:any;

    /**
     * Recycle instance, because they will be created many times.
     * @method PIXI.sound.SoundInstance.create
     * @static
     * @private
     */
    static create(chain:ChainBuilder):SoundInstance
    {
        if (SoundInstance._pool.length > 0)
        {
            let sound = SoundInstance._pool.pop();
            sound.init(chain);
            return sound;
        }
        else
        {
            return new SoundInstance(chain);
        }
    }

    constructor(chain:ChainBuilder)
    {
        super();

        this.id = id++;

        /**
         * The source node chain.
         * @type {ChainBuilder}
         * @name PIXI.sound.SoundInstance#_chain
         * @private
         */
        this._chain = null;

        /**
         * The starting time.
         * @type {int}
         * @name PIXI.sound.SoundInstance#_startTime
         * @private
         */
        this._startTime = 0;

        /**
         * true if paused.
         * @type {Boolean}
         * @name PIXI.sound.SoundInstance#_paused
         * @private
         */
        this._paused = false;

        /**
         * The time in milliseconds to wait.
         * @type {int}
         * @name PIXI.sound.SoundInstance#_currentPosition
         * @private
         */
        this._currentPosition = 0;

        // Initialize
        this.init(chain);
    }

    /**
     * Initializes the instance.
     * @method PIXI.sound.SoundInstance#init
     * @private
     */
    init(chain:ChainBuilder): void
    {
        this._chain = chain;
    }

    /**
     * Stops the instance, don't use after this.
     * @method PIXI.sound.SoundInstance#stop
     */
    stop()
    {
        if (this._source)
        {
            this._internalStop();
            this.emit('stopped');
        }
    }

    /**
     * Stops the instance.
     * @method PIXI.sound.SoundInstance#_internalStop
     * @private
     */
    _internalStop()
    {
        if (this._source)
        {
            this._source.onended = null;
            this._source.stop();
            this._source = null;
        }
    }

    /**
     * Plays the sound.
     * @method PIXI.sound.SoundInstance#play
     * @param {Number} [offset=0] Number of seconds to offset playing.
     */
    play(offset?:number)
    {
        // console.log("SoundInstance.play", this.toString());
        this._source = this._chain.cloneBufferSource();
        this._startTime = Date.now();
        this._source.onended = this._onComplete.bind(this);
        this._source.start(0, offset || 0);
    }

    /**
     * Pauses the sound.
     * @type {Boolean}
     * @name PIXI.sound.SoundInstance#paused
     */
    get paused():boolean
    {
        return this._paused;
    }

    set paused(paused:boolean)
    {
        if (paused !== this._paused)
        {
            this._paused = paused;

            if (paused)
            {
                // pause the sounds
                this._internalStop();
                this._currentPosition = Date.now() - this._startTime;
            }
            else
            {
                // resume the playing with offset
                this.play(this._currentPosition/1000);
            }
        }
    }

    /**
     * Callback when completed.
     * @method PIXI.sound.SoundInstance#_onComplete
     * @private
     */
    _onComplete():void
    {
        // console.log("SoundInstance._onComplete", this.toString());
        if (this._source)
        {
            this._source.onended = null;
        }
        this._source = null;
        this.emit('complete', this);
    }

    /**
     * Don't use after this.
     * @method PIXI.sound.SoundInstance#destroy
     */
    destroy()
    {
        this.removeAllListeners();
        this._internalStop();
        if (this._source)
        {
            this._source.onended = null;
        }
        this._source = null;
        this._chain = null;
        this._startTime = 0;
        this._paused = false;
        this._currentPosition = 0;

        // Add it if it isn't already added
        if (SoundInstance._pool.indexOf(this) < 0)
        {
            SoundInstance._pool.push(this);
        }
    }

    /**
     * To string method for instance.
     * @method SoundInstance#toString
     * @return {String} The string representation of instance.
     * @private
     */
    toString():string
    {
        return '[SoundInstance id=' + this.id + ']';
    }
}
