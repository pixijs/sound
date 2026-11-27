import { htmlaudio, type IMediaInstance, Sound, sound } from '../src';

const alert = '/test/resources/alert-7.mp3';

function wait(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

for (const useLegacy of [false, true])
{
    describe(`Resume a loop (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        const alias = `resume-loop-${useLegacy}`;
        let music: Sound;
        let ends: number;

        /** How many times the playing instance has ended. */
        function ended(): number
        {
            return ends;
        }

        /** Seconds into the file, from the public progress. */
        function position(instance: IMediaInstance): number
        {
            return instance.progress * music.duration;
        }

        /** Waits until `done` is true or the instance ends, and fails after 3 seconds. */
        async function until(done: () => boolean): Promise<void>
        {
            const deadline = Date.now() + 3000;

            while (ended() === 0 && !done() && Date.now() < deadline)
            {
                await wait(5);
            }
            expect(Date.now()).toBeLessThan(deadline);
        }

        // Four times as fast, so a case waits about 0.2s for the file rather than 0.7s.
        // Positions below are in the file's seconds, so a frame of delay moves them four times as far.
        function play(options?: { loop?: boolean, sprite?: string, speed?: number }): IMediaInstance
        {
            const instance = music.play({ speed: 4, ...options }) as IMediaInstance;

            ends = 0;
            instance.on('end', () => ends++);

            return instance;
        }

        /** Plays on until the position jumps back, and returns where it landed. */
        async function nextWrap(instance: IMediaInstance): Promise<number>
        {
            let last = position(instance);
            let wrapped = false;

            await until(() =>
            {
                const now = position(instance);

                wrapped = now < last - 0.05;
                last = now;

                return wrapped;
            });

            return last;
        }

        beforeAll(async () =>
        {
            sound.useLegacy = useLegacy;
            (Sound as any)._pool.length = 0;
            music = await new Promise<Sound>((resolve, reject) =>
            {
                sound.add(alias, {
                    url: alert,
                    preload: true,
                    sprites: { part: { start: 0.1, end: 0.3 } },
                    loaded: (err, s) => (err ? reject(err) : resolve(s!)),
                });
            });
        });

        afterEach(() =>
        {
            vi.restoreAllMocks();
            music.stop();
            music.loop = false;
            sound.resumeAll();
            music.resume();
        });

        afterAll(() =>
        {
            sound.remove(alias);
            (Sound as any)._pool.length = 0;
        });

        const pauses: [string, (instance: IMediaInstance) => void][] = [
            ['instance paused', (instance) =>
            {
                instance.paused = true;
                instance.paused = false;
            }],
            ['sound pause and resume', () =>
            {
                music.pause();
                music.resume();
            }],
            ['pauseAll and resumeAll', () =>
            {
                sound.pauseAll();
                sound.resumeAll();
            }],
            ['togglePauseAll twice', () =>
            {
                sound.togglePauseAll();
                sound.togglePauseAll();
            }],
        ];
        const loops: [string, () => IMediaInstance][] = [
            ['loop passed to play()', () => play({ loop: true })],
            ['loop set on the instance', () =>
            {
                const instance = play();

                instance.loop = true;

                return instance;
            }],
            ['loop set on the sound', () =>
            {
                const instance = play();

                music.loop = true;

                return instance;
            }],
        ];
        const cases = loops.flatMap(([loopName, start]) =>
            pauses.map(([pauseName, pauseAndResume]) => [loopName, pauseName, start, pauseAndResume] as const));

        it.each(cases)('should loop the whole file with %s after %s', async (_loop, _pause, start, pauseAndResume) =>
        {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
            const instance = start();
            const loop = instance.loop;

            // far enough in that a loop starting again from the resume point would show
            await until(() => position(instance) > 0.4);
            pauseAndResume(instance);

            expect(instance.loop).toBe(loop);
            expect(warn).not.toHaveBeenCalled();
            const landed = await nextWrap(instance);

            expect(ends).toBe(0);
            expect(landed).toBeLessThan(0.25);
            expect(music.instances).toContain(instance);
        });

        it.each(pauses)('should still end a sound that does not loop after %s', async (_pause, pauseAndResume) =>
        {
            // twice the speed rather than four times, and paused soon after it starts,
            // so that a slow check can't let the file end before the pause
            const instance = play({ speed: 2 });

            await until(() => position(instance) > 0.05);
            expect(ends).toBe(0);
            pauseAndResume(instance);
            await until(() => false);

            expect(ends).toBe(1);
        });

        it.each(pauses)('should end a sprite at its end after %s, three times', async (_pause, pauseAndResume) =>
        {
            // normal speed: HTML checks for the sprite's end once a frame, and at four times
            // the speed a frame runs too far past it for the check below
            const instance = play({ sprite: 'part', speed: 1 });

            let furthest = 0;

            await until(() => position(instance) > 0.15);
            expect(ends).toBe(0);
            // three resumes in a row, so an end that moves on each resume shows
            for (let i = 0; i < 3; i++)
            {
                pauseAndResume(instance);
            }
            await until(() =>
            {
                furthest = ends === 0 ? position(instance) : furthest;

                return false;
            });

            expect(ends).toBe(1);
            // the sprite ends at 0.3, HTML pads that once, and the check runs once a frame
            expect(furthest).toBeLessThan(0.3 + (useLegacy ? htmlaudio.HTMLAudioInstance.PADDING : 0) + 0.15);
        });

        // only HTML plays on past a sprite's end, for PADDING
        it.runIf(useLegacy)('should resume a sprite paused after its end without an assert', async () =>
        {
            const assert = vi.spyOn(console, 'assert');
            const instance = play({ sprite: 'part', speed: 1 });

            await until(() => position(instance) > 0.3);
            expect(ends).toBe(0);
            instance.paused = true;
            instance.paused = false;
            await until(() => false);

            expect(ends).toBe(1);
            expect(assert.mock.calls.filter(([ok]) => !ok)).toEqual([]);
        });
    });
}
