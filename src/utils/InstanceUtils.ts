import Sound from "../Sound";
import {IMediaInstance} from "../interfaces/IMediaInstance";

const pool: IMediaInstance[] = [];

export function createInstance(parent: Sound): IMediaInstance
{
    if (pool.length > 0)
    {
        const instance:IMediaInstance = pool.pop();
        instance.init(parent.media);
        return instance;
    }
    return parent.media.create(parent.media);
}

export function poolInstance(instance:IMediaInstance): void
{
    instance.destroy();
    // Add it if it isn't already added
    if (pool.indexOf(instance) < 0)
    {
        pool.push(instance);
    }
}
