import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';

/**
 * This configuration is for building bundles that
 * will be used by node building environments, like
 * Rollup, Webpack, Electron.
 */
export default {
    entry: 'src/index.ts',
    sourceMap: true,
    external: Object.keys(pkg.dependencies),
    targets: [
        {
            dest: 'module/index.es.js',
            format: 'es'
        },
        {
            dest: 'module/index.js',
            format: 'cjs'
        }
    ],
    plugins: [
        typescript({
            tsconfig: 'tsconfig.module.json'
        })
    ]
};