import LegacySound from "./LegacySound";
import {ISoundInstance} from "../base/ISoundInstance";

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
     * The source Sound.
     * @type {SoundNodes}
     * @name PIXI.sound.legacy.LegacySoundInstance#_parent
     * @private
     */
    private _parent: LegacySound;

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
     * Playback rate, where 1 is 100%.
     * @type {Number}
     * @name PIXI.sound.legacy.LegacySoundInstance#_start
     * @private
     */
    private _start: number;

    constructor(parent: LegacySound)
    {
        super();

        this.id = id++;
        this._parent = null;

        this.init(parent);
    }

    /**
     * The current playback progress from 0 to 1.
     * @type {Number}
     * @name PIXI.sound.legacy.LegacySoundInstance#progress
     */
    public get progress(): number
    {
        const {currentTime, duration} = this._source;
        return (currentTime - this._start) / (this._end - this._start);
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
        const oldPaused = this._source.paused;

        if (paused !== this._source.paused)
        {
            this._source.pause();

            if (paused)
            {
                // pause the sounds
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
    }

    /**
     * Stops the instance.
     * @method PIXI.sound.legacy.LegacySoundInstance#_internalStop
     * @private
     */
    private _internalStop(): void
    {
        if (this._source)
        {
            this._source.onended = null;
            this._source.ontimeupdate = null;
            this._source.pause();
            this._source.currentTime = 0;
            this._source.src = "";
            this._source.load();
            this._source = null;
        }
    }

    /**
     * Initialize the instance.
     * @method PIXI.sound.legacy.LegacySoundInstance#init
     * @param {PIXI.sound.legacy.LegacySound} parent
     */
    public init(parent: LegacySound): void
    {
        this._parent = parent;
    }

    /**
     * Stop the sound playing
     * @method PIXI.sound.legacy.LegacySoundInstance#stop
     */
    public stop(): void
    {
        if (this._source)
        {
            this._internalStop();

            /**
             * The sound is stopped. Don't use after this is called.
             * @event PIXI.sound.legacy.LegacySoundInstance#stop
             */
            this.emit("stop");
        }
    }

    /**
     * Start playing the sound/
     * @method PIXI.sound.legacy.LegacySoundInstance#play
     */
    public play(start: number, end: number, speed: number, loop: boolean, fadeIn: number, fadeOut: number): void
    {
        this._source = this._parent.source.cloneNode() as HTMLAudioElement;

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
        this._end = end;
        this._source.ontimeupdate = this._onUpdate.bind(this);
        this._source.onended = this._onComplete.bind(this);
        this._source.currentTime = start;
        this._source.play();

        /**
         * The sound is started.
         * @event PIXI.sound.legacy.LegacySoundInstance#start
         */
        this.emit("start");
    }

    /**
     * Handle time update on sound.
     * @method PIXI.sound.legacy.LegacySoundInstance#_onUpdate
     * @private
     */
    private _onUpdate(): void
    {
        this.emit("progress", this.progress, this._source.duration);
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
        const duration: number = this._source ? this._source.duration : 0;
        this._internalStop();
        this.emit("progress", 1, duration);
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
        this._internalStop();
        this._end = 0;
        this._parent = null;
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
