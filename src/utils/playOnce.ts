import { getInstance } from "../instance";

/**
 * Increment the alias for play once
 * @static
 * @private
 * @default 0
 */
export let PLAY_ID = 0;

/**
 * Create a new "Audio" stream based on given audio path and project uri; returns the audio object.
 * @method PIXI.sound.utils.playOnce
 * @static
 * @param {String} fileName Full path of the file to play.
 * @param {Function} callback Callback when complete.
 * @return {string} New audio element alias.
 */
export function playOnce(url: string, callback?: (err?: Error) => void): string
{
    const alias = `alias${PLAY_ID++}`;

    getInstance().add(alias, {
        url,
        preload: true,
        autoPlay: true,
        loaded: (err: Error) => {
            if (err)
            {
                console.error(err);
                getInstance().remove(alias);
                if (callback)
                {
                    callback(err);
                }
            }
        },
        complete: () => {
            getInstance().remove(alias);
            if (callback)
            {
                callback(null);
            }
        },
    });
    return alias;
}
