import { LoaderResource } from "@pixi/loaders";
import { supported } from "./supported";

/**
 * RegExp for looking for format patterns.
 * @static
 * @private
 */
const FORMAT_PATTERN = /\.(\{([^\}]+)\})(\?.*)?$/;

/**
 * Resolve a URL with different formats in glob pattern to
 * a path based on the supported browser format. For instance:
 * "sounds/music.{ogg,mp3}", would resolve to "sounds/music.ogg"
 * if "ogg" support is found, otherwise, fallback to "sounds.music.mp3"
 * @method PIXI.sound.utils.resolveUrl
 * @static
 * @param {string|PIXI.LoaderResource} source - Path to resolve or Resource, if
 *        a Resource object is provided, automatically updates the extension and url
 *        of that object.
 * @return {string} The format to resolve to
 */
export function resolveUrl(source: string | PIXI.LoaderResource): string
{
    // search for patterns like ".{mp3,ogg}""
    const glob = FORMAT_PATTERN;
    const url: string = typeof source === "string" ? source : source.url;

    if (!glob.test(url))
    {
        return url;
    }
    else
    {
        const match = glob.exec(url);
        const exts = match[2].split(",");
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
        if (!(typeof source === "string"))
        {
            source.extension = replace;
            source.url = resolved;
        }
        return resolved;
    }
}
