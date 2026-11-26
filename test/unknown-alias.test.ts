import { htmlaudio, Sound, sound, webaudio } from '../src';

import type { MockInstance } from 'vitest';

const musical = '/test/resources/musical-11.mp3';
const sprites = { a: { start: 0, end: 0.1 } };

for (const useLegacy of [false, true])
{
    describe(`Unknown alias or sprite (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        const alias = `unknown-alias-${useLegacy}`;
        let loaded: Sound;
        let assert: MockInstance;
        // console.assert is also called with true on every lookup, so count only the failures
        const failedAsserts = (): number => assert.mock.calls.filter(([ok]) => !ok).length;

        beforeAll(async () =>
        {
            sound.useLegacy = useLegacy;
            (Sound as any)._pool.length = 0;
            loaded = await new Promise<Sound>((resolve, reject) =>
            {
                Sound.from({
                    url: musical,
                    preload: true,
                    sprites,
                    loaded: (err, s) => (err ? reject(err) : resolve(s)),
                });
            });
            sound.add(alias, loaded);
        });

        beforeEach(() =>
        {
            assert = vi.spyOn(console, 'assert').mockImplementation(() => undefined);
        });

        afterEach(() =>
        {
            assert.mockRestore();
            loaded.stop();
        });

        afterAll(() =>
        {
            sound.remove(alias);
            (Sound as any)._pool.length = 0;
        });

        it.each([
            ['sound.play', () => sound.play('nope'), null],
            ['sound.stop', () => sound.stop('nope'), undefined],
            ['sound.pause', () => sound.pause('nope'), undefined],
            ['sound.resume', () => sound.resume('nope'), undefined],
            ['sound.volume', () => sound.volume('nope'), NaN],
            ['sound.volume with a value', () => sound.volume('nope', 0.5), NaN],
            ['sound.speed', () => sound.speed('nope'), NaN],
            ['sound.speed with a value', () => sound.speed('nope', 2), NaN],
            ['sound.duration', () => sound.duration('nope'), NaN],
            ['sound.play with a sprite name', () => sound.play(alias, 'nope'), null],
            ['Sound.play with a sprite name', () => loaded.play('nope'), null],
            ['Sound.play with a sprite option', () => loaded.play({ sprite: 'nope' }), null],
        ])('should assert once and not throw: %s', (_name, call, expected) =>
        {
            expect(call()).toBe(expected);
            expect(failedAsserts()).toBe(1);
        });

        it('should assert once and not throw: Sound.play with a sprite before load', () =>
        {
            const notLoaded = Sound.from({ url: musical, sprites });

            onTestFinished(() => notLoaded.destroy());
            expect(notLoaded.play('nope')).toBe(null);
            expect(failedAsserts()).toBe(1);
        });

        it('should assert once and keep other sounds: sound.remove', () =>
        {
            expect(sound.remove('nope')).toBe(sound);
            expect(failedAsserts()).toBe(1);
            expect(sound.find(alias)).toBe(loaded);
        });

        it('should still play a known sprite and read a known sound', () =>
        {
            const Instance = useLegacy ? htmlaudio.HTMLAudioInstance : webaudio.WebAudioInstance;

            expect(sound.play(alias, 'a')).toBeInstanceOf(Instance);
            expect(sound.volume(alias)).toBe(1);
            expect(sound.speed(alias)).toBe(1);
            expect(sound.speed(alias, 2)).toBe(2);
            expect(sound.duration(alias)).toBeGreaterThan(0);
            expect(failedAsserts()).toBe(0);
            sound.speed(alias, 1);
        });
    });
}
