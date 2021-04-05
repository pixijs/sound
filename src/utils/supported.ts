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
    "caf",
];

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
 * @property {boolean} caf - `true` if file-type is supported. Note that for this we check if the
 *                             'opus' codec is supported inside the caf container.
 */
export const supported: ExtensionMap = {};

/**
 * Function to validate file type formats. This is called when the library initializes, but can
 * be called again if you need to recognize a format not listed in PIXI.sound.utils.extensions at
 * initialization.
 * @method PIXI.sound.utils.validateFormats
 * @static
 * @param {object} typeOverrides - Dictionary of type overrides (inputs for
 *                                 AudioElement.canPlayType()), keyed by extension from the
 *                                 PIXI.sound.utils.extensions array.
 */
export function validateFormats(typeOverrides?: {[key: string]: string}) {
    const overrides: {[key: string]: string} = {
        m4a: "audio/mp4",
        oga: "audio/ogg",
        opus: "audio/ogg; codecs=\"opus\"",
        caf: "audio/x-caf; codecs=\"opus\"", ...(typeOverrides || {})};
    const audio = document.createElement("audio");
    const formats: ExtensionMap = {};
    const no = /^no$/;
    extensions.forEach((ext) => {
        const canByExt = audio.canPlayType(`audio/${ext}`).replace(no, "");
        const canByType = overrides[ext] ? audio.canPlayType(overrides[ext]).replace(no, "") : "";
        formats[ext] = !!canByExt || !!canByType;
    });
    Object.assign(supported, formats);
}

// initialize supported
validateFormats();
