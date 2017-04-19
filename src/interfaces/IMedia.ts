import { LoadedCallback } from '../Sound';
import { IMediaContext } from './IMediaContext';
import { IMediaInstance } from './IMediaInstance';
import Sound from '../Sound';
import Filter from '../filters/Filter';

export interface IMedia {
    new (parent:Sound);
    loop:boolean;
    volume:number;
    speed:number;
    context: IMediaContext;
    filters: Filter[];
    readonly duration:number;
    readonly isPlayable:boolean;
    create(media:IMedia): IMediaInstance;
    init(context: IMediaContext): void;
    load(callback?: LoadedCallback): void;
    destroy(): void;
}