import * as filters from './filters';
import * as htmlaudio from './htmlaudio';
import { setInstance } from './instance';
import { SoundLibrary } from './SoundLibrary';
import * as utils from './utils';
import * as webaudio from './webaudio';

const sound = setInstance(new SoundLibrary());

export * from './Filterable';
export * from './filters/Filter';
export * from './interfaces';
export * from './Sound';
export * from './soundAsset';
export * from './SoundLibrary';
export * from './SoundSprite';
export {
    filters,
    htmlaudio,
    sound,
    utils,
    webaudio,
};
