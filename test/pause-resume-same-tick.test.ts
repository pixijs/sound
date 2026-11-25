import { IMediaInstance, Sound, sound, webaudio } from '../src';

const musical = '/test/resources/musical-11.mp3';
const realState = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'state').get;

function wait(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll until the check passes, giving up after `cap` milliseconds. Resolves to whether it passed. */
async function until(check: () => boolean, cap = 2000): Promise<boolean>
{
    const end = performance.now() + cap;

    while (!check() && performance.now() < end)
    {
        await wait(10);
    }

    return check();
}

/**
 * Make `state` behave as it does on Firefox and Safari: it keeps its old value
 * until the suspend() or resume() promise settles. Returns a function that undoes it.
 */
function lagState(ctx: AudioContext): () => void
{
    let reported = realState.call(ctx);
    const update = () => { reported = realState.call(ctx); };
    const lagged = (method: () => Promise<void>) => () =>
    {
        const promise = method.call(ctx);

        promise.then(update, update);

        return promise;
    };

    Object.defineProperty(ctx, 'state', { configurable: true, get: () => reported });
    ctx.suspend = lagged(ctx.suspend);
    ctx.resume = lagged(ctx.resume);

    return () =>
    {
        delete (ctx as any).state;
        delete (ctx as any).suspend;
        delete (ctx as any).resume;
    };
}

/** Collect unhandled promise rejections. Returns a function that stops collecting and returns them. */
function watchRejections(): () => string[]
{
    const rejections: string[] = [];
    const onRejection = (e: PromiseRejectionEvent) =>
    {
        rejections.push(String(e.reason));
        e.preventDefault();
    };

    globalThis.addEventListener('unhandledrejection', onRejection);

    return () =>
    {
        globalThis.removeEventListener('unhandledrejection', onRejection);

        return rejections;
    };
}

for (const useLegacy of [false, true])
{
    describe(`Pause and resume in the same tick (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        let music: Sound;
        let ctx: AudioContext;
        let restore: () => void;

        // The real state of the AudioContext, whatever a lagging stub reports
        const state = (): string => realState.call(ctx);

        // The audio clock the instance's progress is computed from
        const clock = (instance: IMediaInstance): number =>
            (useLegacy ? (instance as any)._source.currentTime : ctx.currentTime);

        /** Whether the audio clock and then the instance's progress move on */
        const advances = async (instance: IMediaInstance): Promise<boolean> =>
        {
            const time = clock(instance);
            const progress = instance.progress;

            return await until(() => clock(instance) > time)
                && await until(() => instance.progress !== progress);
        };

        /** Whether the audio clock and the instance's progress stay where they are */
        const frozen = async (instance: IMediaInstance): Promise<boolean> =>
        {
            const time = clock(instance);
            const progress = instance.progress;

            await wait(200);

            return clock(instance) === time && instance.progress === progress;
        };

        const playing = async (): Promise<IMediaInstance> =>
        {
            const instance = music.play({ loop: true }) as IMediaInstance;

            expect(await advances(instance)).toBe(true);

            return instance;
        };

        const paused = async (): Promise<IMediaInstance> =>
        {
            const instance = await playing();

            sound.pauseAll();
            if (!useLegacy)
            {
                expect(await until(() => state() === 'suspended')).toBe(true);
            }

            return instance;
        };

        const sameTick = (lag: boolean): void =>
        {
            const name = lag ? 'when the state lags' : 'with the state as reported';
            const stub = (): void =>
            {
                if (lag)
                {
                    restore = lagState(ctx);
                }
            };

            it(`should keep playing after pauseAll then resumeAll ${name}`, async () =>
            {
                const instance = await playing();

                stub();
                sound.pauseAll();
                sound.resumeAll();

                expect(sound.context.paused).toBe(false);
                expect(await advances(instance)).toBe(true);
                if (!useLegacy)
                {
                    expect(state()).toBe('running');
                }
            });

            it(`should keep playing after togglePauseAll twice ${name}`, async () =>
            {
                const instance = await playing();

                stub();
                expect(sound.togglePauseAll()).toBe(true);
                expect(sound.togglePauseAll()).toBe(false);

                expect(await advances(instance)).toBe(true);
                if (!useLegacy)
                {
                    expect(state()).toBe('running');
                }
            });

            // The HTML audio context doesn't pause on blur
            if (!useLegacy)
            {
                it(`should keep playing after a blur then a focus ${name}`, async () =>
                {
                    const instance = await playing();

                    stub();
                    globalThis.dispatchEvent(new Event('blur'));
                    globalThis.dispatchEvent(new Event('focus'));

                    expect(sound.context.paused).toBe(false);
                    expect(await advances(instance)).toBe(true);
                    expect(state()).toBe('running');
                });
            }

            it(`should stay paused after resumeAll then pauseAll ${name}`, async () =>
            {
                const instance = await paused();

                stub();
                sound.resumeAll();
                sound.pauseAll();

                expect(sound.context.paused).toBe(true);
                // Give a resume that wrongly wins the time to land. An <audio> clock only needs to settle, on WebKit
                await wait(useLegacy ? 50 : 200);
                if (!useLegacy)
                {
                    expect(await until(() => state() === 'suspended')).toBe(true);
                }
                expect(await frozen(instance)).toBe(true);
            });
        };

        beforeAll(async () =>
        {
            sound.useLegacy = useLegacy;
            (Sound as any)._pool.length = 0;
            music = await new Promise<Sound>((resolve, reject) =>
            {
                Sound.from({
                    url: musical,
                    preload: true,
                    volume: 0,
                    loaded: (err, s) => (err ? reject(err) : resolve(s)),
                });
            });
        });

        beforeEach(async () =>
        {
            restore = null;
            ctx = useLegacy ? null : (sound.context as webaudio.WebAudioContext).audioContext;
            sound.resumeAll();
            if (ctx)
            {
                await ctx.resume();
                expect(await until(() => state() === 'running')).toBe(true);
            }
        });

        afterEach(() =>
        {
            restore?.();
            sound.stopAll();
            sound.resumeAll();
            vi.restoreAllMocks();
        });

        afterAll(() =>
        {
            music.destroy();
            (Sound as any)._pool.length = 0;
            sound.useLegacy = false;
        });

        sameTick(false);

        // The HTML audio backend has no AudioContext
        if (!useLegacy)
        {
            sameTick(true);

            it('should not leave an unhandled rejection when destroyed mid-change', async () =>
            {
                const context = new webaudio.WebAudioContext();
                const stop = watchRejections();

                context.paused = true;
                context.paused = false;
                context.paused = true;
                context.destroy();
                await wait(300);

                expect(stop()).toEqual([]);
            });

            it('should not leave an unhandled rejection when the suspend or resume is rejected', async () =>
            {
                const context = new webaudio.WebAudioContext();
                const rejected = (): Promise<void> => Promise.reject(new Error('interrupted'));
                const suspend = vi.spyOn(context.audioContext, 'suspend').mockImplementation(rejected);
                const resume = vi.spyOn(context.audioContext, 'resume').mockImplementation(rejected);
                const stop = watchRejections();

                context.paused = true;
                context.paused = false;
                await wait(100);
                const rejections = stop();

                vi.restoreAllMocks();
                context.destroy();

                expect(suspend).toHaveBeenCalledTimes(1);
                expect(resume).toHaveBeenCalledTimes(1);
                expect(rejections).toEqual([]);
            });

            it('should cope with a suspend and resume that return nothing', () =>
            {
                const context = new webaudio.WebAudioContext();
                const suspend = vi.spyOn(context.audioContext, 'suspend').mockImplementation(() => undefined);
                const resume = vi.spyOn(context.audioContext, 'resume').mockImplementation(() => undefined);

                expect(() => { context.paused = true; }).not.toThrow();
                expect(() => { context.paused = false; }).not.toThrow();
                expect(suspend).toHaveBeenCalledTimes(1);
                expect(resume).toHaveBeenCalledTimes(1);

                vi.restoreAllMocks();
                context.destroy();
            });

            it('should leave a closed context alone', async () =>
            {
                const context = new webaudio.WebAudioContext();
                const audioContext = context.audioContext;

                await audioContext.close();
                const suspend = vi.spyOn(audioContext, 'suspend');
                const resume = vi.spyOn(audioContext, 'resume');
                const stop = watchRejections();

                expect(() => { context.paused = true; }).not.toThrow();
                expect(context.paused).toBe(true);
                expect(() => { context.paused = false; }).not.toThrow();
                expect(context.paused).toBe(false);
                await wait(100);
                const rejections = stop();

                // Closing twice is an error, and the context is already closed
                vi.spyOn(audioContext, 'close').mockImplementation(() => Promise.resolve());
                context.destroy();

                expect(suspend).not.toHaveBeenCalled();
                expect(resume).not.toHaveBeenCalled();
                expect(rejections).toEqual([]);
            });
        }
    });
}
