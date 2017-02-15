import sound from "./index";

// Supported audio formats
const AUDIO_EXTENSIONS: string[] = ["wav", "mp3", "ogg", "oga", "m4a"];

/**
 * Actual resource-loader middleware for sound class
 */
function middleware(resource: PIXI.loaders.Resource, next: () => void): void
{
    if (resource.data && AUDIO_EXTENSIONS.indexOf((resource as any)._getExtension()) > -1)
    {
        (resource as any).sound = sound.add(resource.name, {
            loaded: next,
            preload: true,
            srcBuffer: resource.data,
        });
    }
    else
    {
        next();
    }
}

/**
 * Middleware factory for addPixiMiddleware
 */
function middlewareFactory()
{
    return middleware;
}

/**
 * Install the middleware
 * @private
 */
export function install()
{
    // Configure PIXI Loader to handle audio files correctly
    const Resource = PIXI.loaders.Resource;

    // Load all audio files as ArrayBuffers
    AUDIO_EXTENSIONS.forEach((ext) => {
        Resource.setExtensionXhrType(ext, Resource.XHR_RESPONSE_TYPE.BUFFER);
        Resource.setExtensionLoadType(ext, Resource.LOAD_TYPE.XHR);
    });

    // Install the middleware
    PIXI.loaders.Loader.addPixiMiddleware(middlewareFactory);
    PIXI.loader.use(middleware);
}
