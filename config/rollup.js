import esbuild from "rollup-plugin-esbuild";
import pkg from "../package.json";

const plugins = [esbuild({
    target: "ES2017",
    minify: process.env.NODE_ENV === "production",
})];
const sourcemap = true;
const external = Object.keys(pkg.peerDependencies);
const compiled = (new Date()).toUTCString().replace(/GMT/g, "UTC");
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
export default [
    {
        input: pkg.source,
        external,
        plugins,
        output: [
            {
                banner,
                freeze: false,
                sourcemap,
                format: "cjs",
                file: pkg.main,
            },
            {
                banner,
                freeze: false,
                sourcemap,
                format: "esm",
                file: pkg.module,
            },
        ],
    },
    {
        input: pkg.sourceBundle,
        external,
        plugins,
        output: {
            banner,
            freeze: false,
            format: "iife",
            name: pkg.namespace,
            exports: 'default',
            sourcemap,
            file: pkg.bundle,
            globals: {
                "@pixi/assets": "PIXI",
                "@pixi/core": "PIXI",
            },
        }
    }
];
