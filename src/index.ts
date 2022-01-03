import { Loader } from '@pixi/loaders';
import { setInstance } from './instance';
import { SoundLoader } from './SoundLoader';
import { SoundLibrary } from './SoundLibrary';
import * as htmlaudio from './htmlaudio';
import * as filters from './filters';
import * as webaudio from './webaudio';
import * as utils from './utils';

const sound = setInstance(new SoundLibrary());

// Add the loader plugin
Loader.registerPlugin(SoundLoader);

export * from './Sound';
export * from './SoundLoader';
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
