import { IMediaInstance, Sound, sound, webaudio } from '../src';

import type { MockInstance } from 'vitest';

const musical = '/test/resources/musical-11.mp3';

for (const useLegacy of [false, true])
{
    describe(`Sprite speed (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        const alias = `sprite-speed-${useLegacy}`;
        let music: Sound;
        let setParamValue: MockInstance;

        // playbackRate.value doesn't reflect setValueAtTime synchronously,
        // so on WebAudio read the last value refresh() set on the source
        const effectiveRate = (instance: IMediaInstance): number =>
        {
            const source = (instance as any)._source;

            if (useLegacy)
            {
                return source.playbackRate;
            }

            const calls = setParamValue.mock.calls.filter(([param]) => param === source.playbackRate);

            return calls[calls.length - 1]?.[1];
        };

        beforeAll(async () =>
        {
            sound.useLegacy = useLegacy;
            (Sound as any)._pool.length = 0;
            music = await new Promise<Sound>((resolve, reject) =>
            {
                sound.add(alias, {
                    url: musical,
                    preload: true,
                    volume: 0,
                    sprites: {
                        plain: { start: 0, end: 2 },
                        fast: { start: 3, end: 5, speed: 2 },
                    },
                    loaded: (err, s) => (err ? reject(err) : resolve(s)),
                });
            });
        });

        beforeEach(() =>
        {
            setParamValue = vi.spyOn(webaudio.WebAudioUtils, 'setParamValue');
        });

        afterEach(() =>
        {
            music.stop();
            music.speed = 1;
            vi.restoreAllMocks();
        });

        afterAll(() =>
        {
            sound.remove(alias);
            (Sound as any)._pool.length = 0;
        });

        it('should use the speed passed to play with a sprite', () =>
        {
            const plain = music.play({ sprite: 'plain', speed: 0.5 }) as IMediaInstance;
            const fast = music.play({ sprite: 'fast', speed: 0.5 }) as IMediaInstance;

            expect(plain.speed).toBe(0.5);
            expect(fast.speed).toBe(0.5);
        });

        it('should use the speed passed to the library play with a sprite', () =>
        {
            const instance = sound.play(alias, { sprite: 'fast', speed: 0.5 }) as IMediaInstance;

            expect(instance.speed).toBe(0.5);
        });

        it('should multiply the play speed of a sprite by the sound speed, also after resume', () =>
        {
            music.speed = 1.5;

            const instance = music.play({ sprite: 'fast', speed: 0.5 }) as IMediaInstance;

            expect(instance.speed).toBe(0.5);
            expect(effectiveRate(instance)).toBeCloseTo(0.75);

            instance.paused = true;
            instance.paused = false;

            expect(instance.speed).toBe(0.5);
            expect(effectiveRate(instance)).toBeCloseTo(0.75);
        });

        it('should fall back to the sprite speed when play gets no speed', () =>
        {
            expect((music.play({ sprite: 'fast' }) as IMediaInstance).speed).toBe(2);
            expect((music.play({ sprite: 'fast', speed: undefined }) as IMediaInstance).speed).toBe(2);
            expect((music.play('fast') as IMediaInstance).speed).toBe(2);
            expect((music.play('plain') as IMediaInstance).speed).toBe(1);
        });

        it('should not apply the sound speed twice when a sprite plays itself', () =>
        {
            music.speed = 2;

            // The sound speed is applied on top of the instance speed in refresh()
            const plain = music.sprites.plain.play() as IMediaInstance;
            const fast = music.sprites.fast.play() as IMediaInstance;

            expect(plain.speed).toBe(1);
            expect(effectiveRate(plain)).toBeCloseTo(2);
            expect(fast.speed).toBe(2);
            expect(effectiveRate(fast)).toBeCloseTo(4);
            expect((music.play('plain') as IMediaInstance).speed).toBe(1);
        });

        it('should not leak a sprite speed into the next instance', () =>
        {
            music.play({ sprite: 'fast', speed: 0.5 });
            music.play('fast');
            music.stop();

            expect((music.play('plain') as IMediaInstance).speed).toBe(1);
        });
    });
}
