/// <reference types="pixi.js" />

/**
 * Global namespace provided by the PixiJS project.
 * @namespace PIXI
 * @see https://github.com/pixijs/pixi.js
 */
import { Loader } from "@pixi/loaders";
import { Filterable } from "./Filterable";
import * as filters from "./filters";
import * as htmlaudio from "./htmlaudio";
import { getInstance, setInstance } from "./instance";
import { SoundLoader } from "./loader";
import { Sound } from "./Sound";
import { SoundLibrary } from "./SoundLibrary";
import { SoundSprite } from "./sprites";
import * as utils from "./utils";
import * as webaudio from "./webaudio";

const sound = setInstance(new SoundLibrary());

// Add the loader plugin
Loader.registerPlugin(SoundLoader);

// Export
Object.defineProperties(sound,
{
    Filterable: { get() { return Filterable; } },
    filters: { get() { return filters; } },
    htmlaudio: { get() { return htmlaudio; } },
    Sound: { get() { return Sound; } },
    SoundLibrary: { get() { return SoundLibrary; } },
    SoundSprite: { get() { return SoundSprite; } },
    utils: { get() { return utils; } },
    webaudio: { get() { return webaudio; } },
    sound: { get() { return sound; } },
});

export default sound;
