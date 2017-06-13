import Filter from './Filter';
import SoundLibrary from '../SoundLibrary';

/**
 * Pitch shift the output.
 *
 * @class PitchShiftFilter
 * @memberof PIXI.sound.filters
 * @param {Number} [pitchRatio=1.0] - amount of pitch, see #pitchRadio property
 * @param {Number} [overlapRatio=0.5]
 * @param {Number} [grainSize=512] - sample size, cannot be changed after construction
 */
export default class PitchShiftFilter extends Filter
{
    /**
     * The amount of shift, numbers greater than 1 are higher pitch
     * and numbers lower than 1 and above zero are lower.
     * @name PIXI.sound.filters.PitchShiftFilter#pitchRatio
     * @type {Number}
     */
    public pitchRatio: number;

    /**
     * Merger node
     * @name PIXI.sound.filters.PitchShiftFilter#_pitch
     * @type {ScriptProcessorNode}
     * @private
     */
    private _pitch:ScriptProcessorNode;

    /**
     * @name PIXI.sound.filters.PitchShiftFilter#_buffer
     * @type {Float32Array}
     * @private
     */
    private _buffer:Float32Array;

    /**
     * @name PIXI.sound.filters.PitchShiftFilter#_grainWindow
     * @type {Float32Array}
     * @private
     */
    private _grainWindow:Float32Array;

    /**
     * @name PIXI.sound.filters.PitchShiftFilter#_grainSize
     * @type {Number}
     * @private
     */
    private _grainSize: number;

    /**
     * @name PIXI.sound.filters.PitchShiftFilter#_overlapRatio
     * @type {Number}
     * @private
     */
    private _overlapRatio: number;

    constructor(pitchRatio:number = 1.0, overlapRatio:number = 0.5, grainSize:number = 512)
    {
        if (SoundLibrary.instance.useLegacy)
        {
            super(null);
            return;
        }

        const {audioContext} = SoundLibrary.instance.context;
        const pitch = audioContext.createScriptProcessor(grainSize, 1, 1);

        super(pitch);

        this.pitchRatio = pitchRatio;

        this._buffer = new Float32Array(grainSize * 2);
        this._grainWindow = this._hannWindow(grainSize);
        this._grainSize = grainSize;
        this._overlapRatio = overlapRatio;

        this._pitch = pitch;
        this._pitch.onaudioprocess = this._process.bind(this);
    }

    /**
     * Return values for hann windowing function
     * @method
     * @private
     * @param {number} length - number of samples
     * @return {Float32Array} Values of function
     */
    private _hannWindow(length:number):Float32Array
    {
        const window = new Float32Array(length);
        for (let i = 0; i < length; i++)
        {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (length - 1)));
        }
        return window;
    }

    /**
     * Handle the onaudioprocess event as part of the ScriptProcessorNode
     * @method
     * @private
     * @param {AudioProcessingEvent} event
     */
    private _process(event:AudioProcessingEvent):void
    {
        const inputData = event.inputBuffer.getChannelData(0);
        const outputData = event.outputBuffer.getChannelData(0);

        const grainSize = this._grainSize;

        for (let i = 0; i < inputData.length; i++)
        {
            // Apply the window to the input buffer
            inputData[i] *= this._grainWindow[i];

            // Shift half of the buffer
            this._buffer[i] = this._buffer[i + grainSize];

            // Empty the buffer tail
            this._buffer[i + grainSize] = 0;
        }

        // Calculate the pitch shifted grain re-sampling and looping the input
        const grainData = new Float32Array(grainSize * 2);

        for (let i = 0, j = 0; i < grainSize; i++, j += this.pitchRatio)
        {
            let index = Math.floor(j) % grainSize;
            let a = inputData[index];
            let b = inputData[(index + 1) % grainSize];
            grainData[i] += this._linearInterpolation(a, b, j % 1.0) * this._grainWindow[i];
        }

        // Copy the grain multiple times overlapping it
        for (let i = 0; i < grainSize; i += Math.round(grainSize * (1 - this._overlapRatio)))
        {
            for (let j = 0; j <= grainSize; j++)
            {
                this._buffer[i + j] += grainData[j];
            }
        }

        // Output the first half of the buffer
        for (let i = 0; i < grainSize; i++)
        {
            outputData[i] = this._buffer[i];
        }
    }

    /**
     * Linear interpolation
     * @method
     * @private
     * @param {number} a - start value
     * @param {number} b - end value
     * @param {number} t - time amount
     * @return {number} value
     */
    private _linearInterpolation(a:number, b:number, t:number):number
    {
        return a + (b - a) * t;
    }
}
