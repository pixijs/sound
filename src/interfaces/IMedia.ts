import { Filter } from "../filters";
import { LoadedCallback, Sound } from "../Sound";
import { IMediaContext } from "./IMediaContext";
import { IMediaInstance } from "./IMediaInstance";

/**
 * Interface represents either a WebAudio source or an HTML5 AudioElement source
 * @class IMedia
 * @memberof PIXI.sound
 * @private
 */
export interface IMedia {

    /**
     * Collection of global filters
     * @member {Array<PIXI.sound.filters.Filter>} PIXI.sound.IMedia#filters
     */
    filters: Filter[];

    /**
     * Reference to the context.
     * @member {PIXI.sound.IMediaContext} PIXI.sound.IMedia#context
     * @readonly
     */
    readonly context: IMediaContext;

    /**
     * Length of sound in seconds.
     * @member {number} PIXI.sound.IMedia#duration
     * @readonly
     */
    readonly duration: number;

    /**
     * Flag to check if sound is currently playable (e.g., has been loaded/decoded).
     * @member {boolean} PIXI.sound.IMedia#isPlayable
     * @readonly
     */
    readonly isPlayable: boolean;

    // Internal methods
    create(): IMediaInstance;
    init(sound: Sound): void;
    load(callback?: LoadedCallback): void;
    destroy(): void;
}
