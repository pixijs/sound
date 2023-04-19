import { utils, extensions, ExtensionType } from '@pixi/core';
import { AssetExtension, LoadAsset, LoaderParser, LoaderParserPriority } from '@pixi/assets';
import { supported, extensions as exts, mimes } from './utils/supported';
import { Options, Sound } from './Sound';
import { getInstance } from './instance';

/** Get the alias for the sound */
const getAlias = (asset: LoadAsset) =>
{
    const url = asset.src;

    return (asset as any)?.alias?.[0] ?? utils.path.basename(url, utils.path.extname(url));
};

/**
 * Simple loader plugin for loading text data.
 */
const soundAsset = {
    extension: ExtensionType.Asset,
    detection: {
        test: async () => true,
        add: async (formats) => [...formats, ...exts.filter((ext) => supported[ext])],
        remove: async (formats) => formats.filter((ext) => formats.includes(ext)),
    },
    loader: {
        extension: {
            type: [ExtensionType.LoadParser],
            priority: LoaderParserPriority.High,
        },

        /** Should we attempt to load this file? */
        test(url: string): boolean
        {
            const ext = utils.path.extname(url).slice(1);

            return !!supported[ext] || mimes.some((mime) => url.startsWith(`data:${mime}`));
        },

        /** Load the sound file, this is mostly handled by Sound.from() */
        async load(url: string, asset: LoadAsset<Omit<Options, 'url' | 'preload'>>): Promise<Sound>
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
        },
    } as LoaderParser<Sound>,
} as AssetExtension;

extensions.add(soundAsset);

export { soundAsset };
