import { getInstance } from "../instance";
import { WebAudioUtils } from "../webaudio";
import { Filter } from "./Filter";

interface Band {
    f: number;
    type: string;
    gain: number;
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
export class EqualizerFilter extends Filter
{
    /**
     * Band at 32 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F32
     * @type {number}
     * @readonly
     */
    public static F32: number = 32;

    /**
     * Band at 64 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F64
     * @type {number}
     * @readonly
     */
    public static F64: number = 64;

    /**
     * Band at 125 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F125
     * @type {number}
     * @readonly
     */
    public static F125: number = 125;

    /**
     * Band at 250 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F250
     * @type {number}
     * @readonly
     */
    public static F250: number = 250;

    /**
     * Band at 500 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F500
     * @type {number}
     * @readonly
     */
    public static F500: number = 500;

    /**
     * Band at 1000 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F1K
     * @type {number}
     * @readonly
     */
    public static F1K: number = 1000;

    /**
     * Band at 2000 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F2K
     * @type {number}
     * @readonly
     */
    public static F2K: number = 2000;

    /**
     * Band at 4000 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F4K
     * @type {number}
     * @readonly
     */
    public static F4K: number = 4000;

    /**
     * Band at 8000 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F8K
     * @type {number}
     * @readonly
     */
    public static F8K: number = 8000;

    /**
     * Band at 16000 Hz
     * @name PIXI.sound.filters.EqualizerFilter.F16K
     * @type {number}
     * @readonly
     */
    public static F16K: number = 16000;

    /**
     * The list of bands
     * @name PIXI.sounds.filters.EqualizerFilter#bands
     * @type {BiquadFilterNode[]}
     * @readonly
     */
    public bands: BiquadFilterNode[];

    /**
     * The map of bands to frequency
     * @name PIXI.sounds.filters.EqualizerFilter#bandsMap
     * @type {Object}
     * @readonly
     */
    public bandsMap: {[id: number]: BiquadFilterNode};

    constructor(f32: number = 0, f64: number = 0, f125: number = 0, f250: number = 0, f500: number = 0,
                f1k: number = 0, f2k: number = 0, f4k: number = 0, f8k: number = 0, f16k: number = 0)
    {
        if (getInstance().useLegacy)
        {
            super(null);
            return;
        }

        const equalizerBands: Band[] = [
            {
                f: EqualizerFilter.F32,
                type: "lowshelf",
                gain: f32,
            },
            {
                f: EqualizerFilter.F64,
                type: "peaking",
                gain: f64,
            },
            {
                f: EqualizerFilter.F125,
                type: "peaking",
                gain: f125,
            },
            {
                f: EqualizerFilter.F250,
                type: "peaking",
                gain: f250,
            },
            {
                f: EqualizerFilter.F500,
                type: "peaking",
                gain: f500,
            },
            {
                f: EqualizerFilter.F1K,
                type: "peaking",
                gain: f1k,
            },
            {
                f: EqualizerFilter.F2K,
                type: "peaking",
                gain: f2k,
            },
            {
                f: EqualizerFilter.F4K,
                type: "peaking",
                gain: f4k,
            },
            {
                f: EqualizerFilter.F8K,
                type: "peaking",
                gain: f8k,
            },
            {
                f: EqualizerFilter.F16K,
                type: "highshelf",
                gain: f16k,
            },
        ];

        const bands: BiquadFilterNode[] = equalizerBands.map((band: Band) =>
        {
            const node: BiquadFilterNode = getInstance().context.audioContext.createBiquadFilter();
            node.type = band.type as BiquadFilterType;
            WebAudioUtils.setParamValue(node.Q, 1);
            node.frequency.value = band.f; // WebAudioUtils.setParamValue(filter.frequency, band.f);
            WebAudioUtils.setParamValue(node.gain, band.gain);
            return node;
        });

        // Setup the constructor AudioNode, where first is the input, and last is the output
        super(bands[0], bands[bands.length - 1]);

        // Manipulate the bands
        this.bands = bands;

        // Create a map
        this.bandsMap = {};

        for (let i = 0; i < this.bands.length; i++)
        {
            const node: BiquadFilterNode = this.bands[i];

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
    public setGain(frequency: number, gain: number = 0): void
    {
        if (!this.bandsMap[frequency])
        {
            throw new Error("No band found for frequency " + frequency);
        }
        WebAudioUtils.setParamValue(this.bandsMap[frequency].gain, gain);
    }

    /**
     * Get gain amount on a specific frequency.
     * @method PIXI.sound.filters.EqualizerFilter#getGain
     * @return {number} The amount of gain set.
     */
    public getGain(frequency: number): number
    {
        if (!this.bandsMap[frequency])
        {
            throw new Error("No band found for frequency " + frequency);
        }
        return this.bandsMap[frequency].gain.value;
    }

    /**
     * Gain at 32 Hz frequencey.
     * @name PIXI.sound.filters.EqualizerFilter#f32
     * @type {number}
     * @default 0
     */
    public set f32(value: number)
    {
        this.setGain(EqualizerFilter.F32, value);
    }
    public get f32(): number
    {
        return this.getGain(EqualizerFilter.F32);
    }

    /**
     * Gain at 64 Hz frequencey.
     * @name PIXI.sound.filters.EqualizerFilter#f64
     * @type {number}
     * @default 0
     */
    public set f64(value: number)
    {
        this.setGain(EqualizerFilter.F64, value);
    }
    public get f64(): number
    {
        return this.getGain(EqualizerFilter.F64);
    }

    /**
     * Gain at 125 Hz frequencey.
     * @name PIXI.sound.filters.EqualizerFilter#f125
     * @type {number}
     * @default 0
     */
    public set f125(value: number)
    {
        this.setGain(EqualizerFilter.F125, value);
    }
    public get f125(): number
    {
        return this.getGain(EqualizerFilter.F125);
    }

    /**
     * Gain at 250 Hz frequencey.
     * @name PIXI.sound.filters.EqualizerFilter#f250
     * @type {number}
     * @default 0
     */
    public set f250(value: number)
    {
        this.setGain(EqualizerFilter.F250, value);
    }
    public get f250(): number
    {
        return this.getGain(EqualizerFilter.F250);
    }

    /**
     * Gain at 500 Hz frequencey.
     * @name PIXI.sound.filters.EqualizerFilter#f500
     * @type {number}
     * @default 0
     */
    public set f500(value: number)
    {
        this.setGain(EqualizerFilter.F500, value);
    }
    public get f500(): number
    {
        return this.getGain(EqualizerFilter.F500);
    }

    /**
     * Gain at 1 KHz frequencey.
     * @name PIXI.sound.filters.EqualizerFilter#f1k
     * @type {number}
     * @default 0
     */
    public set f1k(value: number)
    {
        this.setGain(EqualizerFilter.F1K, value);
    }
    public get f1k(): number
    {
        return this.getGain(EqualizerFilter.F1K);
    }

    /**
     * Gain at 2 KHz frequencey.
     * @name PIXI.sound.filters.EqualizerFilter#f2k
     * @type {number}
     * @default 0
     */
    public set f2k(value: number)
    {
        this.setGain(EqualizerFilter.F2K, value);
    }
    public get f2k(): number
    {
        return this.getGain(EqualizerFilter.F2K);
    }

    /**
     * Gain at 4 KHz frequencey.
     * @name PIXI.sound.filters.EqualizerFilter#f4k
     * @type {number}
     * @default 0
     */
    public set f4k(value: number)
    {
        this.setGain(EqualizerFilter.F4K, value);
    }
    public get f4k(): number
    {
        return this.getGain(EqualizerFilter.F4K);
    }

    /**
     * Gain at 8 KHz frequencey.
     * @name PIXI.sound.filters.EqualizerFilter#f8k
     * @type {number}
     * @default 0
     */
    public set f8k(value: number)
    {
        this.setGain(EqualizerFilter.F8K, value);
    }
    public get f8k(): number
    {
        return this.getGain(EqualizerFilter.F8K);
    }

    /**
     * Gain at 16 KHz frequencey.
     * @name PIXI.sound.filters.EqualizerFilter#f16k
     * @type {number}
     * @default 0
     */
    public set f16k(value: number)
    {
        this.setGain(EqualizerFilter.F16K, value);
    }
    public get f16k(): number
    {
        return this.getGain(EqualizerFilter.F16K);
    }

    /**
     * Reset all frequency bands to have gain of 0
     * @method PIXI.sound.filters.EqualizerFilter#reset
     */
    public reset(): void
    {
        this.bands.forEach((band: BiquadFilterNode) => {
            WebAudioUtils.setParamValue(band.gain, 0);
        });
    }

    public destroy(): void
    {
        this.bands.forEach((band: BiquadFilterNode) => {
            band.disconnect();
        });
        this.bands = null;
        this.bandsMap = null;
    }
}
