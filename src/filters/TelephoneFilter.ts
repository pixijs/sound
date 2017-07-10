import Filter from './Filter';
import SoundLibrary from '../SoundLibrary';

/**
 * Creates a telephone-sound filter.
 *
 * @class TelephoneFilter
 * @memberof PIXI.sound.filters
 */
export default class TelephoneFilter extends Filter
{
    constructor()
    {
        if (SoundLibrary.instance.useLegacy)
        {
            super(null);
            return;
        }

        const {audioContext} = SoundLibrary.instance.context;
        const lpf1 = audioContext.createBiquadFilter();
        const lpf2 = audioContext.createBiquadFilter();
        const hpf1 = audioContext.createBiquadFilter();
        const hpf2 = audioContext.createBiquadFilter();

        lpf1.type = 'lowpass';
        lpf1.frequency.value = 2000.0;

        lpf2.type = 'lowpass';
        lpf2.frequency.value = 2000.0;

        hpf1.type = 'highpass';
        hpf1.frequency.value = 500.0;

        hpf2.type = 'highpass';
        hpf2.frequency.value = 500.0;

        lpf1.connect(lpf2);
        lpf2.connect(hpf1);
        hpf1.connect(hpf2);

        super(lpf1, hpf2);
    }
}
