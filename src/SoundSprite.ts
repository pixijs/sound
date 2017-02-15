import Sound from './Sound';
import {CompleteCallback} from './Sound';
import SoundInstance from './SoundInstance';

export interface SoundSpriteData {
    start:number;
    end:number;
    speed?:number;
}

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
     * @readOnly
     */
    public parent:Sound;

    /**
     * The starting location in seconds.
     * @name PIXI.sound.SoundSprite#start
     * @type {Number}
     * @readOnly
     */
    public start:number;

    /**
     * The ending location in seconds
     * @name PIXI.sound.SoundSprite#end
     * @type {Number}
     * @readOnly
     */
    public end:number;

    /**
     * The speed override where 1 is 100% speed playback.
     * @name PIXI.sound.SoundSprite#speed
     * @type {Number}
     * @readOnly
     */
    public speed:number;

    /**
     * The duration of the sound in seconds.
     * @name PIXI.sound.SoundSprite#duration
     * @type {Number}
     * @readOnly
     */
    public duration:number;

    /**
     * Constructor
     */
    constructor(parent:Sound, options:SoundSpriteData)
    {
        this.parent = parent;
        Object.assign(this, options);
        this.duration = this.end - this.start;

        // @if DEBUG
        console.assert(this.duration > 0, 'End time must be after start time');
        // @endif
    }

    /**
     * Play the sound sprite.
     * @method PIXI.sound.SoundSprite#play
     * @param {PIXI.sound.Sound~completeCallback} [complete] Function call when complete
     * @return {PIXI.sound.SoundInstance} Sound instance being played.
     */
    play(complete?:CompleteCallback): SoundInstance
    {
        return this.parent.play(Object.assign({
            complete,
            speed: this.speed || this.parent.speed,
            end: this.end,
            start: this.start
        }));
    }

    /**
     * Destroy and don't use after this
     * @method PIXI.sound.SoundSprite#destroy
     */
    destroy(): void
    {
        this.parent = null;
    }
}
