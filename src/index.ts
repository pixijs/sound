import { Loader } from '@pixi/loaders';
import { setInstance } from './instance';
import { SoundLoader } from './SoundLoader';
import { SoundLibrary } from './SoundLibrary';
import htmlaudio from './htmlaudio';
import filters from './filters';
import webaudio from './webaudio';
import utils from './utils';

const sound = setInstance(new SoundLibrary());

// Add the loader plugin
Loader.registerPlugin(SoundLoader);

export * from './Sound';
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
