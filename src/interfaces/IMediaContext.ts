import Filter from '../filters/Filter';

export interface IMediaContext
{
    muted: boolean;
    volume: number;
    paused: boolean;
    filters: Filter[];
    toggleMute(): boolean;
    destroy(): void;
}
