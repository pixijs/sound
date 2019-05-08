import { Ticker } from "@pixi/ticker";
import { EventEmitter } from "@pixi/utils";
import { IMediaInstance } from "../interfaces/IMediaInstance";
import { PlayOptions } from "../Sound";
import { HTMLAudioMedia } from "./HTMLAudioMedia";

let id = 0;

/**
 * Instance which wraps the `<audio>` element playback.
 * @private
 * @class HTMLAudioInstance
 * @memberof PIXI.sound.htmlaudio
 */
export class HTMLAudioInstance extends EventEmitter implements IMediaInstance
{
    /**
     * Extra padding, in seconds, to deal with low-latecy of HTMLAudio.
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance.PADDING
     * @readonly
     * @default 0.1
     */
    public static PADDING: number = 0.1;

    /**
     * The current unique ID for this instance.
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#id
     * @readonly
     */
    public readonly id: number;

    /**
     * The instance of the Audio element.
     * @type {HTMLAudioElement}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_source
     * @private
     */
    private _source: HTMLAudioElement;

    /**
     * The instance of the Audio media element.
     * @type {PIXI.sound.htmlaudio.HTMLAudioMedia}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_media
     * @private
     */
    private _media: HTMLAudioMedia;

    /**
     * Playback rate, where 1 is 100%.
     * @type {number}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_end
     * @private
     */
    private _end: number;

    /**
     * Current instance paused state.
     * @type {boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_paused
     * @private
     */
    private _paused: boolean;

    /**
     * Current instance muted state.
     * @type {boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_muted
     * @private
     */
    private _muted: boolean;

    /**
     * Current actual paused state.
     * @type {boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_pausedReal
     * @private
     */
    private _pausedReal: boolean;

    /**
     * Total length of the audio.
     * @type {number}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_duration
     * @private
     */
    private _duration: number;

    /**
     * Playback rate, where 1 is 100%.
     * @type {number}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_start
     * @private
     */
    private _start: number;

    /**
     * `true` if the audio is actually playing.
     * @type {boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_playing
     * @private
     */
    private _playing: boolean;

    /**
     * Volume for the instance.
     * @type {number}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_volume
     * @private
     */
    private _volume: number;

    /**
     * Speed for the instance.
     * @type {number}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_speed
     * @private
     */
    private _speed: number;

    /**
     * `true` for looping the playback
     * @type {boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#_loop
     * @private
     */
    private _loop: boolean;

    constructor(parent: HTMLAudioMedia)
    {
        super();

        this.id = id++;

        this.init(parent);
    }

    /**
     * Set a property by name, this makes it easy to chain values
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#set
     * @param {string} name - Values include: 'speed', 'volume', 'muted', 'loop', 'paused'
     * @param {number|boolean} value - Value to set property to
     * @return {PIXI.sound.htmlaudio.HTMLAudioInstance}
     */
    public set(name: "speed" | "volume" | "muted" | "loop" | "paused", value: number | boolean)
    {
        if (this[name] === undefined)
        {
            throw new Error(`Property with name ${name} does not exist.`);
        }
        else
        {
            this[name] = value;
        }
        return this;
    }

    /**
     * The current playback progress from 0 to 1.
     * @type {number}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#progress
     */
    public get progress(): number
    {
        const {currentTime} = this._source;
        return currentTime / this._duration;
    }

    /**
     * Pauses the sound.
     * @type {boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#paused
     */
    public get paused(): boolean
    {
        return this._paused;
    }
    public set paused(paused: boolean)
    {
        this._paused = paused;
        this.refreshPaused();
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
     * @param {PIXI.sound.htmlaudio.HTMLAudioMedia} media
     */
    public init(media: HTMLAudioMedia): void
    {
        this._playing = false;
        this._duration = media.source.duration;
        const source = this._source = media.source.cloneNode(false) as HTMLAudioElement;
        source.src = media.parent.url;
        source.onplay = this._onPlay.bind(this);
        source.onpause = this._onPause.bind(this);
        media.context.on("refresh", this.refresh, this);
        media.context.on("refreshPaused", this.refreshPaused, this);
        this._media = media;
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
     * Set the instance speed from 0 to 1
     * @member {number} PIXI.sound.htmlaudio.HTMLAudioInstance#speed
     */
    public get speed(): number
    {
        return this._speed;
    }
    public set speed(speed: number)
    {
        this._speed = speed;
        this.refresh();
    }

    /**
     * Get the set the volume for this instance from 0 to 1
     * @member {number} PIXI.sound.htmlaudio.HTMLAudioInstance#volume
     */
    public get volume(): number
    {
        return this._volume;
    }
    public set volume(volume: number)
    {
        this._volume = volume;
        this.refresh();
    }

    /**
     * If the sound instance should loop playback
     * @member {boolean} PIXI.sound.htmlaudio.HTMLAudioInstance#loop
     */
    public get loop(): boolean
    {
        return this._loop;
    }
    public set loop(loop: boolean)
    {
        this._loop = loop;
        this.refresh();
    }

    /**
     * `true` if the sound is muted
     * @member {boolean} PIXI.sound.htmlaudio.HTMLAudioInstance#muted
     */
    public get muted(): boolean
    {
        return this._muted;
    }
    public set muted(muted: boolean)
    {
        this._muted = muted;
        this.refresh();
    }

    /**
     * Call whenever the loop, speed or volume changes
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#refresh
     */
    public refresh(): void
    {
        const global = this._media.context;
        const sound = this._media.parent;

        // Update the looping
        this._source.loop = this._loop || sound.loop;

        // Update the volume
        const globalVolume = global.volume * (global.muted ? 0 : 1);
        const soundVolume = sound.volume * (sound.muted ? 0 : 1);
        const instanceVolume = this._volume * (this._muted ? 0 : 1);
        this._source.volume = instanceVolume * globalVolume * soundVolume;

        // Update the speed
        this._source.playbackRate = this._speed * global.speed * sound.speed;
    }

    /**
     * Handle changes in paused state, either globally or sound or instance
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#refreshPaused
     */
    public refreshPaused(): void
    {
        const global = this._media.context;
        const sound = this._media.parent;

        // Handle the paused state
        const pausedReal = this._paused || sound.paused || global.paused;

        if (pausedReal !== this._pausedReal)
        {
            this._pausedReal = pausedReal;

            if (pausedReal)
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
                this.play({
                    start: this._source.currentTime,
                    end: this._end,
                    volume: this._volume,
                    speed: this._speed,
                    loop: this._loop,
                });
            }

            /**
             * The sound is paused or unpaused.
             * @event PIXI.sound.htmlaudio.HTMLAudioInstance#pause
             * @property {boolean} paused If the instance was paused or not.
             */
            this.emit("pause", pausedReal);
        }
    }

    /**
     * Start playing the sound/
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#play
     */
    public play(options: PlayOptions): void
    {
        const {start, end, speed, loop, volume, muted} = options;

        if (end)
        {
            console.assert(end > start, "End time is before start time");
        }

        this._speed = speed;
        this._volume = volume;
        this._loop = !!loop;
        this._muted = muted;
        this.refresh();

        // WebAudio doesn't support looping when a duration is set
        // we'll set this just for the heck of it
        if (this.loop && end !== null)
        {
            console.warn('Looping not support when specifying an "end" time');
            this.loop = false;
        }

        this._start = start;
        this._end = end || this._duration;

        // Lets expand the start and end a little
        // to deal with the low-latecy of playing audio this way
        // this is a little fudge-factor
        this._start = Math.max(0, this._start - HTMLAudioInstance.PADDING);
        this._end = Math.min(this._end + HTMLAudioInstance.PADDING, this._duration);

        this._source.onloadedmetadata = () => {
            if (this._source)
            {
                this._source.currentTime = start;
                this._source.onloadedmetadata = null;
                this.emit("progress", start, this._duration);
                Ticker.shared.add(this._onUpdate, this);
            }
        };
        this._source.onended = this._onComplete.bind(this);
        this._source.play();

        /**
         * The sound is started.
         * @event PIXI.sound.htmlaudio.HTMLAudioInstance#start
         */
        this.emit("start");
    }

    /**
     * Handle time update on sound.
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#_onUpdate
     * @private
     */
    private _onUpdate(): void
    {
        this.emit("progress", this.progress, this._duration);
        if (this._source.currentTime >= this._end && !this._source.loop)
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
        Ticker.shared.remove(this._onUpdate, this);
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
        Ticker.shared.remove(this._onUpdate, this);
        this.removeAllListeners();

        const source = this._source;

        if (source)
        {
            // Remove the listeners
            source.onended = null;
            source.onplay = null;
            source.onpause = null;

            this._internalStop();
        }

        this._source = null;
        this._speed = 1;
        this._volume = 1;
        this._loop = false;
        this._end = null;
        this._start = 0;
        this._duration = 0;
        this._playing = false;
        this._pausedReal = false;
        this._paused = false;
        this._muted = false;

        if (this._media)
        {
            this._media.context.off("refresh", this.refresh, this);
            this._media.context.off("refreshPaused", this.refreshPaused, this);
            this._media = null;
        }
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
