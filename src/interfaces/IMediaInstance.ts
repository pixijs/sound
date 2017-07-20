import { IMedia } from "./IMedia";
import { PlayOptions } from "../Sound";

// Interface for SoundInstances
export interface IMediaInstance
{
    id: number;
    progress: number;
    paused: boolean;
    volume: number;
    speed: number;
    loop: boolean;
    refresh(): void;
    refreshPaused(): void;
    init(parent: IMedia): void;
    stop(): void;
    play(options: PlayOptions): void;
    destroy(): void;
    toString(): string;
    once(event: string, fn: Function, context?: any): PIXI.utils.EventEmitter;
}
