import { SoundLibrary } from './SoundLibrary';

/**
 * Singleton instance of the SoundLibrary
 */
let instance: SoundLibrary;

/**
 * Internal set function for the singleton instance.
 * @ignore
 * @param sound - - Sound library instance
 */
function setInstance(sound: SoundLibrary): SoundLibrary
{
    instance = sound;

    return sound;
}

/**
 * Internal get function for the singleton instance.
 * @ignore
 */
function getInstance(): SoundLibrary
{
    return instance;
}

export { getInstance, instance, setInstance };
