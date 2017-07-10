import { IMedia } from "./IMedia";

// Interface for SoundInstances
export interface IMediaInstance
{
    id: number;
    progress: number;
    paused: boolean;
    init(parent: IMedia): void;
    stop(): void;
    play(start: number, end: number, speed: number, loop: boolean, fadeIn: number, fadeOut: number): void;
    destroy(): void;
    toString(): string;
    once(event: string, fn: Function, context?: any): PIXI.utils.EventEmitter;
}
