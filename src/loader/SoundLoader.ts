import { LoaderResource } from "@pixi/loaders";
import { getInstance } from "../instance";
import { resolveUrl } from "../utils/resolveUrl";
import { extensions } from "../utils/supported";

/**
 * Sound middleware installation utilities for PIXI.Loader
 * @class
 * @private
 */
export class SoundLoader
{
    /**
     * Install the middleware
     * @method PIXI.sound.loader.add
     * @param {PIXI.sound.SoundLibrary} sound - Instance of sound library
     */
    public static add()
    {
        SoundLoader.legacy = getInstance().useLegacy;
    }

    /**
     * Set the legacy mode
     * @name PIXI.sound.loader.legacy
     * @type {boolean}
     * @private
     */
    static set legacy(legacy: boolean)
    {
        // Configure PIXI Loader to handle audio files correctly
        const exts = extensions;

        // Make sure we support webaudio
        if (!legacy)
        {
            // Load all audio files as ArrayBuffers
            exts.forEach((ext) => {
                LoaderResource.setExtensionXhrType(ext, LoaderResource.XHR_RESPONSE_TYPE.BUFFER);
                LoaderResource.setExtensionLoadType(ext, LoaderResource.LOAD_TYPE.XHR);
            });
        }
        else
        {
            // Fall back to loading as <audio> elements
            exts.forEach((ext) => {
                LoaderResource.setExtensionXhrType(ext, LoaderResource.XHR_RESPONSE_TYPE.DEFAULT);
                LoaderResource.setExtensionLoadType(ext, LoaderResource.LOAD_TYPE.AUDIO);
            });
        }
    }

    /**
     * Handle the preprocessing of file paths
     */
    public static pre(resource: PIXI.LoaderResource, next: () => void): void
    {
        resolveUrl(resource);
        next();
    }

    /**
     * Actual resource-loader middleware for sound class
     */
    public static use(resource: PIXI.LoaderResource, next: () => void): void
    {
        if (resource.data && extensions.indexOf(resource.extension) > -1)
        {
            (resource as any).sound = getInstance().add(resource.name, {
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
