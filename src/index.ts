/**
 * Global namespace provided by the PixiJS project.
 * @namespace PIXI
 * @see https://github.com/pixijs/pixi.js
 */
import PromisePolyfill from "promise-polyfill";
import { Filterable } from "./Filterable";
import * as filters from "./filters";
import * as htmlaudio from "./htmlaudio";
import { getInstance, setInstance } from "./instance";
import { Loader, LoaderMiddleware } from "./loader";
import { Sound } from "./Sound";
import { SoundLibrary } from "./SoundLibrary";
import { SoundSprite } from "./sprites";
import * as utils from "./utils";
import * as webaudio from "./webaudio";

// Create the singleton instance of library
const sound = setInstance(new SoundLibrary());

// Check for environments without promises
if (typeof Promise === "undefined")
{
    (window as any).Promise = PromisePolyfill;
}

// In some cases loaders can be not included
// the the bundle for PixiJS, custom builds
if (typeof PIXI.loaders !== "undefined")
{
    // Install the middleware to support
    // PIXI.loader and new PIXI.loaders.Loader
    LoaderMiddleware.install();

    // Hack for version 4.x of PixiJS
    if (PIXI.VERSION.split(".")[0] === "4")
    {
        // Replace the PIXI.loaders.Loader class
        // to support using the resolve loader middleware
        PIXI.loaders.Loader = Loader;

        // Install middleware on the default loader
        PIXI.loader.use(LoaderMiddleware.plugin);
        PIXI.loader.pre(LoaderMiddleware.resolve);
    }
}

// Remove the global namespace created by rollup
// makes it possible for users to opt-in to exposing
// the library globally
const root = window as any;
if (typeof root.__pixiSound === "undefined")
{
    delete root.__pixiSound;
}

// Expose to PIXI.sound to the window PIXI object
const PixiJS = (PIXI as any);

// Check incase sound has already used
if (!PixiJS.sound)
{
    Object.defineProperty(PixiJS, "sound",
    {
        get() { return sound; },
    });

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
}

export default sound;
