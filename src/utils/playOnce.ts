import { getInstance } from '../instance';

/**
 * Increment the alias for play once
 * @static
 * @default 0
 */
let PLAY_ID = 0;

/**
 * Create a new "Audio" stream based on given audio path and project uri; returns the audio object.
 * @memberof utils
 * @param url - Full path of the file to play.
 * @param {Function} callback - Callback when complete.
 * @return New audio element alias.
 */
function playOnce(url: string, callback?: (err?: Error) => void): string
{
    const alias = `alias${PLAY_ID++}`;

    getInstance().add(alias, {
        url,
        preload: true,
        autoPlay: true,
        loaded: (err: Error) =>
        {
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
        complete: () =>
        {
            getInstance().remove(alias);
            if (callback)
            {
                callback(null);
            }
        },
    });

    return alias;
}

export { playOnce, PLAY_ID };
