import SoundLibrary from './SoundLibrary';
import { install } from './LoaderMiddleware'

// Cast as any
const root = global as any;

// Create instance of the library
const sound:SoundLibrary = new SoundLibrary();

// There's no PIXI object, create it
// library doesn't depend on PIXI strictly
if (root.PIXI === undefined)
{
    /**
     * @namespace PIXI
     */
    root.PIXI = {};
}
else if (root.PIXI.loaders !== undefined)
{
    // Install the middleware to support 
    // PIXI.loader and new PIXI.loaders.Loader
    install(root.PIXI);
}

/**
 * Playing sound files with WebAudio API
 * @namespace PIXI.sound
 */
Object.defineProperty(root.PIXI, 'sound', 
{
    get() { return sound; }
});

// Export the default plugin instance
export default sound;