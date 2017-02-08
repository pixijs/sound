import Filter from './Filter';
import soundLibrary from '../index';

/**
 * Filter for adding Stereo panning.
 *
 * @class StereoFilter
 * @memberof PIXI.sound.filters
 * @param {Number} [pan=0] The amount of panning, -1 is left, 1 is right, 0 is centered.
 */
export default class StereoFilter extends Filter
{
    /**
     * The stereo panning node
     * @name PIXI.sound.filters.StereoFilter#_stereo
     * @type {StereoPannerNode}
     * @private
     */
    private _stereo:StereoPannerNode;

    /**
     * The amount of panning, -1 is left, 1 is right, 0 is centered
     * @name PIXI.sound.filters.StereoFilter#_pan
     * @type {Number}
     * @private
     */
    private _pan:number;

    constructor(pan:number = 0)
    {
        const stereo:StereoPannerNode = soundLibrary.context.audioContext.createStereoPanner();

        super(stereo);

        this._stereo = stereo;
        this.pan = pan;
    }

    /**
     * Set the amount of panning, where -1 is left, 1 is right, and 0 is centered
     * @name PIXI.sound.filters.StereoFilter#pan
     * @type {Number}
     */
    set pan(value:number)
    {
        this._pan = value;
        this._stereo.pan.value = value;
    }
    get pan(): number
    {
        return this._pan;
    }

    destroy(): void
    {
        super.destroy();
        this._stereo = null;
    }
}
