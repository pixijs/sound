import * as uuid from "uuid";
import soundLibrary from "./index";
import Sound from "./Sound";

export interface RenderOptions {
    width?: number;
    height?: number;
    fill?: string|CanvasPattern|CanvasGradient;
}

/**
 * Utilities that work with sounds.
 * @namespace PIXI.sound.utils
 */
export default class SoundUtils
{
    /**
     * Create a new sound for a sine wave-based tone.
     * @method PIXI.sound.utils.sineTone
     * @param {PIXI.sound.SoundContext} soundContext
     * @param {Number} [hertz=200] Frequency of sound.
     * @param {Number} [seconds=1] Duration of sound in seconds.
     * @return {PIXI.sound.Sound} New sound.
     */
    public static sineTone(hertz: number = 200, seconds: number = 1): Sound
    {
        const soundContext = soundLibrary.context;
        const soundInstance = new Sound(soundContext, {
            singleInstance: true,
        });

        // set default value
        const nChannels = 1;
        const sampleRate = 48000;
        const amplitude = 2;

        // create the buffer
        const buffer = soundContext.audioContext.createBuffer(
            nChannels,
            seconds * sampleRate,
            sampleRate,
        );
        const fArray = buffer.getChannelData(0);

        // fill the buffer
        for (let i = 0; i < fArray.length; i++)
        {
            const time  = i / buffer.sampleRate;
            const angle = hertz * time * Math.PI;
            fArray[i] = Math.sin(angle) * amplitude;
        }

        // set the buffer
        soundInstance.buffer = buffer;
        soundInstance.isLoaded = true;
        return soundInstance;
    }

    /**
     * Render image as Texture
     * @method PIXI.sound.utils.render
     * @param {PIXI.sound.Sound} sound Instance of sound to render
     * @param {Object} [options] Custom rendering options
     * @param {Number} [options.width=512] Width of the render
     * @param {Number} [options.height=128] Height of the render
     * @param {string|CanvasPattern|CanvasGradient} [options.fill='black'] Fill style for waveform
     * @return {PIXI.Texture} Result texture
     */
    public static render(sound: Sound, options?: RenderOptions): PIXI.BaseTexture
    {
        options = Object.assign({
            width: 512,
            height: 128,
            fill: "black",
        }, options || {});

        console.assert(!!sound.buffer, "No buffer found, load first");

        const canvas: HTMLCanvasElement = document.createElement("canvas");
        canvas.width = options.width;
        canvas.height = options.height;

        const context: CanvasRenderingContext2D = canvas.getContext("2d");
        context.fillStyle = options.fill;
        const data: Float32Array = sound.buffer.getChannelData(0);
        const step: number = Math.ceil(data.length / options.width);
        const amp: number = options.height / 2;

        for (let i: number = 0; i < options.width; i++)
        {
            let min: number = 1.0;
            let max: number = -1.0;

            for (let j: number = 0; j < step; j++)
            {
                const datum: number = data[(i * step) + j];

                if (datum < min)
                {
                    min = datum;
                }
                if (datum > max)
                {
                    max = datum;
                }
            }
            context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
        return PIXI.BaseTexture.fromCanvas(canvas);
    }

    /**
     * Create a new "Audio" stream based on given audio path and project uri; returns the audio object.
     * @method PIXI.sound.utils.playOnce
     * @static
     * @param {String} fileName Full path of the file to play.
     * @param {Function} callback Callback when complete.
     * @return {string} New audio element alias.
     */
    public static playOnce(src: string, callback?: (err?: Error) => void): string
    {
        const alias = uuid.v4();

        soundLibrary.add(alias, {
            src,
            preload: true,
            autoPlay: true,
            loaded: (err: Error) => {
                if (err)
                {
                    console.error(err);
                    soundLibrary.remove(alias);
                    if (callback)
                    {
                        callback(err);
                    }
                }
            },
            complete: () => {
                soundLibrary.remove(alias);
                if (callback)
                {
                    callback(null);
                }
            },
        });
        return alias;
    }
}
