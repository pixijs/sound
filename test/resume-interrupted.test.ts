import { IMediaInstance, Sound, sound, webaudio } from '../src';

import type { MockInstance } from 'vitest';

const musical = '/test/resources/musical-11.mp3';
const realState = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'state').get;
const gestures = ['mousedown', 'touchstart', 'touchend'];

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

/** Build a context that reports `state` while it's constructed, as a browser's does before the first user gesture */
async function stoppedContext(
    create: () => webaudio.WebAudioContext,
    state = 'suspended',
): Promise<webaudio.WebAudioContext>
{
    // Nothing blocks audio here, so report the state until the context has started, then really suspend it
    const stub = vi.spyOn(BaseAudioContext.prototype, 'state', 'get').mockReturnValue(state as AudioContextState);
    const context = create();

    // It starts by itself, in Firefox a moment later, and that would unlock it
    await new Promise((resolve) => context.audioContext.addEventListener('statechange', resolve, { once: true }));
    stub.mockRestore();
    await context.audioContext.suspend();

    return context;
}

const blur = (): boolean => globalThis.dispatchEvent(new Event('blur'));
const focus = (): boolean => globalThis.dispatchEvent(new Event('focus'));
const gesture = (type = 'mousedown'): boolean => document.dispatchEvent(new Event(type));

// Only WebAudio has a context that the OS can stop, a locked state and blur auto-pause. HTMLAudioContext
// has none of these (CHARTER ADR-8): WebKit pauses and plays the <audio> elements itself, and the
// instance doesn't follow that
for (const lag of [false, true])
{
    describe(`WebAudioContext resume after the OS stops it (${
        lag ? 'when the state lags' : 'with the state as reported'})`, () =>
    {
        let ctx: webaudio.WebAudioContext;
        let ac: AudioContext;
        // Undo the stubs on the AudioContext, newest first
        let undo: (() => void)[];

        // The real state of the AudioContext, whatever a stub reports
        const state = (): string => realState.call(ac);
        const locked = (): boolean => (ctx as any)._locked;
        const pausedOnBlur = (): boolean => (ctx as any)._pausedOnBlur;

        /** Whether the audio clock moves on */
        const advances = async (): Promise<boolean> =>
        {
            const time = ac.currentTime;

            return until(() => ac.currentTime > time);
        };

        /** Whether the context is suspended and its clock stays where it is */
        const frozen = async (): Promise<boolean> =>
        {
            if (!await until(() => state() === 'suspended'))
            {
                return false;
            }
            const time = ac.currentTime;

            await wait(200);

            return state() === 'suspended' && ac.currentTime === time;
        };

        /** Wait for the resume() calls made so far to settle */
        const settled = async (resume: MockInstance): Promise<void> =>
        {
            expect(resume).toHaveBeenCalled();
            await Promise.all(resume.mock.results.map((r) => r.value?.catch((): void => undefined)));
        };

        /** Unlock the context with a click and wait until it runs, as the library sees it */
        const unlocked = async (): Promise<void> =>
        {
            gesture();
            expect(await until(() => !locked())).toBe(true);
            expect(await until(() => state() === 'running' && ac.state === 'running')).toBe(true);
        };

        /** Stop the context behind the library's back, as iOS does on an app switch or a headphone unplug */
        const osStop = async (): Promise<void> =>
        {
            await ac.suspend();
            expect(state()).toBe('suspended');
            expect(ac.state).toBe('suspended');
        };

        /**
         * Stop the context and report Safari's "interrupted" state until resume() is called.
         * With `pending`, the first resume() never settles and the state stays "interrupted",
         * as WebKit does while the interruption lasts.
         */
        const interrupt = async ({ pending = false } = {}): Promise<void> =>
        {
            await osStop();

            const own = Object.getOwnPropertyDescriptor(ac, 'state');
            const before = own ? own.get : () => realState.call(ac);
            const hadResume = Object.prototype.hasOwnProperty.call(ac, 'resume');
            const resume = ac.resume;
            let interrupted = true;
            let park = pending;

            Object.defineProperty(ac, 'state', {
                configurable: true,
                get: () => (interrupted ? 'interrupted' : before.call(ac)),
            });
            ac.resume = () =>
            {
                if (park)
                {
                    park = false;

                    return new Promise<void>(() => undefined);
                }
                interrupted = false;

                return resume.call(ac);
            };
            undo.push(() =>
            {
                if (own)
                {
                    Object.defineProperty(ac, 'state', own);
                }
                else
                {
                    delete (ac as any).state;
                }
                if (hadResume)
                {
                    ac.resume = resume;
                }
                else
                {
                    delete (ac as any).resume;
                }
            });
            expect(ac.state).toBe('interrupted');
        };

        /** Use a new context for the test */
        const use = (context: webaudio.WebAudioContext): void =>
        {
            ctx = context;
            ac = ctx.audioContext;
            if (lag)
            {
                undo.push(lagState(ac));
            }
        };

        const cleanUp = (): void =>
        {
            vi.restoreAllMocks();
            while (undo.length)
            {
                undo.pop()();
            }
        };

        describe('a context of its own', () =>
        {
            beforeAll(() =>
            {
                // Keep the library's own context out of the blur and focus events below
                sound.disableAutoPause = true;
            });

            afterAll(() =>
            {
                sound.disableAutoPause = false;
            });

            beforeEach(() =>
            {
                undo = [];
            });

            afterEach(() =>
            {
                cleanUp();
                if (ctx.audioContext)
                {
                    ctx.destroy();
                }
            });

            describe('once unlocked', () =>
            {
                beforeEach(async () =>
                {
                    use(await stoppedContext(() => new webaudio.WebAudioContext()));
                    expect(locked()).toBe(true);
                    await unlocked();
                });

                it.each(gestures)('should resume on a %s after the OS suspends it', async (type) =>
                {
                    await osStop();

                    gesture(type);
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                    expect(locked()).toBe(false);
                    expect(ctx.paused).toBe(false);
                });

                it('should resume on a tap after an interruption', async () =>
                {
                    await interrupt();
                    const resume = vi.spyOn(ac, 'resume');

                    gesture('touchend');
                    expect(resume).toHaveBeenCalledTimes(1);
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                });

                it('should try again on a tap after a resume that never settles', async () =>
                {
                    await interrupt({ pending: true });
                    const resume = vi.spyOn(ac, 'resume');

                    ctx.paused = false;
                    expect(resume).toHaveBeenCalledTimes(1);
                    await wait(50);
                    expect(ac.state).toBe('interrupted');

                    gesture('touchend');
                    expect(resume).toHaveBeenCalledTimes(2);
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                });

                it('should resume from playEmptySound while interrupted', async () =>
                {
                    await interrupt();
                    const resume = vi.spyOn(ac, 'resume');

                    ctx.playEmptySound();
                    expect(resume).toHaveBeenCalledTimes(1);
                    expect(await until(() => state() === 'running')).toBe(true);
                });

                it('should take a tap as the focus when a blur pause is waiting', async () =>
                {
                    blur();
                    expect(ctx.paused).toBe(true);
                    expect(await frozen()).toBe(true);
                    await osStop();
                    const refreshPaused = vi.fn();
                    const resume = vi.spyOn(ac, 'resume');

                    ctx.events.on('refreshPaused', refreshPaused);

                    gesture('touchend');
                    expect(ctx.paused).toBe(false);
                    expect(pausedOnBlur()).toBeUndefined();
                    expect(refreshPaused).toHaveBeenCalledTimes(1);
                    expect(resume).toHaveBeenCalledTimes(1);
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                });

                it('should still auto-pause on blur and resume on focus after a recovery', async () =>
                {
                    await osStop();
                    gesture();
                    expect(await until(() => state() === 'running' && ac.state === 'running')).toBe(true);
                    expect(locked()).toBe(false);

                    blur();
                    expect(ctx.paused).toBe(true);
                    expect(await frozen()).toBe(true);

                    focus();
                    expect(ctx.paused).toBe(false);
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                });

                it('should not resume on any gesture while paused', async () =>
                {
                    ctx.paused = true;
                    expect(await until(() => state() === 'suspended' && ac.state === 'suspended')).toBe(true);
                    await osStop();
                    const resume = vi.spyOn(ac, 'resume');

                    gestures.forEach(gesture);
                    expect(resume).not.toHaveBeenCalled();
                    expect(ctx.paused).toBe(true);
                    expect(await frozen()).toBe(true);
                });

                it('should not resume on any gesture or playEmptySound while running', async () =>
                {
                    const resume = vi.spyOn(ac, 'resume');
                    const refreshPaused = vi.fn();

                    ctx.events.on('refreshPaused', refreshPaused);

                    gestures.forEach(gesture);
                    ctx.playEmptySound();
                    expect(resume).not.toHaveBeenCalled();
                    expect(refreshPaused).not.toHaveBeenCalled();
                    expect(pausedOnBlur()).toBeUndefined();
                    expect(await advances()).toBe(true);
                });

                it('should resume from interrupted when unpaused', async () =>
                {
                    await interrupt();
                    const resume = vi.spyOn(ac, 'resume');

                    ctx.paused = false;
                    expect(resume).toHaveBeenCalledTimes(1);
                    expect(await until(() => state() === 'running')).toBe(true);
                });

                it('should resume on a focus after a blur and an interruption', async () =>
                {
                    blur();
                    expect(ctx.paused).toBe(true);
                    await interrupt();
                    const resume = vi.spyOn(ac, 'resume');

                    focus();
                    expect(ctx.paused).toBe(false);
                    expect(resume).toHaveBeenCalled();
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                });

                it('should try again on the next tap when resume rejects', async () =>
                {
                    await osStop();
                    const stop = watchRejections();
                    // iOS can reject with "InvalidStateError: Failed to start the audio device"
                    const resume = vi.spyOn(ac, 'resume').mockImplementationOnce(() =>
                        Promise.reject(new DOMException('Failed to start the audio device', 'InvalidStateError')));

                    gesture('touchend');
                    expect(resume).toHaveBeenCalledTimes(1);
                    await settled(resume);
                    await wait(50);
                    expect(state()).toBe('suspended');

                    gesture('touchend');
                    expect(resume).toHaveBeenCalledTimes(2);
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                    expect(stop()).toEqual([]);
                });

                it('should resume on a tap when autoPause is off', async () =>
                {
                    ctx.autoPause = false;
                    await osStop();

                    gesture('touchend');
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                });

                it('should not take a tap as the focus when autoPause is turned off after the blur', async () =>
                {
                    blur();
                    expect(ctx.paused).toBe(true);
                    ctx.autoPause = false;

                    gesture('touchend');
                    expect(ctx.paused).toBe(true);
                    expect(pausedOnBlur()).toBe(false);
                    expect(await frozen()).toBe(true);

                    // Unpaused by the app: the tap still resumes the context once the OS stops it
                    ctx.paused = false;
                    expect(await until(() => state() === 'running' && ac.state === 'running')).toBe(true);
                    await osStop();
                    gesture('touchend');
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                });

                describe('then destroyed', () =>
                {
                    const errors: unknown[] = [];
                    const onError = (event: ErrorEvent) => errors.push(event.error);

                    beforeEach(() =>
                    {
                        errors.length = 0;
                        globalThis.addEventListener('error', onError);
                    });

                    afterEach(() =>
                    {
                        globalThis.removeEventListener('error', onError);
                    });

                    it.each(gestures)('should stop listening for %s', (type) =>
                    {
                        const resume = vi.spyOn(ac, 'resume');
                        const playEmptySound = vi.spyOn(ctx, 'playEmptySound');

                        ctx.destroy();
                        gesture(type);
                        expect(resume).not.toHaveBeenCalled();
                        expect(playEmptySound).not.toHaveBeenCalled();
                        expect(errors).toEqual([]);
                    });
                });
            });

            it('should resume once on the tap that unlocks it', async () =>
            {
                use(await stoppedContext(() => new webaudio.WebAudioContext()));
                expect(locked()).toBe(true);
                const resume = vi.spyOn(ac, 'resume');

                gesture('touchend');
                expect(resume).toHaveBeenCalledTimes(1);
                expect(await until(() => !locked())).toBe(true);
                expect(await advances()).toBe(true);
            });

            it('should resume on a tap when the context starts interrupted', async () =>
            {
                // Seen on WebKit: the context is never locked, so it had no tap listeners
                use(await stoppedContext(() => new webaudio.WebAudioContext(), 'interrupted'));
                expect(locked()).toBe(false);
                await interrupt();
                const resume = vi.spyOn(ac, 'resume');

                gesture('touchend');
                expect(resume).toHaveBeenCalledTimes(1);
                expect(await until(() => state() === 'running')).toBe(true);
                expect(await advances()).toBe(true);
            });
        });

        describe('the library context', () =>
        {
            let music: Sound;

            beforeEach(async () =>
            {
                undo = [];
                (Sound as any)._pool.length = 0;
                sound.close();
                use(await stoppedContext(() => (sound.init().context as webaudio.WebAudioContext)));
                expect(locked()).toBe(true);
                music = await new Promise<Sound>((resolve, reject) =>
                {
                    Sound.from({
                        url: musical,
                        preload: true,
                        volume: 0,
                        loaded: (err, s) => (err ? reject(err) : resolve(s)),
                    });
                });
                await unlocked();
            });

            afterEach(() =>
            {
                cleanUp();
                music.destroy();
                (Sound as any)._pool.length = 0;
                sound.close();
                sound.init();
            });

            it('should play after a tap once the OS suspends it', async () =>
            {
                await osStop();

                gesture('touchend');
                const instance = music.play() as IMediaInstance;

                expect(await until(() => instance.progress > 0)).toBe(true);
            });

            it('should stay paused after pauseAll and a tap', async () =>
            {
                sound.pauseAll();
                expect(await until(() => state() === 'suspended' && ac.state === 'suspended')).toBe(true);
                const resume = vi.spyOn(ac, 'resume');

                gesture('touchend');
                expect(resume).not.toHaveBeenCalled();
                expect(sound.context.paused).toBe(true);
                expect(await frozen()).toBe(true);
            });

            it('should stay paused after pauseAll, a blur and a tap', async () =>
            {
                sound.pauseAll();
                blur();
                expect(sound.context.paused).toBe(true);

                gesture('touchend');
                expect(sound.context.paused).toBe(true);
                expect(await frozen()).toBe(true);

                focus();
                expect(sound.context.paused).toBe(true);
                expect(await frozen()).toBe(true);
            });
        });
    });
}
