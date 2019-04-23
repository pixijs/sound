import { Filter } from "../filters";

/**
 * Represents the audio context for playing back sounds. This can
 * represent either an HTML or WebAudio context.
 * @class IMediaContext
 * @memberof PIXI.sound
 */
export interface IMediaContext
{
    /**
     * `true` if all sounds are muted
     * @member {boolean} PIXI.sound.IMediaContext#muted
     */
    muted: boolean;

    /**
     * Volume to apply to all sounds
     * @member {number} PIXI.sound.IMediaContext#volume
     */
    volume: number;

    /**
     * The speed of all sounds
     * @member {number} PIXI.sound.IMediaContext#speed
     */
    speed: number;

    /**
     * Set the paused state for all sounds
     * @member {boolean} PIXI.sound.IMediaContext#paused
     */
    paused: boolean;

    /**
     * Collection of global filters
     * @member {Array<PIXI.sound.filters.Filter>} PIXI.sound.IMediaContext#filters
     */
    filters: Filter[];

    /**
     * Toggle mute for all sounds
     * @method PIXI.sound.IMediaContext#toggleMute
     */
    toggleMute(): boolean;

    /**
     * Toggle pause for all sounds
     * @method PIXI.sound.IMediaContext#togglePause
     */
    togglePause(): boolean;

    /**
     * Dispatches event to refresh the paused state of playing instances.
     * @method PIXI.sound.IMediaContext#refreshPaused
     * @private
     */
    refreshPaused(): void;

    /**
     * Dispatch event to refresh all instances volume, mute, etc.
     * @method PIXI.sound.IMediaContext#refresh
     * @private
     */
    refresh(): void;

    /**
     * Destroy the context and don't use after this.
     * @method PIXI.sound.IMediaContext#destroy
     */
    destroy(): void;

    /**
     * Reference to the Web Audio API AudioContext element, if Web Audio is available
     * @member {AudioContext} PIXI.sound.IMediaContext#audioContext
     */
    audioContext: AudioContext;
}
