export type ExtensionMap = {[key: string]: boolean};

/**
 * The list of extensions that can be played.
 * @readonly
 * @static
 * @member {string[]} PIXI.sound.utils.extensions
 */
export const extensions: string[] = [
    "mp3",
    "ogg",
    "oga",
    "opus",
    "mpeg",
    "wav",
    "m4a",
    "aiff",
    "wma",
    "mid",
];

/**
 * Internal function to validate file type formats
 * @private
 * @return {object} map of support by type
 */
function validateFormats(): ExtensionMap {
    const overrides: {[key: string]: string} = {
        m4a: "mp4",
        oga: "ogg",
    };
    const audio = document.createElement("audio");
    const formats: ExtensionMap = {};
    const no = /^no$/;
    extensions.forEach((ext) => {
        const type = overrides[ext] || ext;
        const canByExt = audio.canPlayType(`audio/${ext}`).replace(no, "");
        const canByType = audio.canPlayType(`audio/${type}`).replace(no, "");
        formats[ext] = !!canByExt || !!canByType;
    });
    return Object.freeze(formats);
}

/**
 * The list of browser supported audio formats.
 * @readonly
 * @static
 * @member {Object} PIXI.sound.utils.supported
 * @property {boolean} mp3 - `true` if file-type is supported
 * @property {boolean} ogg - `true` if file-type is supported
 * @property {boolean} oga - `true` if file-type is supported
 * @property {boolean} opus - `true` if file-type is supported
 * @property {boolean} mpeg - `true` if file-type is supported
 * @property {boolean} wav - `true` if file-type is supported
 * @property {boolean} aiff - `true` if file-type is supported
 * @property {boolean} wma - `true` if file-type is supported
 * @property {boolean} mid - `true` if file-type is supported
 */
export const supported = validateFormats();
