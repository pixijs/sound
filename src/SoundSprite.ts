import { IMediaInstance } from './interfaces';
import { CompleteCallback, Sound } from './Sound';

/** Data for adding new sound sprites. */
interface SoundSpriteData {
    /** The start time in seconds. */
    start: number;
    /** The end time in seconds. */
    end: number;
    /** The optional speed, if not speed, uses the default speed of the parent. */
    speed?: number;
}

// Collection of sound sprites
type SoundSprites = Record<string, SoundSprite>;

/**
 * Object that represents a single Sound's sprite. To add sound sprites
 * use the {@link Sound#addSprites} method.
 * @example
 * import { sound } from '@pixi/sound';
 * sound.add('alias', {
 *   url: 'path/to/file.ogg',
 *   sprites: {
 *     blast: { start: 0, end: 0.2 },
 *     boom: { start: 0.3, end: 0.5 },
 *   },
 *   loaded() {
 *     sound.play('alias', 'blast');
 *   }
 * );
 *
 */
class SoundSprite
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
     * @param parent - The parent sound
     * @param options - Data associated with object.
     */
    constructor(parent: Sound, options: SoundSpriteData)
    {
        this.parent = parent;
        Object.assign(this, options);
        this.duration = this.end - this.start;

        // eslint-disable-next-line no-console
        console.assert(this.duration > 0, 'End time must be after start time');
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
            loop: this.loop });
    }

    /** Destroy and don't use after this */
    public destroy(): void
    {
        this.parent = null;
    }
}

export type { SoundSprites, SoundSpriteData };
export { SoundSprite };
