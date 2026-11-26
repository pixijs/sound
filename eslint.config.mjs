import config from '@pixi/extension-scripts/eslint';

export default [
    ...config,
    {
        files: ['examples/client/**'],
        languageOptions: {
            globals: { PIXI: 'readonly', jQuery: 'readonly', hljs: 'readonly', sortable: 'readonly' },
        },
        rules: { 'func-names': 0, 'no-eval': 0 },
    },
    {
        // Tests call play() without awaiting it: it only returns a promise while the sound loads
        files: ['test/**'],
        rules: { 'func-names': 0, '@typescript-eslint/no-floating-promises': 0 },
    },
];
