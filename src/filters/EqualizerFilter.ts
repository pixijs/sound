import Filter from './Filter';
import soundLibrary from '../index';

interface Band {
    f:number;
    type:string;
    gain:number;
}

/**
 * Filter for adding equalizer bands.
 *
 * @class EqualizerFilter
 * @memberof PIXI.sound.filters
 * @param {number} [f32=0] Default gain for 32 Hz
 * @param {number} [f64=0] Default gain for 64 Hz
 * @param {number} [f125=0] Default gain for 125 Hz
 * @param {number} [f250=0] Default gain for 250 Hz
 * @param {number} [f500=0] Default gain for 500 Hz
 * @param {number} [f1k=0] Default gain for 1000 Hz
 * @param {number} [f2k=0] Default gain for 2000 Hz
 * @param {number} [f4k=0] Default gain for 4000 Hz
 * @param {number} [f8k=0] Default gain for 8000 Hz
 * @param {number} [f16k=0] Default gain for 16000 Hz
 */
export default class EqualizerFilter extends Filter
{
    /**
     * Band at 32 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F32
     * @type {Number}
     * @readOnly
     */
    public static F32:number = 32;

    /**
     * Band at 64 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F64
     * @type {Number}
     * @readOnly
     */
    public static F64:number = 64;
    
    /**
     * Band at 125 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F125
     * @type {Number}
     * @readOnly
     */
    public static F125:number = 125;
    
    /**
     * Band at 250 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F250
     * @type {Number}
     * @readOnly
     */
    public static F250:number = 250;
    
    /**
     * Band at 500 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F500
     * @type {Number}
     * @readOnly
     */
    public static F500:number = 500;
    
    /**
     * Band at 1000 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F1K
     * @type {Number}
     * @readOnly
     */
    public static F1K:number = 1000;
    
    /**
     * Band at 2000 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F2K
     * @type {Number}
     * @readOnly
     */
    public static F2K:number = 2000;
    
    /**
     * Band at 4000 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F4K
     * @type {Number}
     * @readOnly
     */
    public static F4K:number = 4000;
    
    /**
     * Band at 8000 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F8K
     * @type {Number}
     * @readOnly
     */
    public static F8K:number = 8000;
    
    /**
     * Band at 16000 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F16K
     * @type {Number}
     * @readOnly
     */
    public static F16K:number = 16000;

    /**
     * The list of bands 
     * @name PIXI.sounds.filters.EqualizerFilter#bands
     * @type {BiquadFilterNode[]}
     * @readOnly
     */
    public bands:BiquadFilterNode[];

    /**
     * The map of bands to frequency
     * @name PIXI.sounds.filters.EqualizerFilter#bandsMap
     * @type {Object}
     * @readOnly
     */
    public bandsMap:{[id:number]:BiquadFilterNode};

    constructor(f32:number = 0, f64:number = 0, f125:number = 0, f250:number = 0, f500:number = 0,
        f1k:number = 0, f2k:number = 0, f4k:number = 0, f8k:number = 0, f16k:number = 0)
    {
        const equalizerBands:Band[] = [
            {
                f: EqualizerFilter.F32,
                type: 'lowshelf',
                gain: f32
            },
            {
                f: EqualizerFilter.F64,
                type: 'peaking',
                gain: f64
            },
            {
                f: EqualizerFilter.F125,
                type: 'peaking',
                gain: f125
            },
            {
                f: EqualizerFilter.F250,
                type: 'peaking',
                gain: f250
            },
            {
                f: EqualizerFilter.F500,
                type: 'peaking',
                gain: f500
            },
            {
                f: EqualizerFilter.F1K,
                type: 'peaking',
                gain: f1k
            },
            {
                f: EqualizerFilter.F2K,
                type: 'peaking',
                gain: f2k
            },
            {
                f: EqualizerFilter.F4K,
                type: 'peaking',
                gain: f4k
            },
            {
                f: EqualizerFilter.F8K,
                type: 'peaking',
                gain: f8k
            },
            {
                f: EqualizerFilter.F16K,
                type: 'highshelf',
                gain: f16k
            }
        ];

        
        const bands:BiquadFilterNode[] = equalizerBands.map(function (band:Band)
        {
            const filter:BiquadFilterNode = soundLibrary.context.audioContext.createBiquadFilter();
            filter.type = band.type as BiquadFilterType;
            filter.gain.value = band.gain;
            filter.Q.value = 1;
            filter.frequency.value = band.f;
            return filter;
        });

        // Setup the constructor AudioNode, where first is the input, and last is the output
        super(bands[0], bands[bands.length - 1]);

        // Manipulate the bands
        this.bands = bands;

        // Create a map
        this.bandsMap = {};

        for (let i = 0; i < this.bands.length; i++)
        {
            const node:BiquadFilterNode = this.bands[i];

            // Connect the previous band to the current one
            if (i > 0)
            {
                this.bands[i - 1].connect(node);
            }
            this.bandsMap[node.frequency.value] = node;
        }
    }

    /**
     * Set gain on a specific frequency.
     * @method PIXI.sound.filters.EqualizerFilter#setGain
     * @param {number} frequency The frequency, see EqualizerFilter.F* for bands
     * @param {number} [gain=0] Recommended -40 to 40.
     */
    setGain(frequency:number, gain:number = 0): void
    {
        if (!this.bandsMap[frequency])
        {
            throw 'No band found for frequency ' + frequency;
        }
        this.bandsMap[frequency].gain.value = gain;
    }

    /**
     * Reset all frequency bands to have gain of 0
     * @method PIXI.sound.filters.EqualizerFilter#reset
     */
    reset(): void
    {
        this.bands.forEach((band:BiquadFilterNode) => {
            band.gain.value = 0;
        });
    }

    destroy(): void
    {
        this.bands.forEach((band:BiquadFilterNode) => {
            band.disconnect();
        });
        this.bands = null;
        this.bandsMap = null;
    }
}
