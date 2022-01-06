import { getInstance } from '../instance';
import { WebAudioContext } from './WebAudioContext';

/**
 * Internal class for Web Audio abstractions and convenience methods.
 * @memberof webaudio
 */
class WebAudioUtils
{
    /**
     * Dezippering is removed in the future Web Audio API, instead
     * we use the `setValueAtTime` method, however, this is not available
     * in all environments (e.g., Android webview), so we fallback to the `value` setter.
     * @param param - AudioNode parameter object
     * @param value - Value to set
     * @return The value set
     */
    public static setParamValue(param: AudioParam, value: number): number
    {
        if (param.setValueAtTime)
        {
            const context = getInstance().context as WebAudioContext;

            param.setValueAtTime(value, context.audioContext.currentTime);
        }
        else
        {
            param.value = value;
        }

        return value;
    }
}

export { WebAudioUtils };
