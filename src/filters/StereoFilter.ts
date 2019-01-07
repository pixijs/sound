import { getInstance } from "../instance";
import { WebAudioUtils } from "../webaudio";
import { Filter } from "./Filter";

/**
 * Filter for adding Stereo panning.
 *
 * @class StereoFilter
 * @memberof PIXI.sound.filters
 * @param {number} [pan=0] The amount of panning, -1 is left, 1 is right, 0 is centered.
 */
export class StereoFilter extends Filter
{
    /**
     * The stereo panning node
     * @name PIXI.sound.filters.StereoFilter#_stereo
     * @type {StereoPannerNode}
     * @private
     */
    private _stereo: StereoPannerNode;

    /**
     * The stereo panning node
     * @name PIXI.sound.filters.StereoFilter#_panner
     * @type {PannerNode}
     * @private
     */
    private _panner: PannerNode;

    /**
     * The amount of panning, -1 is left, 1 is right, 0 is centered
     * @name PIXI.sound.filters.StereoFilter#_pan
     * @type {number}
     * @private
     */
    private _pan: number;

    constructor(pan: number = 0)
    {
        if (getInstance().useLegacy)
        {
            super(null);
            return;
        }

        let stereo: StereoPannerNode;
        let panner: PannerNode;
        let destination: AudioNode;
        const {audioContext} = getInstance().context;

        if (audioContext.createStereoPanner)
        {
            stereo = audioContext.createStereoPanner();
            destination = stereo;
        }
        else
        {
            panner = audioContext.createPanner();
            panner.panningModel = "equalpower";
            destination = panner;
        }

        super(destination);

        this._stereo = stereo;
        this._panner = panner;

        this.pan = pan;
    }

    /**
     * Set the amount of panning, where -1 is left, 1 is right, and 0 is centered
     * @name PIXI.sound.filters.StereoFilter#pan
     * @type {number}
     */
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
