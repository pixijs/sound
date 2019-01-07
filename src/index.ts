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
const win = window as any;

// Expose to PIXI.sound to the window PIXI object
const PIXI_UNTYPED = PIXI as any;

// Check for environments without promises
if (typeof Promise === "undefined")
{
    win.Promise = PromisePolyfill;
}

// In some cases loaders can be not included
// the the bundle for PixiJS, custom builds
if (typeof PIXI.loaders !== "undefined")
{
    const majorVersion = parseInt(PIXI.VERSION.split(".")[0], 10);

    // Hack for version 4.x of PixiJS to support in future loaders
    // as well as the existing default shared loader
    if (majorVersion === 4)
    {
        // Replace the PIXI.loaders.Loader class
        // to support using the resolve loader middleware
        PIXI.loaders.Loader = Loader;

        // Install middleware on the default loader
        LoaderMiddleware.add();
        PIXI.loader.use(LoaderMiddleware.use);
        PIXI.loader.pre(LoaderMiddleware.pre);
    }
    else if (majorVersion >= 5)
    {
        PIXI_UNTYPED.Loader.registerPlugin(LoaderMiddleware);
    }
}

// Remove the global namespace created by rollup
// makes it possible for users to opt-in to exposing
// the library globally
if (typeof win.__pixiSound === "undefined")
{
    delete win.__pixiSound;
}

// Check incase sound has already used
if (!PIXI_UNTYPED.sound)
{
    Object.defineProperty(PIXI_UNTYPED, "sound",
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
