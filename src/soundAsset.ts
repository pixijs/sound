import { utils, extensions, ExtensionType } from '@pixi/core';
import { AssetExtension, LoadAsset, LoaderParser, LoaderParserPriority } from '@pixi/assets';
import { supported, extensions as exts, mimes } from './utils/supported';
import { Options, Sound } from './Sound';
import { getInstance } from './instance';

/**
 * Get every alias for the sound. The first one is the first resolver alias, or the
 * basename for a source with no alias, so a URL load stays registered under its URL.
 */
const getAliases = (asset: LoadAsset) =>
{
    const url = asset.src;
    const aliases: string[] = (asset as any)?.alias || [];
    const first: string = aliases[0] ?? utils.path.basename(url, utils.path.extname(url));

    return [...new Set([first, ...aliases.filter(Boolean)])];
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

            for (const alias of getAliases(asset))
            {
                getInstance().add(alias, sound);
            }

            return sound;
        },

        /** Remove the sound from the library */
        async unload(_sound: Sound, asset: LoadAsset): Promise<void>
        {
            const library = getInstance();
            const alias = getAliases(asset).find((name) => library.exists(name) && library.find(name) === _sound);

            // Removing one alias removes every reference to this sound. It may already
            // have been removed manually, or an alias may now belong to another sound.
            if (alias !== undefined)
            {
                library.remove(alias);
            }
            else if (_sound.media)
            {
                _sound.destroy();
            }
        },
    } as LoaderParser<Sound>,
} as AssetExtension;

extensions.add(soundAsset);

export { soundAsset };
