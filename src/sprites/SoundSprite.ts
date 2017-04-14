import BaseSound from "../bases/BaseSound";
import {CompleteCallback} from "../bases/BaseSound";
import {ISoundInstance} from '../bases/ISoundInstance';

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
 * @class SoundSprite
 * @memberof PIXI.sound
 * @param {PIXI.sound.Sound} parent The parent sound
 * @param {Object} options Data associated with object.
 * @param {Number} options.start The start time in seconds.
 * @param {Number} options.end The end time in seconds.
 * @param {Number} [options.speed] The optional speed, if not speed, uses
 *        the default speed of the parent.
 */
export default class SoundSprite
{
    /**
     * The reference sound
     * @name PIXI.sound.SoundSprite#parent
     * @type {PIXI.sound.Sound}
     * @readonly
     */
    public parent: BaseSound;

    /**
     * The starting location in seconds.
     * @name PIXI.sound.SoundSprite#start
     * @type {Number}
     * @readonly
     */
    public start: number;

    /**
     * The ending location in seconds
     * @name PIXI.sound.SoundSprite#end
     * @type {Number}
     * @readonly
     */
    public end: number;

    /**
     * The speed override where 1 is 100% speed playback.
     * @name PIXI.sound.SoundSprite#speed
     * @type {Number}
     * @readonly
     */
    public speed: number;

    /**
     * The duration of the sound in seconds.
     * @name PIXI.sound.SoundSprite#duration
     * @type {Number}
     * @readonly
     */
    public duration: number;

    /**
     * Constructor
     */
    constructor(parent: BaseSound, options: SoundSpriteData)
    {
        this.parent = parent;
        Object.assign(this, options);
        this.duration = this.end - this.start;

        // @if DEBUG
        console.assert(this.duration > 0, "End time must be after start time");
        // @endif
    }

    /**
     * Play the sound sprite.
     * @method PIXI.sound.SoundSprite#play
     * @param {PIXI.sound.Sound~completeCallback} [complete] Function call when complete
     * @return {PIXI.sound.SoundInstance|Promise<PIXI.sound.SoundInstance>} Sound instance being played.
     */
    public play(complete?: CompleteCallback): ISoundInstance|Promise<ISoundInstance>
    {
        return this.parent.play(Object.assign({
            complete,
            speed: this.speed || this.parent.speed,
            end: this.end,
            start: this.start,
        }));
    }

    /**
     * Destroy and don't use after this
     * @method PIXI.sound.SoundSprite#destroy
     */
    public destroy(): void
    {
        this.parent = null;
    }
}
