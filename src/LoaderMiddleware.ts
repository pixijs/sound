import sound from './index';

// Supported audio formats
const AUDIO_EXTENSIONS:string[] = ['wav', 'mp3', 'ogg', 'oga'];

/**
 * Actual resource-loader middleware for sound class
 */
function middleware(resource, next):void
{
    if (resource.data && AUDIO_EXTENSIONS.indexOf(resource._getExtension()) > -1)
    {
        resource.sound = sound.add(resource.name, {
            srcBuffer: resource.data,
            preload: true,
            loaded: next
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
 * @param {PIXI} PIXI - Namespace from PIXI
 */
export function install(PIXI)
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