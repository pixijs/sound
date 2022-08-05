import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import pkg from "../package.json";

const plugins = [typescript()];

// Disabling minification makes faster
// watch and better coverage debugging
if (process.env.NODE_ENV === "production") {
    plugins.push(terser({
        output: {
            comments(node, comment) {
                return comment.line === 1;
            },
        },
        compress: {
            drop_console: true,
        },
    }));
}

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
                "@pixi/loaders": "PIXI",
                "@pixi/core": "PIXI",
                "@pixi/ticker": "PIXI",
                "@pixi/utils": "PIXI.utils",
            },
        }
    }
];
