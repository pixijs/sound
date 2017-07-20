import Filter from '../filters/Filter';

export interface IMediaContext
{
    muted: boolean;
    volume: number;
    speed: number;
    paused: boolean;
    filters: Filter[];
    audioContext: AudioContext;
    toggleMute(): boolean;
    togglePause(): boolean;
    refresh(): void;
    destroy(): void;
}
