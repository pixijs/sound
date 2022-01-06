import { getInstance } from '../instance';
import { Filter } from './Filter';

/**
 * Export a MediaStream to be recorded
 *
 * @memberof filters
 */
class StreamFilter extends Filter
{
    private _stream: MediaStream;

    constructor()
    {
        if (getInstance().useLegacy)
        {
            super(null);

            return;
        }
        const audioContext: AudioContext = getInstance().context.audioContext;
        const destination: MediaStreamAudioDestinationNode = audioContext.createMediaStreamDestination();
        const source: MediaStreamAudioSourceNode = audioContext.createMediaStreamSource(destination.stream);

        super(destination, source);
        this._stream = destination.stream;
    }

    public get stream(): MediaStream
    {
        return this._stream;
    }

    public destroy(): void
    {
        this._stream = null;
        super.destroy();
    }
}

export { StreamFilter };
