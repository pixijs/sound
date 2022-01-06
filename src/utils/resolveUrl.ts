import type { ILoaderResource } from '@pixi/loaders';
import { supported } from './supported';

/**
 * RegExp for looking for format patterns.
 * @ignore
 */
const FORMAT_PATTERN = /\.(\{([^\}]+)\})(\?.*)?$/;

/**
 * Resolve a URL with different formats in glob pattern to
 * a path based on the supported browser format. For instance:
 * "sounds/music.{ogg,mp3}", would resolve to "sounds/music.ogg"
 * if "ogg" support is found, otherwise, fallback to "sounds.music.mp3"
 * @memberof utils
 * @param {string|PIXI.LoaderResource} source - - Path to resolve or Resource, if
 *        a Resource object is provided, automatically updates the extension and url
 *        of that object.
 * @return The format to resolve to
 */
function resolveUrl(source: string | ILoaderResource): string
{
    // search for patterns like ".{mp3,ogg}""
    const glob = FORMAT_PATTERN;
    const url: string = typeof source === 'string' ? source : source.url;

    if (!glob.test(url))
    {
        return url;
    }

    const match = glob.exec(url);
    const exts = match[2].split(',');
    let replace = exts[exts.length - 1]; // fallback to last ext

    for (let i = 0, len = exts.length; i < len; i++)
    {
        const ext = exts[i];

        if (supported[ext])
        {
            replace = ext;
            break;
        }
    }
    const resolved = url.replace(match[1], replace);

    if (!(typeof source === 'string'))
    {
        // resource-loader marks these as readonly
        const writableSource = source as { extension: string, url: string };

        writableSource.extension = replace;
        writableSource.url = resolved;
    }

    return resolved;
}

export { resolveUrl };
