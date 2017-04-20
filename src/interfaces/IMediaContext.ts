import Filter from '../filters/Filter';

export interface IMediaContext
{
    muted: boolean;
    volume: number;
    paused: boolean;
    filters: Filter[];
    audioContext: AudioContext;
    toggleMute(): boolean;
    destroy(): void;
}
