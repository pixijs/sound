import { SoundLibrary } from "./SoundLibrary";

/**
 * Singletone instance of the SoundLibrary
 */
export let instance: SoundLibrary;

/**
 * Internal set function for the singleton instance.
 * @param {PIXI.sound} sound - - Sound library instance
 * @return {PIXI.sound}
 */
export function setInstance(sound: SoundLibrary) {
    instance = sound;
    return sound;
}

/**
 * Internal get function for the singleton instance.
 * @return {PIXI.sound}
 */
export function getInstance(): SoundLibrary {
    return instance;
}
