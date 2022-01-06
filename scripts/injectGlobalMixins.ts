import path from 'path';
import fs from 'fs';
import pkg from '../package.json';

async function main(): Promise<void>
{
    const { types } = pkg;
    const typesPath = path.resolve(path.dirname(__dirname), types);
    const buffer = await fs.promises.readFile(typesPath, 'utf-8');
    const inject = `/// <reference path="../global.d.ts" />\n`;

    if (!buffer.includes(inject))
    {
        await fs.promises.writeFile(typesPath, inject + buffer);
        // eslint-disable-next-line no-console
        console.log('Types patched with GlobalMixins.');
    }
}

main();
