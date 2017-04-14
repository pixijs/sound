import BaseSound from "./BaseSound";

// Interface for SoundInstances
export interface ISoundInstance
{
    id: number;
    progress: number;
    paused: boolean;
    init(parent: BaseSound): void;
    stop(): void;
    play(start: number, end: number, speed: number, loop: boolean, fadeIn: number, fadeOut: number): void;
    destroy(): void;
    toString(): string;
    once(event: string, fn: Function, context?: any): PIXI.utils.EventEmitter;
}
