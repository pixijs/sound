import { getInstance } from "../instance";
import { WebAudioUtils } from "../webaudio";
import { Filter } from "./Filter";

/**
 * Creates a telephone-sound filter.
 *
 * @class TelephoneFilter
 * @memberof PIXI.sound.filters
 */
export class TelephoneFilter extends Filter
{
    constructor()
    {
        if (getInstance().useLegacy)
        {
            super(null);
            return;
        }

        const {audioContext} = getInstance().context;
        const lpf1 = audioContext.createBiquadFilter();
        const lpf2 = audioContext.createBiquadFilter();
        const hpf1 = audioContext.createBiquadFilter();
        const hpf2 = audioContext.createBiquadFilter();

        lpf1.type = "lowpass";
        WebAudioUtils.setParamValue(lpf1.frequency, 2000.0);

        lpf2.type = "lowpass";
        WebAudioUtils.setParamValue(lpf2.frequency, 2000.0);

        hpf1.type = "highpass";
        WebAudioUtils.setParamValue(hpf1.frequency, 500.0);

        hpf2.type = "highpass";
        WebAudioUtils.setParamValue(hpf2.frequency, 500.0);

        lpf1.connect(lpf2);
        lpf2.connect(hpf1);
        hpf1.connect(hpf2);

        super(lpf1, hpf2);
    }
}
