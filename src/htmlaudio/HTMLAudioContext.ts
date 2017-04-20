import {IMediaContext} from "../interfaces/IMediaContext";
import Filter from "../filters/Filter";

export default class HTMLAudioContext implements IMediaContext
{
    public muted: boolean;
    public volume: number;
    public paused: boolean;

    public get filters(): Filter[]
    {
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
        return null;
    }

    public toggleMute(): boolean
    {
        return true;
    }

    public destroy(): void
    {
        // Do nothing
    }
}