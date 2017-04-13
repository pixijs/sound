import soundLibrary from "../index";
import SoundLibrary from "../SoundLibrary";

// Supported audio formats
const AUDIO_EXTENSIONS: string[] = ["wav", "mp3", "ogg", "oga", "m4a"];

/**
 * Actual resource-loader middleware for sound class
 */
function middleware(resource: PIXI.loaders.Resource, next: () => void): void
{
    if (resource.data && AUDIO_EXTENSIONS.indexOf(resource.extension) > -1)
    {
        (resource as any).sound = soundLibrary.add(resource.name, {
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
export function install(soundLibrary:SoundLibrary)
{
    // Configure PIXI Loader to handle audio files correctly
    const Resource = PIXI.loaders.Resource;

    // Make sure we support webaudio
    if (soundLibrary.supported && !soundLibrary.forceLegacy)
    {
        // Load all audio files as ArrayBuffers
        AUDIO_EXTENSIONS.forEach((ext) => {
            Resource.setExtensionXhrType(ext, Resource.XHR_RESPONSE_TYPE.BUFFER);
            Resource.setExtensionLoadType(ext, Resource.LOAD_TYPE.XHR);
        });
    }
    else
    {
        // Fall back to loading as <audio> elements
        AUDIO_EXTENSIONS.forEach((ext) => {
            Resource.setExtensionLoadType(ext, Resource.LOAD_TYPE.AUDIO);
        });
    }

    // Install the middleware
    PIXI.loaders.Loader.addPixiMiddleware(middlewareFactory);
    PIXI.loader.use(middleware);
}
