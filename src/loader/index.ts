import SoundLibrary from "../SoundLibrary";
import SoundUtils from "../utils/SoundUtils";

/**
 * Sound middleware installation utilities for PIXI.loaders.Loader
 * @namespace PIXI.sound.loader
 */
export default class LoaderMiddleware
{
    /**
     * @name PIXI.sound.loader.EXTENSION
     * @type {PIXI.sound.SoundLibrary}
     * @static
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

        // Monkey-patch the PIXI.loaders.Loader class
        // to support using the resolve loader middleware
        const Loader = PIXI.loaders.Loader;
        const SoundLoader = function(baseUrl?:string, concurrency?:number) {
            Loader.call(this, baseUrl, concurrency);
            this.use(LoaderMiddleware.plugin);
            this.pre(LoaderMiddleware.resolve);
        };
        SoundLoader.prototype = Loader.prototype;
        (PIXI.loaders as any).Loader = SoundLoader;

        // Install middleware on the default loader
        PIXI.loader.use(LoaderMiddleware.plugin);
        PIXI.loader.pre(LoaderMiddleware.resolve);
    }

    /**
     * Set the legacy mode
     * @name PIXI.sound.loader.legacy
     * @type {Boolean}
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
    private static resolve(resource: PIXI.loaders.Resource, next: () => void): void
    {
        SoundUtils.resolveUrl(resource);
        next();
    }

    /**
     * Actual resource-loader middleware for sound class
     */
    private static plugin(resource: PIXI.loaders.Resource, next: () => void): void
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
