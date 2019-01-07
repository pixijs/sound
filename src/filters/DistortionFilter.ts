import { getInstance } from "../instance";
import { Filter } from "./Filter";

/**
 * Filter for adding adding delaynode.
 *
 * @class DistortionFilter
 * @memberof PIXI.sound.filters
 * @param {number} [amount=0] The amount of distoration from 0 to 1.
 */
export class DistortionFilter extends Filter
{
    /**
     * The Wave shape node use to distort
     * @name PIXI.sound.filters.DistortionFilter#_distortion
     * @type {WaveShaperNode}
     * @private
     */
    private _distortion: WaveShaperNode;

    /**
     * The amount of distoration
     * @name PIXI.sound.filters.DistortionFilter#_amount
     * @type {number}
     * @private
     */
    private _amount: number;

    constructor(amount: number = 0)
    {
        if (getInstance().useLegacy)
        {
            super(null);
            return;
        }

        const {context} = getInstance();
        const distortion: WaveShaperNode = context.audioContext.createWaveShaper();

        super(distortion);

        this._distortion = distortion;

        this.amount = amount;
    }

    /**
     * @name PIXI.sound.filters.Distoration#amount
     * @type {number}
     */
    set amount(value: number)
    {
        value *= 1000;
        this._amount = value;
        const samples: number = 44100;
        const curve: Float32Array = new Float32Array(samples);
        const deg: number = Math.PI / 180;

        let i: number = 0;
        let x: number;

        for (; i < samples; ++i)
        {
            x = i * 2 / samples - 1;
            curve[i] = (3 + value) * x * 20 * deg / (Math.PI + value * Math.abs(x));
        }
        this._distortion.curve = curve;
        this._distortion.oversample = "4x";
    }
    get amount(): number
    {
        return this._amount;
    }

    public destroy(): void
    {
        this._distortion = null;
        super.destroy();
    }
}
