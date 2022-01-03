import { getInstance } from '../instance';
import { Filter } from './Filter';

/**
 * Filter for adding reverb. Refactored from
 * https://github.com/web-audio-components/simple-reverb/
 *
 * @memberof filters
 */
class ReverbFilter extends Filter
{
    private _seconds: number;
    private _decay: number;
    private _reverse: boolean;

    /**
     * @param seconds - Seconds for reverb
     * @param decay - The decay length
     * @param reverse - Reverse reverb
     */
    constructor(seconds = 3, decay = 2, reverse = false)
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
     * @param value
     * @param min - Minimum value
     * @param max - Maximum value
     * @return Clamped number
     */
    private _clamp(value: number, min: number, max: number): number
    {
        return Math.min(max, Math.max(min, value));
    }

    /**
     * Length of reverb in seconds from 1 to 50
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

        for (let i = 0; i < length; i++)
        {
            n = this._reverse ? length - i : i;
            impulseL[i] = ((Math.random() * 2) - 1) * Math.pow(1 - (n / length), this._decay);
            impulseR[i] = ((Math.random() * 2) - 1) * Math.pow(1 - (n / length), this._decay);
        }
        const convolver = getInstance().context.audioContext.createConvolver();

        convolver.buffer = impulse;
        this.init(convolver);
    }
}

export { ReverbFilter };
