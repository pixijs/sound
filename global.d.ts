declare namespace GlobalMixins
{
    // PixiJS 6.1+ supports mixin types for LoaderResource
    interface LoaderResource
    {
        /** Reference to Sound object created. */
        sound?: import('./').Sound;
    }
}