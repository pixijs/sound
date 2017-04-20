import {IMediaContext} from "../interfaces/IMediaContext";
import Filter from "../filters/Filter";

export default class HTMLAudioContext implements IMediaContext
{
    public muted: boolean;
    public volume: number;
    public paused: boolean;

    public get filters(): Filter[]
    {
        // @if DEBUG
        console.warn('HTML Audio does not support filters');
        // @endif
        return null;
    }
    public set filters(filters: Filter[])
    {
        // @if DEBUG
        console.warn('HTML Audio does not support filters');
        // @endif
    }

    public get audioContext(): AudioContext
    {
        // @if DEBUG
        console.warn('HTML Audio does not support audioContext');
        // @endif
        return null;
    }

    public toggleMute(): boolean
    {
        // @if DEBUG
        console.warn('HTML Audio does not support toggleMute');
        // @endif
        return true;
    }

    public destroy(): void
    {
        // Do nothing
    }
}