import { getInstance } from '../instance';
import { WebAudioUtils } from '../webaudio/WebAudioUtils';
import { Filter } from './Filter';

/**
 * Filter for adding Stereo panning.
 *
 * @memberof filters
 */
class StereoFilter extends Filter
{
    /** The stereo panning node */
    private _stereo: StereoPannerNode;

    /** The stereo panning node */
    private _panner: PannerNode;

    /** The amount of panning, -1 is left, 1 is right, 0 is centered */
    private _pan: number;

    /** @param pan - The amount of panning, -1 is left, 1 is right, 0 is centered. */
    constructor(pan = 0)
    {
        if (getInstance().useLegacy)
        {
            super(null);

            return;
        }

        let stereo: StereoPannerNode;
        let panner: PannerNode;
        let destination: AudioNode;
        const { audioContext } = getInstance().context;

        if (audioContext.createStereoPanner)
        {
            stereo = audioContext.createStereoPanner();
            destination = stereo;
        }
        else
        {
            panner = audioContext.createPanner();
            panner.panningModel = 'equalpower';
            destination = panner;
        }

        super(destination);

        this._stereo = stereo;
        this._panner = panner;

        this.pan = pan;
    }

    /** Set the amount of panning, where -1 is left, 1 is right, and 0 is centered */
    set pan(value: number)
    {
        this._pan = value;
        if (this._stereo)
        {
            WebAudioUtils.setParamValue(this._stereo.pan, value);
        }
        else
        {
            this._panner.setPosition(value, 0, 1 - Math.abs(value));
        }
    }
    get pan(): number
    {
        return this._pan;
    }

    public destroy(): void
    {
        super.destroy();
        this._stereo = null;
        this._panner = null;
    }
}

export { StereoFilter };
