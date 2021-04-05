import { IMediaInstance } from "../interfaces";
import { CompleteCallback, Sound } from "../Sound";

// Sound sprite data setup
export interface SoundSpriteData {
    start: number;
    end: number;
    speed?: number;
}

// Collection of sound sprites
export type SoundSprites = {[id: string]: SoundSprite};

/**
 * Object that represents a single Sound's sprite.
 * @class
 */
export class SoundSprite
{
    /**
     * The reference sound
     * @readonly
     */
    public parent: Sound;

    /**
     * The starting location in seconds.
     * @readonly
     */
    public start: number;

    /**
     * The ending location in seconds
     * @readonly
     */
    public end: number;

    /**
     * The speed override where 1 is 100% speed playback.
     * @readonly
     */
    public speed: number;

    /**
     * The duration of the sound in seconds.
     * @readonly
     */
    public duration: number;

    /**
     * Whether to loop the sound sprite.
     * @readonly
     */
    public loop: boolean;

    /**
     * @param {Sound} parent - The parent sound
     * @param {Object} options - Data associated with object.
     * @param {number} options.start - The start time in seconds.
     * @param {number} options.end - The end time in seconds.
     * @param {number} [options.speed] - The optional speed, if not speed, uses
     *        the default speed of the parent.
     */
    constructor(parent: Sound, options: SoundSpriteData)
    {
        this.parent = parent;
        Object.assign(this, options);
        this.duration = this.end - this.start;

        console.assert(this.duration > 0, "End time must be after start time");
    }

    /**
     * Play the sound sprite.
     * @param {Function} [complete] - Function call when complete
     * @return Sound instance being played.
     */
    public play(complete?: CompleteCallback): IMediaInstance | Promise<IMediaInstance>
    {
        return this.parent.play({
            complete,
            speed: this.speed || this.parent.speed,
            end: this.end,
            start: this.start,
            loop: this.loop});
    }

    /** Destroy and don't use after this */
    public destroy(): void
    {
        this.parent = null;
    }
}
