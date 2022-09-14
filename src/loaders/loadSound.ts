import { utils, extensions, ExtensionType } from '@pixi/core';
import { LoadAsset, LoaderParserPriority } from '@pixi/assets';
import { supported } from '../utils/supported';
import { Options, Sound } from '../Sound';

import type { LoaderParser } from '@pixi/assets';
import { getInstance } from '../instance';

/** Get the alias for the sound */
const getAlias = (asset: LoadAsset) =>
{
    const url = asset.src;

    return (asset as any)?.alias?.[0] ?? utils.path.basename(url, utils.path.extname(url));
};

/** Simple loader plugin for loading text data */
const loadSound = {
    extension: {
        type: ExtensionType.LoadParser,
        priority: LoaderParserPriority.High,
    },

    /** Should we attempt to load this file? */
    test(url: string): boolean
    {
        const ext = utils.path.extname(url).slice(1);

        return !!supported[ext];
    },

    /** Load the sound file, this is mostly handled by Sound.from() */
    async load(url: string, asset: LoadAsset<Omit<Options, 'url'|'preload'>>): Promise<Sound>
    {
        // We'll use the internal Sound.from to load the asset
        const sound = await new Promise<Sound>((resolve, reject) => Sound.from({
            ...asset.data,
            url,
            preload: true,
            loaded(err, sound)
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(sound);
                }
                asset.data?.loaded?.(err, sound);
            },
        }));

        getInstance().add(getAlias(asset), sound);

        return sound;
    },

    /** Remove the sound from the library */
    async unload(_sound: Sound, asset: LoadAsset): Promise<void>
    {
        getInstance().remove(getAlias(asset));
    }
} as LoaderParser;

extensions.add(loadSound);

export { loadSound };
