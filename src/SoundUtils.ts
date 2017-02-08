import Sound from './Sound';
import soundLibrary from './index';
import * as uuid from 'uuid';

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
    static sineTone(hertz:number = 200, seconds:number = 1):Sound
    {
        const soundContext = soundLibrary.context;
        const soundInstance = new Sound(soundContext, {
            block: true
        });

        // set default value
        const nChannels = 1;
        const sampleRate = 48000;
        const amplitude = 2;

        // create the buffer
        const buffer = soundContext.audioContext.createBuffer(
            nChannels,
            seconds * sampleRate,
            sampleRate
        );
        const fArray = buffer.getChannelData(0);

        // fill the buffer
        for(let i = 0; i < fArray.length; i++){
            let time  = i / buffer.sampleRate;
            let angle = hertz * time * Math.PI;
            fArray[i] = Math.sin(angle)*amplitude;
        }

        // set the buffer
        soundInstance.buffer = buffer;
        soundInstance.isLoaded = true;
        return soundInstance;
    }

    /**
     * Create a new "Audio" stream based on given audio path and project uri; returns the audio object.
     * @method PIXI.sound.utils.playOnce
     * @static
     * @param {String} fileName Full path of the file to play.
     * @param {Function} callback Callback when complete.
     * @return {string} New audio element alias.
     */
    static playOnce(src:string, callback?:(err?:Error) => void):string
    {
        const alias = uuid.v4();

        soundLibrary.add(alias, {
            src: src,
            preload: true,
            autoPlay: true,
            loaded: (err:Error) => {
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
            }
        });
        return alias;
    }
}
