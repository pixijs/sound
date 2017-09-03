import SoundLibrary from "../SoundLibrary";
import SoundUtils from "../utils/SoundUtils";
import Loader from "./Loader";

/**
 * Sound middleware installation utilities for PIXI.loaders.Loader
 * @class
 * @private
 */
export default class LoaderMiddleware
{
    /**
     * @name PIXI.sound.loader._sound
     * @type {PIXI.sound}
     * @static
     * @private
     */
    static _sound: SoundLibrary;

    /**
     * Install the middleware
     * @method PIXI.sound.loader.install
     * @param {PIXI.sound.SoundLibrary} sound - Instance of sound library
     */
    static install(sound:SoundLibrary)
    {
        LoaderMiddleware._sound = sound;
        LoaderMiddleware.legacy = sound.useLegacy;

        // Replace the PIXI.loaders.Loader class
        // to support using the resolve loader middleware
        PIXI.loaders.Loader = Loader;

        // Install middleware on the default loader
        PIXI.loader.use(LoaderMiddleware.plugin);
        PIXI.loader.pre(LoaderMiddleware.resolve);
    }

    /**
     * Set the legacy mode
     * @name PIXI.sound.loader.legacy
     * @type {boolean}
     * @private
     */
    static set legacy(legacy:boolean)
    {
        // Configure PIXI Loader to handle audio files correctly
        const Resource = PIXI.loaders.Resource;
        const exts = SoundUtils.extensions;

        // Make sure we support webaudio
        if (!legacy)
        {
            // Load all audio files as ArrayBuffers
            exts.forEach((ext) => {
                Resource.setExtensionXhrType(ext, Resource.XHR_RESPONSE_TYPE.BUFFER);
                Resource.setExtensionLoadType(ext, Resource.LOAD_TYPE.XHR);
            });
        }
        else
        {
            // Fall back to loading as <audio> elements
            exts.forEach((ext) => {
                Resource.setExtensionXhrType(ext, Resource.XHR_RESPONSE_TYPE.DEFAULT);
                Resource.setExtensionLoadType(ext, Resource.LOAD_TYPE.AUDIO);
            });
        }
    }

    /**
     * Handle the preprocessing of file paths
     */
    static resolve(resource: PIXI.loaders.Resource, next: () => void): void
    {
        SoundUtils.resolveUrl(resource);
        next();
    }

    /**
     * Actual resource-loader middleware for sound class
     */
    static plugin(resource: PIXI.loaders.Resource, next: () => void): void
    {
        if (resource.data && SoundUtils.extensions.indexOf(resource.extension) > -1)
        {
            (resource as any).sound = LoaderMiddleware._sound.add(resource.name, {
                loaded: next,
                preload: true,
                url: resource.url,
                source: resource.data,
            });
        }
        else
        {
            next();
        }
    }
}
