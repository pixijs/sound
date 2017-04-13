import BaseSound from "../base/BaseSound";
import Sound from "../webaudio/Sound";
import LegacySound from "../legacy/LegacySound";
import soundLibrary from "../index";
import SoundInstance from "../webaudio/SoundInstance";
import LegacySoundInstance from "../legacy/LegacySoundInstance";
import {ISoundInstance} from "../base/ISoundInstance";

const pool: ISoundInstance[] = [];

export function createInstance(parent: BaseSound): ISoundInstance
{
    if (pool.length > 0)
    {
        const instance:ISoundInstance = pool.pop();
        instance.init(parent);
        return instance;
    }
    
    if (!soundLibrary.supported || soundLibrary.forceLegacy)
    {
        return new LegacySoundInstance(parent as LegacySound);
    }
    else
    {
        return new SoundInstance(parent as Sound);
    }
}

export function poolInstance(instance:ISoundInstance): void
{
    instance.destroy();
    // Add it if it isn't already added
    if (pool.indexOf(instance) < 0)
    {
        pool.push(instance);
    }
}
