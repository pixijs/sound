import HTMLAudioMedia from "./HTMLAudioMedia";
import {IMediaInstance} from "../interfaces/IMediaInstance";

let id = 0;

/**
 * Instance which wraps the `<audio>` element playback.
 * @class HTMLAudioInstance
 * @memberof PIXI.sound.legacy
 */
export default class HTMLAudioInstance extends PIXI.utils.EventEmitter implements IMediaInstance
{
    /**
     * The current unique ID for this instance.
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#id
     * @readonly
     */
    public id: number;

    /**
     * The instance of the Audio element.
     * @type {HTMLAudioElement}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_source
     * @private
     */
    private _source: HTMLAudioElement;

    /**
     * Playback rate, where 1 is 100%.
     * @type {Number}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_end
     * @private
     */
    private _end: number;

    /**
     * Total length of the audio.
     * @type {Number}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_duration
     * @private
     */
    private _duration: number;

    /**
     * Playback rate, where 1 is 100%.
     * @type {Number}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_start
     * @private
     */
    private _start: number;

    /**
     * `true` if the audio is actually playing.
     * @type {Boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_playing
     * @private
     */
    private _playing: boolean;

    constructor(parent: HTMLAudioMedia)
    {
        super();

        this.id = id++;

        this.init(parent);
    }

    /**
     * The current playback progress from 0 to 1.
     * @type {Number}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#progress
     */
    public get progress(): number
    {
        const {currentTime} = this._source;
        return currentTime / this._duration;
    }

    /**
     * Pauses the sound.
     * @type {Boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#paused
     */
    public get paused(): boolean
    {
        return this._source.paused;
    }

    public set paused(paused: boolean)
    {
        if (paused !== this._source.paused)
        {
            // Do nothing, no pause change
            return;
        }

        if (paused)
        {
            this._internalStop();

            /**
             * The sound is paused.
             * @event PIXI.sound.htmlaudio.HTMLAudioInstance#paused
             */
            this.emit("paused");
        }
        else
        {
            /**
             * The sound is unpaused.
             * @event PIXI.sound.htmlaudio.HTMLAudioInstance#resumed
             */
            this.emit("resumed");

            // resume the playing with offset
            this.play(
                this._source.currentTime,
                this._end,
                1,
                this._source.loop,
                0,
                0,
            );
        }

        /**
         * The sound is paused or unpaused.
         * @event PIXI.sound.htmlaudio.HTMLAudioInstance#pause
         * @property {Boolean} paused If the instance was paused or not.
         */
        this.emit("pause", paused);
    }

    /**
     * Reference: http://stackoverflow.com/a/40370077
     */
    private _onPlay(): void
    {
        this._playing = true;
    }

    /**
     * Reference: http://stackoverflow.com/a/40370077
     */
    private _onPause(): void
    {
        this._playing = false;
    }

    /**
     * Initialize the instance.
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#init
     * @param {PIXI.sound.htmlaudio.HTMLAudioMedia} parent
     */
    public init(parent: HTMLAudioMedia): void
    {
        this._playing = false;
        this._duration = parent.source.duration;
        const source = this._source = parent.source.cloneNode() as HTMLAudioElement;
        source.ontimeupdate = this._onUpdate.bind(this);
        source.onplay = this._onPlay.bind(this);
        source.onpause = this._onPause.bind(this);
    }

    /**
     * Stop the sound playing
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#_internalStop
     * @private
     */
    private _internalStop(): void
    {
        if (this._source && this._playing)
        {
            this._source.onended = null;
            this._source.pause();
        }
    }

    /**
     * Stop the sound playing
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#stop
     */
    public stop(): void
    {
        this._internalStop();

        if (this._source)
        {
            this.emit("stop");
        }
    }

    /**
     * Start playing the sound/
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#play
     */
    public play(start: number, end: number, speed: number, loop: boolean, fadeIn: number, fadeOut: number): void
    {
        // @if DEBUG
        if (end)
        {
            console.assert(end > start, "End time is before start time");
        }
        // @endif
        if (loop !== undefined)
        {
            this._source.loop = loop;
        }

        // WebAudio doesn't support looping when a duration is set
        // we'll set this just for the heck of it
        if (loop === true && end !== undefined)
        {
            // @if DEBUG
            console.warn('Looping not support when specifying an "end" time');
            // @endif
            this._source.loop = false;
        }
        
        this._start = start;
        this._end = end || this._duration;
        this._source.onloadedmetadata = () => {
            this._source.currentTime = start;
            this._source.onloadedmetadata = null;
        };
        this._source.onended = this._onComplete.bind(this);
        this._source.play();

        /**
         * The sound is started.
         * @event PIXI.sound.htmlaudio.HTMLAudioInstance#start
         */
        this.emit("start");

        this.emit("progress", 0, this._duration);
    }

    /**
     * Handle time update on sound.
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#_onUpdate
     * @private
     */
    private _onUpdate(): void
    {
        this.emit("progress", this.progress, this._duration);
        if (this._source.currentTime >= this._end)
        {
            this._onComplete();
        }
    }

    /**
     * Callback when completed.
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#_onComplete
     * @private
     */
    private _onComplete(): void
    {
        this._internalStop();
        this.emit("progress", 1, this._duration);
        /**
         * The sound ends, don't use after this
         * @event PIXI.sound.htmlaudio.HTMLAudioInstance#end
         */
        this.emit("end", this);
    }

    /**
     * Don't use after this.
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#destroy
     */
    public destroy(): void
    {
        this.removeAllListeners();

        const source = this._source;

        if (source)
        {
            // Remove the listeners
            source.onended = null;
            source.ontimeupdate = null;
            source.onplay = null;
            source.onpause = null;

            this._internalStop();
        }

        this._source = null;

        this._end = 0;
        this._start = 0;
        this._duration = 0;
        this._playing = false;
    }

    /**
     * To string method for instance.
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#toString
     * @return {String} The string representation of instance.
     * @private
     */
    public toString(): string
    {
        return "[HTMLAudioInstance id=" + this.id + "]";
    }
}
