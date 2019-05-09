import { Ticker } from "@pixi/ticker";
import { EventEmitter } from "@pixi/utils";
import { IMediaInstance } from "../interfaces";
import { PlayOptions } from "../Sound";
import { WebAudioMedia } from "./WebAudioMedia";
import { WebAudioUtils } from "./WebAudioUtils";

let id = 0;

/**
 * A single play instance that handles the AudioBufferSourceNode.
 * @private
 * @class WebAudioInstance
 * @memberof PIXI.sound.webaudio
 * @param {SoundNodes} source Reference to the SoundNodes.
 */
export class WebAudioInstance extends EventEmitter implements IMediaInstance
{
    /**
     * The current unique ID for this instance.
     * @name PIXI.sound.webaudio.WebAudioInstance#id
     * @readonly
     */
    public readonly id: number;

    /**
     * The source Sound.
     * @type {PIXI.sound.webaudio.WebAudioMedia}
     * @name PIXI.sound.webaudio.WebAudioInstance#_media
     * @private
     */
    private _media: WebAudioMedia;

    /**
     * true if paused.
     * @type {boolean}
     * @name PIXI.sound.webaudio.WebAudioInstance#_paused
     * @private
     */
    private _paused: boolean;

    /**
     * true if muted.
     * @type {boolean}
     * @name PIXI.sound.webaudio.WebAudioInstance#_muted
     * @private
     */
    private _muted: boolean;

    /**
     * true if paused.
     * @type {boolean}
     * @name PIXI.sound.webaudio.WebAudioInstance#_pausedReal
     * @private
     */
    private _pausedReal: boolean;

    /**
     * The instance volume
     * @type {number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_volume
     * @private
     */
    private _volume: number;

    /**
     * Last update frame number.
     * @type {number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_lastUpdate
     * @private
     */
    private _lastUpdate: number;

    /**
     * The total number of seconds elapsed in playback.
     * @type {number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_elapsed
     * @private
     */
    private _elapsed: number;

    /**
     * Playback rate, where 1 is 100%.
     * @type {number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_speed
     * @private
     */
    private _speed: number;

    /**
     * Playback rate, where 1 is 100%.
     * @type {number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_end
     * @private
     */
    private _end: number;

    /**
     * `true` if should be looping.
     * @type {boolean}
     * @name PIXI.sound.webaudio.WebAudioInstance#_loop
     * @private
     */
    private _loop: boolean;

    /**
     * Gain node for controlling volume of instance
     * @type {GainNode}
     * @name PIXI.sound.webaudio.WebAudioInstance#_gain
     * @private
     */
    private _gain: GainNode;

    /**
     * Length of the sound in seconds.
     * @type {number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_duration
     * @private
     */
    private _duration: number;

    /**
     * The progress of the sound from 0 to 1.
     * @type {number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_progress
     * @private
     */
    private _progress: number;

    /**
     * Audio buffer source clone from Sound object.
     * @type {AudioBufferSourceNode}
     * @name PIXI.sound.webaudio.WebAudioInstance#_source
     * @private
     */
    private _source: AudioBufferSourceNode;

    constructor(media: WebAudioMedia)
    {
        super();

        this.id = id++;
        this._media = null;
        this._paused = false;
        this._muted = false;
        this._elapsed = 0;

        // Initialize
        this.init(media);
    }

    /**
     * Set a property by name, this makes it easy to chain values
     * @method PIXI.sound.webaudio.WebAudioInstance#set
     * @param {string} name - Values include: 'speed', 'volume', 'muted', 'loop', 'paused'
     * @param {number|boolean} value - Value to set property to
     * @return {PIXI.sound.webaudio.WebAudioInstance}
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
     * Stops the instance, don't use after this.
     * @method PIXI.sound.webaudio.WebAudioInstance#stop
     */
    public stop(): void
    {
        if (this._source)
        {
            this._internalStop();

            /**
             * The sound is stopped. Don't use after this is called.
             * @event PIXI.sound.webaudio.WebAudioInstance#stop
             */
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
        this._update(true); // update progress
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
     * Refresh loop, volume and speed based on changes to parent
     * @method PIXI.sound.webaudio.WebAudioInstance#refresh
     */
    public refresh(): void
    {
        // Sound could be paused
        if (!this._source) {
            return;
        }
        const global = this._media.context;
        const sound = this._media.parent;

        // Updating looping
        this._source.loop = this._loop || sound.loop;

        // Update the volume
        const globalVolume = global.volume * (global.muted ? 0 : 1);
        const soundVolume = sound.volume * (sound.muted ? 0 : 1);
        const instanceVolume = this._volume * (this._muted ? 0 : 1);
        WebAudioUtils.setParamValue(this._gain.gain, instanceVolume * soundVolume * globalVolume);

        // Update the speed
        WebAudioUtils.setParamValue(this._source.playbackRate, this._speed * sound.speed * global.speed);
    }

    /**
     * Handle changes in paused state, either globally or sound or instance
     * @method PIXI.sound.webaudio.WebAudioInstance#refreshPaused
     */
    public refreshPaused(): void
    {
        const global = this._media.context;
        const sound = this._media.parent;

        // Consider global and sound paused
        const pausedReal = this._paused || sound.paused || global.paused;

        if (pausedReal !== this._pausedReal)
        {
            this._pausedReal = pausedReal;

            if (pausedReal)
            {
                // pause the sounds
                this._internalStop();

                /**
                 * The sound is paused.
                 * @event PIXI.sound.webaudio.WebAudioInstance#paused
                 */
                this.emit("paused");
            }
            else
            {
                /**
                 * The sound is unpaused.
                 * @event PIXI.sound.webaudio.WebAudioInstance#resumed
                 */
                this.emit("resumed");

                // resume the playing with offset
                this.play({
                    start: this._elapsed % this._duration,
                    end: this._end,
                    speed: this._speed,
                    loop: this._loop,
                    volume: this._volume,
                });
            }

            /**
             * The sound is paused or unpaused.
             * @event PIXI.sound.webaudio.WebAudioInstance#pause
             * @property {boolean} paused If the instance was paused or not.
             */
            this.emit("pause", pausedReal);
        }
    }

    /**
     * Plays the sound.
     * @method PIXI.sound.webaudio.WebAudioInstance#play
     * @param {Object} options Play options
     * @param {number} options.start The position to start playing, in seconds.
     * @param {number} options.end The ending position in seconds.
     * @param {number} options.speed Speed for the instance
     * @param {boolean} options.loop If the instance is looping, defaults to sound loop
     * @param {number} options.volume Volume of the instance
     * @param {boolean} options.muted Muted state of instance
     */
    public play(options: PlayOptions): void
    {
        const {start, end, speed, loop, volume, muted} = options;

        if (end)
        {
            console.assert(end > start, "End time is before start time");
        }
        this._paused = false;
        const {source, gain} = this._media.nodes.cloneBufferSource();

        this._source = source;
        this._gain = gain;
        this._speed = speed;
        this._volume = volume;
        this._loop = !!loop;
        this._muted = muted;
        this.refresh();

        const duration: number = this._source.buffer.duration;
        this._duration = duration;
        this._end = end;
        this._lastUpdate = this._now();
        this._elapsed = start;
        this._source.onended = this._onComplete.bind(this);

        if (this._loop)
        {
            this._source.loopEnd = end;
            this._source.loopStart = start;
            this._source.start(0, start);
        }
        else if (end)
        {
            this._source.start(0, start, end - start);
        }
        else
        {
            this._source.start(0, start);
        }

        /**
         * The sound is started.
         * @event PIXI.sound.webaudio.WebAudioInstance#start
         */
        this.emit("start");

        // Do an update for the initial progress
        this._update(true);

        // Start handling internal ticks
        this._enabled = true;
    }

    /**
     * Utility to convert time in millseconds or seconds
     * @method PIXI.sound.webaudio.WebAudioInstance#_toSec
     * @private
     * @param {number} [time] Time in either ms or sec
     * @return {number} Time in seconds
     */
    private _toSec(time?: number): number
    {
        if (time > 10)
        {
            time /= 1000;
        }
        return time || 0;
    }

    /**
     * Start the update progress.
     * @name PIXI.sound.webaudio.WebAudioInstance#_enabled
     * @type {boolean}
     * @private
     */
    private set _enabled(enabled: boolean)
    {
        Ticker.shared.remove(this._updateListener, this);
        if (enabled)
        {
            Ticker.shared.add(this._updateListener, this);
        }
    }

    /**
     * The current playback progress from 0 to 1.
     * @type {number}
     * @name PIXI.sound.webaudio.WebAudioInstance#progress
     */
    public get progress(): number
    {
        return this._progress;
    }

    /**
     * Pauses the sound.
     * @type {boolean}
     * @name PIXI.sound.webaudio.WebAudioInstance#paused
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
     * Don't use after this.
     * @method PIXI.sound.webaudio.WebAudioInstance#destroy
     */
    public destroy(): void
    {
        this.removeAllListeners();
        this._internalStop();
        if (this._gain)
        {
            this._gain.disconnect();
            this._gain = null;
        }
        if (this._media)
        {
            this._media.context.events.off("refresh", this.refresh, this);
            this._media.context.events.off("refreshPaused", this.refreshPaused, this);
            this._media = null;
        }
        this._end = null;
        this._speed = 1;
        this._volume = 1;
        this._loop = false;
        this._elapsed = 0;
        this._duration = 0;
        this._paused = false;
        this._muted = false;
        this._pausedReal = false;
    }

    /**
     * To string method for instance.
     * @method PIXI.sound.webaudio.WebAudioInstance#toString
     * @return {string} The string representation of instance.
     * @private
     */
    public toString(): string
    {
        return "[WebAudioInstance id=" + this.id + "]";
    }

    /**
     * Get the current time in seconds.
     * @method PIXI.sound.webaudio.WebAudioInstance#_now
     * @private
     * @return {number} Seconds since start of context
     */
    private _now(): number
    {
        return this._media.context.audioContext.currentTime;
    }

    /**
     * Callback for update listener
     * @type {Function}
     * @name PIXI.sound.webaudio.WebAudioInstance#_updateListener
     * @private
     */
    private _updateListener() {
        this._update();
    }

    /**
     * Internal update the progress.
     * @method PIXI.sound.webaudio.WebAudioInstance#_update
     * @private
     */
    private _update(force: boolean = false): void
    {
        if (this._source)
        {
            const now: number = this._now();
            const delta: number = now - this._lastUpdate;

            if (delta > 0 || force)
            {
                const speed: number = this._source.playbackRate.value;
                this._elapsed += delta * speed;
                this._lastUpdate = now;
                const duration: number = this._duration;
                let progress: number;
                if (this._source.loopStart)
                {
                    const soundLength = this._source.loopEnd - this._source.loopStart;
                    progress = (this._source.loopStart + this._elapsed % soundLength) / duration;
                }
                else
                {
                    progress = (this._elapsed % duration) / duration;
                }

                // Update the progress
                this._progress = progress;

                /**
                 * The sound progress is updated.
                 * @event PIXI.sound.webaudio.WebAudioInstance#progress
                 * @property {number} progress Amount progressed from 0 to 1
                 * @property {number} duration The total playback in seconds
                 */
                this.emit("progress", this._progress, duration);
            }
        }
    }

    /**
     * Initializes the instance.
     * @method PIXI.sound.webaudio.WebAudioInstance#init
     */
    public init(media: WebAudioMedia): void
    {
        this._media = media;
        media.context.events.on("refresh", this.refresh, this);
        media.context.events.on("refreshPaused", this.refreshPaused, this);
    }

    /**
     * Stops the instance.
     * @method PIXI.sound.webaudio.WebAudioInstance#_internalStop
     * @private
     */
    private _internalStop(): void
    {
        if (this._source)
        {
            this._enabled = false;
            this._source.onended = null;
            this._source.stop(0); // param needed for iOS 8 bug
            this._source.disconnect();
            this._source = null;
        }
    }

    /**
     * Callback when completed.
     * @method PIXI.sound.webaudio.WebAudioInstance#_onComplete
     * @private
     */
    private _onComplete(): void
    {
        if (this._source)
        {
            this._enabled = false;
            this._source.onended = null;
            this._source.disconnect();
        }
        this._source = null;
        this._progress = 1;
        this.emit("progress", 1, this._duration);
        /**
         * The sound ends, don't use after this
         * @event PIXI.sound.webaudio.WebAudioInstance#end
         */
        this.emit("end", this);
    }
}
