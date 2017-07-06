import typescript from 'rollup-plugin-typescript2';
import uglify from 'rollup-plugin-uglify-es';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

const prod = process.env.BUILD === 'prod';
const suffix = prod ? '.min' : '';
const plugins = [
    typescript(),
    resolve({ jsnext: true }),
    commonjs()
];
const compiled = (new Date()).toUTCString().replace(/GMT/g, 'UTC');

// Minify output for production
if (prod) {
    plugins.push(uglify());
}

const banner = `/*!
 * ${pkg.name} - v${pkg.version}
 * https://github.com/pixijs/pixi-sound
 * Compiled ${compiled}
 *
 * ${pkg.name} is licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license
 */`;

/**
 * This configuration is designed for building the browser version
 * of the library, ideally included using the <script> element
 */
export default {
    entry: 'src/browser.ts',
    sourceMap: true,
    moduleName: 'PixiSound',
    intro: 'if (typeof PIXI === "undefined") { throw "PixiJS required"; }',
    banner,
    dest: `dist/pixi-sound${suffix}.js`,
    format: 'iife',
    plugins
};