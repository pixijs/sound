import { ILoaderPlugin, ILoaderResource, LoaderResource } from '@pixi/loaders';
import { getInstance } from './instance';
import { resolveUrl } from './utils/resolveUrl';
import { extensions } from './utils/supported';

/**
 * Sound middleware installation utilities for PIXI.Loader
 */
class SoundLoader implements ILoaderPlugin
{
    /** Used for PixiJS 6.5.0 extensions API */
    static extension = 'loader';

    /** Install the middleware */
    public static add(): void
    {
        SoundLoader.setLegacy(getInstance().useLegacy);
    }

    /**
     * Set the legacy mode
     * @param legacy - Non-webaudio environments
     */
    static setLegacy(legacy: boolean): void
    {
        // Configure PIXI Loader to handle audio files correctly
        const exts = extensions;

        // Make sure we support webaudio
        if (!legacy)
        {
            // Load all audio files as ArrayBuffers
            exts.forEach((ext) =>
            {
                LoaderResource.setExtensionXhrType(ext, LoaderResource.XHR_RESPONSE_TYPE.BUFFER);
                LoaderResource.setExtensionLoadType(ext, LoaderResource.LOAD_TYPE.XHR);
            });
        }
        else
        {
            // Fall back to loading as <audio> elements
            exts.forEach((ext) =>
            {
                LoaderResource.setExtensionXhrType(ext, LoaderResource.XHR_RESPONSE_TYPE.DEFAULT);
                LoaderResource.setExtensionLoadType(ext, LoaderResource.LOAD_TYPE.AUDIO);
            });
        }
    }

    /** Handle the preprocessing of file paths */
    public static pre(resource: ILoaderResource, next: () => void): void
    {
        resolveUrl(resource);
        next();
    }

    /** Actual resource-loader middleware for sound class */
    public static use(resource: ILoaderResource, next: () => void): void
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

export { SoundLoader };
