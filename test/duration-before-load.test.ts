import { Sound, sound } from '../src';

import type { MockInstance } from 'vitest';

const alert = '/test/resources/alert-4.mp3';
const missing = '/test/resources/missing-113.mp3';

// The loaded callback doesn't pass the sound on error, so keep the one from Sound.from
const load = (url: string): Promise<{ err: Error; s: Sound }> =>
    new Promise((resolve) =>
    {
        const s = Sound.from({
            url,
            preload: true,
            loaded: (err) => resolve({ err, s }),
        });
    });

for (const useLegacy of [false, true])
{
    describe(`Duration before load (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        const alias = `duration-before-load-${useLegacy}`;
        let assertSpy: MockInstance;

        beforeAll(() =>
        {
            sound.useLegacy = useLegacy;
            (Sound as any)._pool.length = 0;
        });

        beforeEach(() =>
        {
            assertSpy = vi.spyOn(console, 'assert');
        });

        afterEach(() =>
        {
            assertSpy.mockRestore();
            if (sound.exists(alias))
            {
                sound.remove(alias);
            }
        });

        afterAll(() =>
        {
            (Sound as any)._pool.length = 0;
        });

        it('should return NaN from a sound that is not loaded', () =>
        {
            const s = Sound.from({ url: alert, preload: false });

            expect(s.isPlayable).toBe(false);
            expect(s.duration).toBeNaN();
            s.destroy();
        });

        it('should return NaN from the library when the sound is not loaded', () =>
        {
            sound.add(alias, { url: alert, preload: false });

            expect(sound.duration(alias)).toBeNaN();
        });

        it('should return NaN while the sound is loading', async () =>
        {
            let s: Sound;
            const loaded = new Promise<void>((resolve, reject) =>
            {
                s = Sound.from({
                    url: alert,
                    preload: true,
                    loaded: (err) => (err ? reject(err) : resolve()),
                });
            });

            expect(s.isLoaded).toBe(false);
            expect(s.duration).toBeNaN();
            await loaded;
            s.destroy();
        });

        it('should return NaN when loading failed', async () =>
        {
            const { err, s } = await load(missing);

            expect(err).toBeInstanceOf(Error);
            expect(s.duration).toBeNaN();
            s.destroy();
        });

        it('should return the real duration once loaded', async () =>
        {
            const { err, s } = await load(alert);

            expect(err).toBeFalsy();
            expect(s.isPlayable).toBe(true);
            // alert-4.mp3 is about 1.26 s decoded, 1.33 s from the <audio> element
            expect(s.duration).toBeGreaterThan(1.2);
            expect(s.duration).toBeLessThan(1.4);
            s.destroy();
        });

        it('should return NaN after the sound is destroyed', async () =>
        {
            const { err, s } = await load(alert);

            expect(err).toBeFalsy();
            s.destroy();
            expect(s.duration).toBeNaN();
        });

        it('should not log a failed assertion when read before load', () =>
        {
            const s = Sound.from({ url: alert, preload: false });

            expect(s.duration).toBeNaN();
            expect(assertSpy.mock.calls.filter(([ok]) => !ok)).toEqual([]);
            s.destroy();
        });
    });
}
