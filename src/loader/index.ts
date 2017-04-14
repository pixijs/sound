import SoundLibrary from "../SoundLibrary";

/**
 * Sound middleware installation utilities for PIXI.loaders.Loader
 * @namespace PIXI.sound.loader
 */
export default class LoaderMiddleware
{
    /**
     * The collection of valid sound extensions
     * @name PIXI.sound.loader.EXTENSION
     * @type {String[]}
     * @static
     */
    static EXTENSIONS: string[] = ["wav", "mp3", "ogg", "oga", "m4a"];

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

        // Globally install middleware on all Loaders
        PIXI.loaders.Loader.addPixiMiddleware(() => {
            return LoaderMiddleware.plugin;
        });

        // Install middleware on the default loader
        PIXI.loader.use(LoaderMiddleware.plugin);
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
        const exts = LoaderMiddleware.EXTENSIONS;

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
     * Actual resource-loader middleware for sound class
     */
    private static plugin(resource: PIXI.loaders.Resource, next: () => void): void
    {
        if (resource.data && LoaderMiddleware.EXTENSIONS.indexOf(resource.extension) > -1)
        {
            (resource as any).sound = LoaderMiddleware._sound.add(resource.name, {
                loaded: next,
                preload: true,
                src: resource.url,
                srcBuffer: resource.data,
            });
        }
        else
        {
            next();
        }
    }
}
