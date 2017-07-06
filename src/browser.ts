import LoaderMiddleware from "./loader";
import SoundLibrary from "./SoundLibrary";

import ObjectAssign from "es6-object-assign";
import PromisePolyfill from "promise-polyfill";

if (typeof Object.assign === "undefined")
{
    ObjectAssign.polyfill();
}

if (typeof Promise === "undefined")
{
    (window as any).Promise = PromisePolyfill;
}

// Create instance of the library
const sound = SoundLibrary.init();

// In some cases loaders can be not included
// the the bundle for PixiJS, custom builds
if (typeof PIXI.loaders !== "undefined")
{
    // Install the middleware to support
    // PIXI.loader and new PIXI.loaders.Loader
    LoaderMiddleware.install(sound);
}

// Install to PIXI.sound
sound.global();

export default sound;
