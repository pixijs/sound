import { Filter } from "../filters";
import { LoadedCallback, Sound } from "../Sound";
import { IMediaContext } from "./IMediaContext";
import { IMediaInstance } from "./IMediaInstance";

/**
 * Interface represents either a WebAudio source or an HTML5 AudioElement source
 * @class
 */
export interface IMedia {

    /** Collection of global filters */
    filters: Filter[];

    /** Reference to the context. */
    readonly context: IMediaContext;

    /** Length of sound in seconds. */
    readonly duration: number;

    /** Flag to check if sound is currently playable (e.g., has been loaded/decoded). */
    readonly isPlayable: boolean;

    // Internal methods
    create(): IMediaInstance;
    init(sound: Sound): void;
    load(callback?: LoadedCallback): void;
    destroy(): void;
}
