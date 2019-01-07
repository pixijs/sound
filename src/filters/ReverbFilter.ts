import { getInstance } from "../instance";
import { Filter } from "./Filter";

/**
 * Filter for adding reverb. Refactored from
 * https://github.com/web-audio-components/simple-reverb/
 *
 * @class ReverbFilter
 * @memberof PIXI.sound.filters
 * @param {number} [seconds=3] Seconds for reverb
 * @param {number} [decay=2] The decay length
 * @param {boolean} [reverse=false] Reverse reverb
 */
export class ReverbFilter extends Filter
{
    /**
     * @name PIXI.sound.filters.ReverbFilter#_seconds
     * @type {number}
     * @private
     */
    private _seconds: number;

    /**
     * @name PIXI.sound.filters.ReverbFilter#_decay
     * @type {number}
     * @private
     */
    private _decay: number;

    /**
     * @name PIXI.sound.filters.ReverbFilter#_reverse
     * @type {number}
     * @private
     */
    private _reverse: boolean;

    constructor(seconds: number = 3, decay: number = 2, reverse: boolean = false)
    {
        if (getInstance().useLegacy)
        {
            super(null);
            return;
        }

        super(null);

        this._seconds = this._clamp(seconds, 1, 50);
        this._decay = this._clamp(decay, 0, 100);
        this._reverse = reverse;
        this._rebuild();
    }

    /**
     * Clamp a value
     * @method PIXI.sound.filters.ReverbFilter#_clamp
     * @private
     * @param {number} value
     * @param {number} min Minimum value
     * @param {number} max Maximum value
     * @return {number} Clamped number
     */
    private _clamp(value: number, min: number, max: number): number
    {
        return Math.min(max, Math.max(min, value));
    }

    /**
     * Length of reverb in seconds from 1 to 50
     * @name PIXI.sound.filters.ReverbFilter#decay
     * @type {number}
     * @default 3
     */
    get seconds(): number
    {
        return this._seconds;
    }
    set seconds(seconds: number)
    {
        this._seconds = this._clamp(seconds, 1, 50);
        this._rebuild();
    }

    /**
     * Decay value from 0 to 100
     * @name PIXI.sound.filters.ReverbFilter#decay
     * @type {number}
     * @default 2
     */
    get decay(): number
    {
        return this._decay;
    }
    set decay(decay: number)
    {
        this._decay = this._clamp(decay, 0, 100);
        this._rebuild();
    }

    /**
     * Reverse value from 0 to 1
     * @name PIXI.sound.filters.ReverbFilter#reverse
     * @type {boolean}
     * @default false
     */
    get reverse(): boolean
    {
        return this._reverse;
    }
    set reverse(reverse: boolean)
    {
        this._reverse = reverse;
        this._rebuild();
    }

    /**
     * Utility function for building an impulse response
     * from the module parameters.
     * @method PIXI.sound.filters.ReverbFilter#_rebuild
     * @private
     */
    private _rebuild(): void
    {
        const context = getInstance().context.audioContext;
        const rate: number = context.sampleRate;
        const length: number = rate * this._seconds;
        const impulse: AudioBuffer = context.createBuffer(2, length, rate);
        const impulseL: Float32Array = impulse.getChannelData(0);
        const impulseR: Float32Array = impulse.getChannelData(1);
        let n: number;

        for (let i: number = 0; i < length; i++)
        {
            n = this._reverse ? length - i : i;
            impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, this._decay);
            impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, this._decay);
        }
        const convolver = getInstance().context.audioContext.createConvolver();
        convolver.buffer = impulse;
        this.init(convolver);
    }
}
