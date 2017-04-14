import LegacySound from "./LegacySound";
import {ISoundInstance} from "../bases/ISoundInstance";

let id = 0;

/**
 * Instance which wraps the `<audio>` element playback.
 * @class LegacySoundInstance
 * @memberof PIXI.sound.legacy
 */
export default class LegacySoundInstance extends PIXI.utils.EventEmitter implements ISoundInstance
{
    /**
     * The current unique ID for this instance.
     * @name PIXI.sound.legacy.LegacySoundInstance#id
     * @readonly
     */
    public id: number;

    /**
     * The instance of the Audio element.
     * @type {HTMLAudioElement}
     * @name PIXI.sound.legacy.LegacySoundInstance#_source
     * @private
     */
    private _source: HTMLAudioElement;

    /**
     * Playback rate, where 1 is 100%.
     * @type {Number}
     * @name PIXI.sound.legacy.LegacySoundInstance#_end
     * @private
     */
    private _end: number;

    /**
     * Total length of the audio.
     * @type {Number}
     * @name PIXI.sound.legacy.LegacySoundInstance#_duration
     * @private
     */
    private _duration: number;

    /**
     * Playback rate, where 1 is 100%.
     * @type {Number}
     * @name PIXI.sound.legacy.LegacySoundInstance#_start
     * @private
     */
    private _start: number;

    /**
     * `true` if the audio is actually playing.
     * @type {Boolean}
     * @name PIXI.sound.legacy.LegacySoundInstance#_playing
     * @private
     */
    private _playing: boolean;

    constructor(parent: LegacySound)
    {
        super();

        this.id = id++;

        this.init(parent);
    }

    /**
     * The current playback progress from 0 to 1.
     * @type {Number}
     * @name PIXI.sound.legacy.LegacySoundInstance#progress
     */
    public get progress(): number
    {
        const {currentTime} = this._source;
        return currentTime / this._duration;
    }

    /**
     * Pauses the sound.
     * @type {Boolean}
     * @name PIXI.sound.legacy.LegacySoundInstance#paused
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
             * @event PIXI.sound.legacy.LegacySoundInstance#paused
             */
            this.emit("paused");
        }
        else
        {
            /**
             * The sound is unpaused.
             * @event PIXI.sound.legacy.LegacySoundInstance#resumed
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
         * @event PIXI.sound.legacy.LegacySoundInstance#pause
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
     * @method PIXI.sound.legacy.LegacySoundInstance#init
     * @param {PIXI.sound.legacy.LegacySound} parent
     */
    public init(parent: LegacySound): void
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
     * @method PIXI.sound.legacy.LegacySoundInstance#_internalStop
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
     * @method PIXI.sound.legacy.LegacySoundInstance#stop
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
     * @method PIXI.sound.legacy.LegacySoundInstance#play
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
        this._source.currentTime = start;
        this._source.onended = this._onComplete.bind(this);
        this._source.play();

        /**
         * The sound is started.
         * @event PIXI.sound.legacy.LegacySoundInstance#start
         */
        this.emit("start");

        this.emit("progress", 0, this._duration);
    }

    /**
     * Handle time update on sound.
     * @method PIXI.sound.legacy.LegacySoundInstance#_onUpdate
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
     * @method PIXI.sound.legacy.LegacySoundInstance#_onComplete
     * @private
     */
    private _onComplete(): void
    {
        this._internalStop();
        this.emit("progress", 1, this._duration);
        /**
         * The sound ends, don't use after this
         * @event PIXI.sound.legacy.LegacySoundInstance#end
         */
        this.emit("end", this);
    }

    /**
     * Don't use after this.
     * @method PIXI.sound.legacy.LegacySoundInstance#destroy
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
     * @method PIXI.sound.legacy.LegacySoundInstance#toString
     * @return {String} The string representation of instance.
     * @private
     */
    public toString(): string
    {
        return "[LegacySoundInstance id=" + this.id + "]";
    }
}
