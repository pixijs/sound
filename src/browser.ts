import {
    sound,
    Filterable,
    Sound,
    SoundLibrary,
    SoundSprite,
    SoundLoader,
    filters,
    htmlaudio,
    utils,
    webaudio } from './index';

Object.defineProperties(sound,
    {
        Filterable: { get() { return Filterable; } },
        filters: { get() { return filters; } },
        htmlaudio: { get() { return htmlaudio; } },
        Sound: { get() { return Sound; } },
        SoundLoader: { get() { return SoundLoader; } },
        SoundLibrary: { get() { return SoundLibrary; } },
        SoundSprite: { get() { return SoundSprite; } },
        utils: { get() { return utils; } },
        webaudio: { get() { return webaudio; } },
        sound: { get() { return sound; } },
    });

/**
 * For browser bundle, we'll wrap everything in a single default export.
 * This will be accessible from `PIXI.sound`. For the ESM/CJS bundles
 * we export everything as named.
 * @ignore
 */
export default sound;

