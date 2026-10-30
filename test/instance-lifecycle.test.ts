import path from 'path';
import { IMediaInstance, Sound, sound, webaudio } from '../src';

const musical = path.join(__dirname, 'resources', 'musical-11.mp3');

function wait(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Loudest sample on the library's analyser, read once the context is running again. */
async function level(): Promise<number>
{
    const context = sound.context as webaudio.WebAudioContext;

    for (let i = 0; i < 50 && context.audioContext.state !== 'running'; i++)
    {
        await wait(10);
    }
    expect(context.audioContext.state).toBe('running');
    await wait(100);
    const data = new Uint8Array(context.analyser.fftSize);

    context.analyser.getByteTimeDomainData(data);

    return Math.max(...Array.from(data, (value) => Math.abs(value - 128)));
}

function clearPool(): void
{
    (Sound as any)._pool.length = 0;
}

for (const useLegacy of [false, true])
{
    describe(`Instance lifecycle (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        const alias = `lifecycle-${useLegacy}`;
        let music: Sound;

        async function playCounted(): Promise<{ instance: IMediaInstance, stopCount: () => number }>
        {
            const instance = music.play() as IMediaInstance;
            let stops = 0;

            instance.on('stop', () => stops++);
            // let the HTML element report it is playing before anything pauses it
            await wait(50);

            return { instance, stopCount: () => stops };
        }

        async function expectSilent(): Promise<void>
        {
            if (!useLegacy)
            {
                expect(await level()).toBe(0);
            }
        }

        beforeAll(async () =>
        {
            sound.useLegacy = useLegacy;
            clearPool();
            music = await new Promise<Sound>((resolve, reject) =>
            {
                sound.add(alias, {
                    url: musical,
                    preload: true,
                    loaded: (err, s) => (err ? reject(err) : resolve(s)),
                });
            });
        });

        afterEach(() =>
        {
            // Stop playing instances before resuming, so a resume can't restart them over themselves (#137)
            music.stop();
            window.dispatchEvent(new Event('focus'));
            sound.resumeAll();
            music.resume();
            music.instances.forEach((instance) =>
            {
                instance.paused = false;
            });
            music.stop();
        });

        afterAll(() =>
        {
            sound.remove(alias);
            clearPool();
        });

        if (!useLegacy)
        {
            const origins: [string, boolean][] = [['fresh', false], ['pooled', true]];

            // Runs before the blur test below, while the context has no saved pre-blur state
            it.each(origins)('should not restart a playing %s instance on a focus with no blur first',
                async (_name, pooled) =>
                {
                    expect((sound.context as any)._pausedOnBlur).toBeUndefined();
                    clearPool();
                    if (pooled)
                    {
                        (music.play() as IMediaInstance).stop();
                    }
                    const instance = music.play({ loop: true }) as IMediaInstance;
                    let resumes = 0;

                    instance.on('resumed', () => resumes++);
                    await wait(50);
                    window.dispatchEvent(new Event('focus'));

                    expect(resumes).toBe(0);
                    music.stop();
                    expect(await level()).toBe(0);
                });
        }

        it('should not emit stop again from an instance that was already stopped', async () =>
        {
            const { instance } = await playCounted();
            let stops = 0;

            instance.stop();
            instance.on('stop', () => stops++);
            instance.stop();

            expect(stops).toBe(0);
        });

        it('should stop an instance paused on itself', async () =>
        {
            const { instance, stopCount } = await playCounted();

            instance.paused = true;
            instance.stop();

            expect(stopCount()).toBe(1);
            expect(music.instances.length).toBe(0);
        });

        it('should stop an instance whose sound is paused, and not restart on resume', async () =>
        {
            const { instance, stopCount } = await playCounted();

            music.pause();
            instance.stop();
            music.resume();

            expect(stopCount()).toBe(1);
            expect(music.instances.length).toBe(0);
            await expectSilent();
        });

        it('should stop an instance paused by pauseAll, and not restart on resumeAll', async () =>
        {
            const { instance, stopCount } = await playCounted();

            sound.pauseAll();
            instance.stop();
            sound.resumeAll();

            expect(stopCount()).toBe(1);
            expect(music.instances.length).toBe(0);
            await expectSilent();
        });

        it('should stop every instance of a paused sound with Sound.stop', async () =>
        {
            const first = await playCounted();
            const second = await playCounted();

            music.pause();
            music.stop();
            music.resume();

            expect(first.stopCount()).toBe(1);
            expect(second.stopCount()).toBe(1);
            expect(music.instances.length).toBe(0);
            await expectSilent();
        });

        it('should stop paused sounds with stopAll', async () =>
        {
            const { stopCount } = await playCounted();

            sound.pauseAll();
            sound.stopAll();
            sound.resumeAll();

            expect(stopCount()).toBe(1);
            expect(music.instances.length).toBe(0);
            await expectSilent();
        });

        if (!useLegacy)
        {
            // HTMLAudioContext has no blur handling, so only WebAudio auto-pauses
            it('should stop an instance paused by window blur, and not restart on focus', async () =>
            {
                const { instance, stopCount } = await playCounted();

                window.dispatchEvent(new Event('blur'));
                expect(sound.context.paused).toBe(true);
                instance.stop();
                window.dispatchEvent(new Event('focus'));

                expect(stopCount()).toBe(1);
                expect(music.instances.length).toBe(0);
                await expectSilent();
            });
        }

        const resumeCalls: [string, (instance: IMediaInstance) => void][] = [
            ['resumeAll()', () => sound.resumeAll()],
            ['music.resume()', () => music.resume()],
            ['music.paused = false', () =>
            {
                music.paused = false;
            }],
            ['instance.paused = false', (instance) =>
            {
                instance.paused = false;
            }],
        ];

        it.each(resumeCalls)('should do nothing on %s for a playing instance that was never paused', async (_name, resume) =>
        {
            // a pooled instance hides this, destroy() resets its paused state
            clearPool();
            const instance = music.play({ loop: true }) as IMediaInstance;
            let resumes = 0;

            instance.on('resumed', () => resumes++);
            await wait(50);
            resume(instance);

            expect(resumes).toBe(0);
            // HTML turns the loop off when it resumes
            expect(instance.loop).toBe(true);
            music.stop();
            await expectSilent();
        });

        // An HTML instance has one element, so there's no second source to leak or unstarted one to stop
        if (!useLegacy)
        {
            it('should stop the old source when an instance is played again', async () =>
            {
                const instance = music.play({ loop: true }) as IMediaInstance;

                await wait(50);
                instance.play({ start: 0, end: null, speed: 1, volume: 1, loop: true, muted: false });
                music.stop();

                expect(await level()).toBe(0);
            });

            it('should not let the old source end an instance that was played again', async () =>
            {
                // the first source ends about 1s after the replay, the second about 1.8s after
                const instance = music.play({ start: music.duration - 1.3 }) as IMediaInstance;

                await wait(300);
                instance.play({ start: music.duration - 1.8, end: null, speed: 1, volume: 1, loop: false, muted: false });
                await wait(1300);

                expect(music.instances).toContain(instance);
                music.stop();
                expect(await level()).toBe(0);
            });

            it('should stop an instance whose play() threw before it started', () =>
            {
                const assert = jest.spyOn(console, 'assert').mockImplementation(() => undefined);

                expect(() => music.play({ start: 1, end: 0.5 })).toThrow(RangeError);
                assert.mockRestore();
                expect(() => music.stop()).not.toThrow();
                expect(music.instances.length).toBe(0);
            });

            it('should stop an instance whose resume threw', async () =>
            {
                const instance = music.play() as IMediaInstance;

                await wait(50);
                instance.paused = true;
                instance.volume = NaN;
                expect(() =>
                {
                    instance.paused = false;
                }).toThrow(TypeError);

                expect(() => music.stop()).not.toThrow();
                expect(music.instances.length).toBe(0);
            });
        }
    });
}
