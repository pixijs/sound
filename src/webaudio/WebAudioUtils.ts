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
     * @param time - Time delay in seconds
     * @return The value set
     */
    public static setParamValue(param: AudioParam, value: number, time = 0): number
    {
        if (param.setValueAtTime)
        {
            const context = getInstance().context as WebAudioContext;

            param.setValueAtTime(value, context.audioContext.currentTime + time);
        }
        else
        {
            param.value = value;
        }

        return value;
    }

    /**
     * Linearly ramp from the current to a new AudioParam value.
     * Use `linearRampToValueAtTime` when available. Otherwise fallback to
     * setting it using {@link WebAudioUtils.setParamValue}.
     * @param param - AudioNode parameter object
     * @param value - Value to ramp to
     * @param time - Time in seconds the ramping should occur
     * @returns The value set
     */
    public static linearRampToParamValue(param: AudioParam, value: number, time: number): number
    {
        if (param.linearRampToValueAtTime)
        {
            const context = getInstance().context as WebAudioContext;

            // We need to setValueAtTime before we linearRamp or there is no "event" to ramp from.
            param.setValueAtTime(param.value, context.audioContext.currentTime);
            param.linearRampToValueAtTime(value, context.audioContext.currentTime + time);
        }
        else
        {
            WebAudioUtils.setParamValue(param, value, time);
        }

        return value;
    }
}

export { WebAudioUtils };
