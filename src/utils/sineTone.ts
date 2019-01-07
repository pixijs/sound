import { Sound } from "../Sound";
import { WebAudioContext, WebAudioMedia } from "../webaudio";

/**
 * Create a new sound for a sine wave-based tone.  **Only supported with WebAudio**
 * @method PIXI.sound.utils.sineTone
 * @param {number} [hertz=200] Frequency of sound.
 * @param {number} [seconds=1] Duration of sound in seconds.
 * @return {PIXI.sound.Sound} New sound.
 */
export function sineTone(hertz: number = 200, seconds: number = 1): Sound
{
    const sound = Sound.from({
        singleInstance: true,
    });

    if (!(sound.media instanceof WebAudioMedia))
    {
        return sound;
    }

    const media = sound.media as WebAudioMedia;
    const context = sound.context as WebAudioContext;

    // set default value
    const nChannels = 1;
    const sampleRate = 48000;
    const amplitude = 2;

    // create the buffer
    const buffer = context.audioContext.createBuffer(
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
    media.buffer = buffer;
    sound.isLoaded = true;
    return sound;
}
