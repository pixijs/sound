import { LoadedCallback } from '../Sound';
import { IMediaContext } from './IMediaContext';
import { IMediaInstance } from './IMediaInstance';
import Sound from '../Sound';
import Filter from '../filters/Filter';

export interface IMedia {
    filters: Filter[];
    readonly context: IMediaContext;
    readonly duration:number;
    readonly isPlayable:boolean;
    create(): IMediaInstance;
    init(sound:Sound): void;
    load(callback?: LoadedCallback): void;
    destroy(): void;
}