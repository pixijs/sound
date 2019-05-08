import { PlayOptions } from "../Sound";
import { IMedia } from "./IMedia";

/**
 * Interface for single instance return by a Sound play call. This can either
 * be a WebAudio or HTMLAudio instance.
 * @class IMediaInstance
 * @extends PIXI.utils.EventEmitter
 * @memberof PIXI.sound
 */
export interface IMediaInstance
{
    /**
     * Auto-incrementing ID for the instance.
     * @member {number} PIXI.sound.IMediaInstance#id
     * @readonly
     */
    readonly id: number;

    /**
     * Current progress of the sound from 0 to 1
     * @member {number} PIXI.sound.IMediaInstance#progress
     * @readonly
     */
    readonly progress: number;

    /**
     * If the instance is paused, if the sound or global context
     * is paused, this could still be false.
     * @member {boolean} PIXI.sound.IMediaInstance#paused
     */
    paused: boolean;

    /**
     * Current volume of the instance. This is not the actual volume
     * since it takes into account the global context and the sound volume.
     * @member {number} PIXI.sound.IMediaInstance#volume
     */
    volume: number;

    /**
     * Current speed of the instance. This is not the actual speed
     * since it takes into account the global context and the sound volume.
     * @member {number} PIXI.sound.IMediaInstance#speed
     */
    speed: number;

    /**
     * If the current instance is set to loop
     * @member {boolean} PIXI.sound.IMediaInstance#loop
     */
    loop: boolean;

    /**
     * Set the muted state of the instance
     * @member {boolean} PIXI.sound.IMediaInstance#muted
     */
    muted: boolean;

    /**
     * Stop the current instance from playing.
     * @method PIXI.sound.IMediaInstance#stop
     */
    stop(): void;

    /**
     * Fired when the sound finishes playing.
     * @event PIXI.sound.IMediaInstance#end
     */

    /**
     * Fired when the sound starts playing.
     * @event PIXI.sound.IMediaInstance#start
     */

    /**
     * Fired when the sound when progress updates.
     * @event PIXI.sound.IMediaInstance#progress
     * @param {number} progress - Playback progress from 0 to 1
     * @param {number} duration - The total number of seconds of audio
     */

    /**
     * Fired when paused state changes.
     * @event PIXI.sound.IMediaInstance#pause
     * @param {boolean} paused - If the current state is paused
     */

    /**
     * Fired when instance is paused.
     * @event PIXI.sound.IMediaInstance#paused
     */

    /**
     * Fired when instance is resumed.
     * @event PIXI.sound.IMediaInstance#resumed
     */

    // These are used for typescript only and
    // are not accessible or part of the public API
    refresh(): void;
    refreshPaused(): void;
    init(parent: IMedia): void;
    play(options: PlayOptions): void;
    destroy(): void;
    toString(): string;
    once(event: string, fn: () => void, context?: any): this;
    on(event: string, fn: () => void, context?: any): this;
    off(event: string, fn: () => void, context?: any, once?: boolean): this;

    /**
     * Fired when the sound when progress updates.
     * @method PIXI.sound.IMediaInstance#set
     * @param {string} name - Name of property, like 'speed', 'volume', 'muted', 'loop', 'paused'
     * @param {number|boolean} value - The total number of seconds of audio
     * @return {PIXI.sound.IMediaInstance}
     * @example
     * PIXI.sound.play('foo')
     *   .set('volume', 0.5)
     *   .set('speed', 0.8);
     */
    set(name: "speed" | "volume" | "muted" | "loop" | "paused", value: number | boolean): this;
}
