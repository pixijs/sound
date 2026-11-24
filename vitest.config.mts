import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Jest-style globals (describe, it, expect, vi), so test files need no imports
        globals: true,
        include: ['test/**/*.test.ts'],
        browser: {
            // Tests need a real AudioContext and HTMLAudioElement, so they run in a real browser
            enabled: true,
            headless: true,
            screenshotFailures: false,
            instances: [
                {
                    browser: 'chromium',
                    provider: playwright({
                        // Let audio start without a click
                        launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
                    }),
                },
                {
                    browser: 'firefox',
                    provider: playwright({
                        // Let audio start without a click
                        launchOptions: { firefoxUserPrefs: { 'media.autoplay.default': 0 } },
                    }),
                },
            ],
        },
    },
});
