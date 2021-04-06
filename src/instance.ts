import { SoundLibrary } from './SoundLibrary';

/**
 * Singletone instance of the SoundLibrary
 */
let instance: SoundLibrary;

/**
 * Internal set function for the singleton instance.
 * @param sound - - Sound library instance
 */
function setInstance(sound: SoundLibrary): SoundLibrary
{
    instance = sound;

    return sound;
}

/**
 * Internal get function for the singleton instance.
 */
function getInstance(): SoundLibrary
{
    return instance;
}

export { instance, setInstance, getInstance };
