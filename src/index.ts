import { setInstance } from './instance';
import { SoundLibrary } from './SoundLibrary';
import * as htmlaudio from './htmlaudio';
import * as filters from './filters';
import * as webaudio from './webaudio';
import * as utils from './utils';

const sound = setInstance(new SoundLibrary());

export * from './Sound';
export * from './soundAsset';
export * from './SoundLibrary';
export * from './Filterable';
export * from './interfaces';
export * from './filters/Filter';
export * from './SoundSprite';
export {
    sound,
    htmlaudio,
    filters,
    webaudio,
    utils,
};
