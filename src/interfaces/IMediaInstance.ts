import { PlayOptions } from '../Sound';
import { IMedia } from './IMedia';

/**
 * Interface for single instance return by a Sound play call. This can either
 * be a WebAudio or HTMLAudio instance.
 */
interface IMediaInstance
{
    /**
     * Auto-incrementing ID for the instance.
     * @readonly
     */
    readonly id: number;

    /**
     * Current progress of the sound from 0 to 1
     * @readonly
     */
    readonly progress: number;

    /**
     * If the instance is paused, if the sound or global context
     * is paused, this could still be false.
     */
    paused: boolean;

    /**
     * Current volume of the instance. This is not the actual volume
     * since it takes into account the global context and the sound volume.
     */
    volume: number;

    /**
     * Current speed of the instance. This is not the actual speed
     * since it takes into account the global context and the sound volume.
     */
    speed: number;

    /** If the current instance is set to loop */
    loop: boolean;

    /** Set the muted state of the instance */
    muted: boolean;

    /** Stop the current instance from playing. */
    stop(): void;

    /**
     * Fired when the sound finishes playing.
     * @event end
     */

    /**
     * Fired when the sound starts playing.
     * @event start
     */

    /**
     * The sound is stopped. Don't use after this is called.
     * @event stop
     */

    /**
     * Fired when the sound when progress updates.
     * @event progress
     * @param {number} progress - Playback progress from 0 to 1
     * @param {number} duration - The total number of seconds of audio
     */

    /**
     * Fired when paused state changes.
     * @event pause
     * @param {boolean} paused - If the current state is paused
     */

    /**
     * Fired when instance is paused.
     * @event paused
     */

    /**
     * Fired when instance is resumed.
     * @event resumed
     */

    // These are used for typescript only and
    // are not accessible or part of the public API
    refresh(): void;
    refreshPaused(): void;
    init(parent: IMedia): void;
    play(options: PlayOptions): void;
    destroy(): void;
    toString(): string;
    once(event: 'pause', fn: (paused: boolean) => void, context?: any): this;
    once(event: 'progress', fn: (progress: number, duration: number) => void, context?: any): this;
    once(event: 'resumed' | 'paused' | 'start' | 'end' | 'stop', fn: () => void, context?: any): this;
    on(event: 'pause', fn: (paused: boolean) => void, context?: any): this;
    on(event: 'progress', fn: (progress: number, duration: number) => void, context?: any): this;
    on(event: 'resumed' | 'paused' | 'start' | 'end' | 'stop', fn: () => void, context?: any): this;
    off(event: 'resumed' | 'paused' | 'start' | 'end' | 'progress' | 'pause' | 'stop',
        fn?: (...args: any[]) => void, context?: any, once?: boolean): this;

    /**
     * Fired when the sound when progress updates.
     * @param name - Name of property.
     * @param value - The total number of seconds of audio
     * @example
     * import { sound } from '@pixi/sound';
     * sound.play('foo')
     *   .set('volume', 0.5)
     *   .set('speed', 0.8);
     */
    set(name: 'speed' | 'volume' | 'muted' | 'loop' | 'paused', value: number | boolean): this;
}

export type { IMediaInstance };
