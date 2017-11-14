/**
 * Global namespace provided by the PixiJS project.
 * @namespace PIXI
 * @see https://github.com/pixijs/pixi.js
 */
export { default as Filterable } from "./Filterable";
export { default as Sound } from "./Sound";
export { default as SoundLibrary } from "./SoundLibrary";
export { default as SoundSprite } from "./sprites/SoundSprite";
export { default as utils } from "./utils/SoundUtils";

import SoundLibrary from "./SoundLibrary";
export const sound = SoundLibrary.init();

import * as filters from "./filters";
export { filters };

import * as htmlaudio from "./htmlaudio";
export { htmlaudio };

import * as webaudio from "./webaudio";
export { webaudio };
