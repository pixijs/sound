import WebAudioMedia from "./WebAudioMedia";
import {IMediaInstance} from "../interfaces/IMediaInstance";

let id = 0;

/**
 * A single play instance that handles the AudioBufferSourceNode.
 * @class WebAudioInstance
 * @memberof PIXI.sound.webaudio
 * @param {SoundNodes} source Reference to the SoundNodes.
 */
export default class WebAudioInstance extends PIXI.utils.EventEmitter implements IMediaInstance
{
    /**
     * The current unique ID for this instance.
     * @name PIXI.sound.webaudio.WebAudioInstance#id
     * @readonly
     */
    public id: number;

    /**
     * The source Sound.
     * @type {PIXI.sound.webaudio.WebAudioMedia}
     * @name PIXI.sound.webaudio.WebAudioInstance#_parent
     * @private
     */
    private _parent: WebAudioMedia;

    /**
     * true if paused.
     * @type {Boolean}
     * @name PIXI.sound.webaudio.WebAudioInstance#_paused
     * @private
     */
    private _paused: boolean;

    /**
     * Last update frame number.
     * @type {Number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_lastUpdate
     * @private
     */
    private _lastUpdate: number;

    /**
     * The total number of seconds elapsed in playback.
     * @type {Number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_elapsed
     * @private
     */
    private _elapsed: number;

    /**
     * The number of time in seconds to fade in.
     * @type {Number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_fadeIn
     * @private
     */
    private _fadeIn: number;

    /**
     * The number of time in seconds to fade out.
     * @type {Number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_fadeOut
     * @private
     */
    private _fadeOut: number;

    /**
     * Playback rate, where 1 is 100%.
     * @type {Number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_speed
     * @private
     */
    private _speed: number;

    /**
     * Playback rate, where 1 is 100%.
     * @type {Number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_end
     * @private
     */
    private _end: number;

    /**
     * `true` if should be looping.
     * @type {Boolean}
     * @name PIXI.sound.webaudio.WebAudioInstance#_loop
     * @private
     */
    private _loop: boolean;

    /**
     * Length of the sound in seconds.
     * @type {Number}
     * @name PIXI.sound.webaudio.WebAudioInstance#_duration
     * @private
     */
    private _duration: number;

    /**
     * The progress of the sound from 0 to 1.
     * @type {Number}
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

    constructor(parent: WebAudioMedia)
    {
        super();

        this.id = id++;
        this._parent = null;
        this._paused = false;
        this._elapsed = 0;

        // Initialize
        this.init(parent);
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
     * Plays the sound.
     * @method PIXI.sound.webaudio.WebAudioInstance#play
     * @param {Number} [start=0] The position to start playing, in seconds.
     * @param {Number} [end] The ending position in seconds.
     * @param {Number} [speed] Override the default speed.
     * @param {Boolean} [loop] Override the default loop.
     * @param {Number} [fadeIn] Time to fadein volume.
     * @param {Number} [fadeOut] Time to fadeout volume.
     */
    public play(start: number, end: number, speed: number, loop: boolean, fadeIn: number, fadeOut: number): void
    {
        // @if DEBUG
        if (end)
        {
            console.assert(end > start, "End time is before start time");
        }
        // @endif
        this._paused = false;
        this._source = this._parent.nodes.cloneBufferSource();
        if (speed !== undefined)
        {
            this._source.playbackRate.value = speed;
        }
        this._speed = this._source.playbackRate.value;
        if (loop !== undefined)
        {
            this._loop = this._source.loop = !!loop;
        }
        // WebAudio doesn't support looping when a duration is set
        // we'll set this just for the heck of it
        if (this._loop && end !== undefined)
        {
            // @if DEBUG
            console.warn('Looping not support when specifying an "end" time');
            // @endif
            this._loop = this._source.loop = false;
        }
        this._end = end;

        const duration: number = this._source.buffer.duration;

        fadeIn = this._toSec(fadeIn);

        // Clamp fadeIn to the duration
        if (fadeIn > duration)
        {
            fadeIn = duration;
        }

        // Cannot fade out for looping sounds
        if (!this._loop)
        {
            fadeOut = this._toSec(fadeOut);

            // Clamp fadeOut to the duration + fadeIn
            if (fadeOut > duration - fadeIn)
            {
                fadeOut = duration - fadeIn;
            }
        }

        this._duration = duration;
        this._fadeIn = fadeIn;
        this._fadeOut = fadeOut;
        this._lastUpdate = this._now();
        this._elapsed = start;
        this._source.onended = this._onComplete.bind(this);
        this._source.start(0, start, (end ? end - start : undefined));

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
     * @param {Number} [time] Time in either ms or sec
     * @return {Number} Time in seconds
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
     * @type {Boolean}
     * @private
     */
    private set _enabled(enabled: boolean)
    {
        this._parent.nodes.script.onaudioprocess = !enabled ? null : () => {
            this._update();
        };
    }

    /**
     * The current playback progress from 0 to 1.
     * @type {Number}
     * @name PIXI.sound.webaudio.WebAudioInstance#progress
     */
    public get progress(): number
    {
        return this._progress;
    }

    /**
     * Pauses the sound.
     * @type {Boolean}
     * @name PIXI.sound.webaudio.WebAudioInstance#paused
     */
    public get paused(): boolean
    {
        return this._paused;
    }

    public set paused(paused: boolean)
    {
        if (paused !== this._paused)
        {
            this._paused = paused;

            if (paused)
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
                this.play(
                    this._elapsed % this._duration,
                    this._end,
                    this._speed,
                    this._loop,
                    this._fadeIn,
                    this._fadeOut,
                );
            }

            /**
             * The sound is paused or unpaused.
             * @event PIXI.sound.webaudio.WebAudioInstance#pause
             * @property {Boolean} paused If the instance was paused or not.
             */
            this.emit("pause", paused);
        }
    }

    /**
     * Don't use after this.
     * @method PIXI.sound.webaudio.WebAudioInstance#destroy
     */
    public destroy(): void
    {
        this.removeAllListeners();
        this._internalStop();
        this._source = null;
        this._speed = 0;
        this._end = 0;
        this._parent = null;
        this._elapsed = 0;
        this._duration = 0;
        this._loop = false;
        this._fadeIn = 0;
        this._fadeOut = 0;
        this._paused = false;
    }

    /**
     * To string method for instance.
     * @method PIXI.sound.webaudio.WebAudioInstance#toString
     * @return {String} The string representation of instance.
     * @private
     */
    public toString(): string
    {
        return "[SoundInstance id=" + this.id + "]";
    }

    /**
     * Get the current time in seconds.
     * @method PIXI.sound.webaudio.WebAudioInstance#_now
     * @private
     * @return {Number} Seconds since start of context
     */
    private _now(): number
    {
        return this._parent.context.audioContext.currentTime;
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
                this._elapsed += delta;
                this._lastUpdate = now;
                const duration: number = this._duration;
                const progress: number = ((this._elapsed * this._speed) % duration) / duration;

                if (this._fadeIn || this._fadeOut)
                {
                    const position: number = progress * duration;
                    const gain = this._parent.nodes.gain.gain;
                    const maxVolume = this._parent.volume;

                    if (this._fadeIn)
                    {
                        if (position <= this._fadeIn && progress < 1)
                        {
                            // Manipulate the gain node directly
                            // so we can maintain the starting volume
                            gain.value = maxVolume * (position / this._fadeIn);
                        }
                        else
                        {
                            gain.value = maxVolume;
                            this._fadeIn = 0;
                        }
                    }

                    if (this._fadeOut && position >= duration - this._fadeOut)
                    {
                        const percent: number = (duration - position) / this._fadeOut;
                        gain.value = maxVolume * percent;
                    }
                }

                // Update the progress
                this._progress = progress;

                /**
                 * The sound progress is updated.
                 * @event PIXI.sound.webaudio.WebAudioInstance#progress
                 * @property {Number} progress Amount progressed from 0 to 1
                 * @property {Number} duration The total playback in seconds
                 */
                this.emit("progress", this._progress, duration);
            }
        }
    }

    /**
     * Initializes the instance.
     * @method PIXI.sound.webaudio.WebAudioInstance#init
     */
    public init(parent: WebAudioMedia): void
    {
        this._parent = parent;
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
            this._source.stop();
            this._source = null;

            // Reset the volume
            this._parent.volume = this._parent.volume;
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
