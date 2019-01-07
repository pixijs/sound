import { LoaderMiddleware } from "./LoaderMiddleware";

/**
 * Loader to replace the default PIXI Loader, this will
 * provide support for auto-install `pre`, currently only the `addPixiMiddleware`
 * method only support's **resource-loader's** `use` method.
 * @namespace PIXI.sound.loader
 * @class
 * @private
 */
export class Loader extends PIXI.loaders.Loader
{
    /**
     * @param {string} [baseUrl=''] - The base url for all resources loaded by this loader.
     * @param {number} [concurrency=10] - The number of resources to load concurrently.
     */
    constructor(baseUrl?: string, concurrency?: number)
    {
        super(baseUrl, concurrency);

        this.use(LoaderMiddleware.use);
        this.pre(LoaderMiddleware.pre);
    }

    /**
     * Adds a default middleware to the PixiJS loader.
     *
     * @static
     * @param {Function} fn - The middleware to add.
     */
    public static addPixiMiddleware(fn: () => void): void
    {
        super.addPixiMiddleware(fn);
    }
}
