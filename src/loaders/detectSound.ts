import type { FormatDetectionParser } from '@pixi/assets';
import { extensions, ExtensionType } from '@pixi/core';
import { supported, extensions as exts } from '../utils/supported';

/** Add supported extensions to Assets */
const detectSound = {
    extension: ExtensionType.DetectionParser,
    test: async () => true,
    add: async (formats) => [...formats, ...exts.filter((ext) => supported[ext])],
    remove: async (formats) => formats.filter((ext) => formats.includes(ext)),
} as FormatDetectionParser;

extensions.add(detectSound);

export { detectSound };
