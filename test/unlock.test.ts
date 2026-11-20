import path from 'path';
import { IMediaInstance, Sound, sound, webaudio } from '../src';

const musical = path.join(__dirname, 'resources', 'musical-11.mp3');
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

/** Build a context that's locked, as a browser's is before the first user gesture */
async function lockedContext(create: () => webaudio.WebAudioContext): Promise<webaudio.WebAudioContext>
{
    // Electron starts contexts running, so report suspended during construction, then really suspend it
    const stub = jest.spyOn(BaseAudioContext.prototype, 'state', 'get').mockReturnValue('suspended');
    const context = create();

    stub.mockRestore();
    await context.audioContext.suspend();

    return context;
}

const blur = (): boolean => globalThis.dispatchEvent(new Event('blur'));
const focus = (): boolean => globalThis.dispatchEvent(new Event('focus'));
const gesture = (type = 'mousedown'): boolean => document.dispatchEvent(new Event(type));

// Only WebAudio has a locked state and blur auto-pause; HTMLAudioContext has neither (CHARTER ADR-8)
for (const lag of [false, true])
{
    describe(`WebAudioContext unlock (${lag ? 'when the state lags' : 'with the state as reported'})`, () =>
    {
        let ctx: webaudio.WebAudioContext;
        let ac: AudioContext;
        let restore: () => void;

        // The real state of the AudioContext, whatever a lagging stub reports
        const state = (): string => realState.call(ac);
        const locked = (): boolean => (ctx as any)._locked;

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

        /** Wait for the resume() made by a gesture to settle */
        const settled = async (resume: jest.SpyInstance): Promise<void> =>
        {
            expect(resume).toHaveBeenCalled();
            await Promise.all(resume.mock.results.map((r) => r.value?.catch((): void => undefined)));
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

            beforeEach(async () =>
            {
                restore = null;
                ctx = await lockedContext(() => new webaudio.WebAudioContext());
                ac = ctx.audioContext;
                expect(state()).toBe('suspended');
                expect(locked()).toBe(true);
                if (lag)
                {
                    restore = lagState(ac);
                }
            });

            afterEach(() =>
            {
                restore?.();
                jest.restoreAllMocks();
                if (ctx.audioContext)
                {
                    ctx.destroy();
                }
            });

            it.each(gestures)('should auto-pause on blur after the first %s unlocks the context', async (type) =>
            {
                gesture(type);
                expect(await until(() => !locked())).toBe(true);
                expect(await until(() => state() === 'running')).toBe(true);

                blur();
                expect(ctx.paused).toBe(true);
                expect(await frozen()).toBe(true);

                focus();
                expect(ctx.paused).toBe(false);
                expect(await until(() => state() === 'running')).toBe(true);
                expect(await advances()).toBe(true);
            });

            // A sound started by a key press, with no resume() call, also goes through statechange,
            // but Electron doesn't block an AudioContext, so this can't be simulated here
            it('should auto-pause on blur once the app resumes the context itself', async () =>
            {
                // e.g. from its own keydown handler
                ac.resume();
                expect(await until(() => !locked())).toBe(true);

                blur();
                expect(ctx.paused).toBe(true);
                expect(await frozen()).toBe(true);
            });

            it('should not auto-pause on blur while the context is still locked', () =>
            {
                blur();
                expect(ctx.paused).toBe(false);
                expect((ctx as any)._pausedOnBlur).toBeUndefined();
                expect(locked()).toBe(true);
            });

            it('should unlock in the same tick when the state changes at once', () =>
            {
                // Current Chromium reports running as soon as resume() is called inside a gesture
                let reported = 'suspended';

                restore?.();
                Object.defineProperty(ac, 'state', { configurable: true, get: () => reported });
                ac.resume = () =>
                {
                    reported = 'running';

                    return new Promise(() => undefined);
                };
                restore = () =>
                {
                    delete (ac as any).state;
                    delete (ac as any).resume;
                };

                gesture();
                expect(locked()).toBe(false);
            });

            it('should stop listening once unlocked', async () =>
            {
                const remove = jest.spyOn(ac, 'removeEventListener');
                const statechange = () => remove.mock.calls.filter(([type]) => type === 'statechange').length;

                gesture();
                expect(await until(() => !locked())).toBe(true);
                // Let every resume() made so far settle, then make one more
                ctx.paused = false;
                await wait(100);
                expect(statechange()).toBe(1);

                const playEmptySound = jest.spyOn(ctx, 'playEmptySound');

                gestures.forEach(gesture);
                expect(playEmptySound).not.toHaveBeenCalled();
            });

            describe('paused before the first gesture', () =>
            {
                let resume: jest.SpyInstance;

                beforeEach(async () =>
                {
                    ctx.paused = true;
                    expect(await until(() => state() === 'suspended')).toBe(true);
                    resume = jest.spyOn(ac, 'resume');
                    gesture();
                    await settled(resume);
                });

                it('should unlock and stay paused', async () =>
                {
                    expect(locked()).toBe(false);
                    expect(ctx.paused).toBe(true);
                    expect(await frozen()).toBe(true);
                });

                it('should stay paused across a blur and a focus', async () =>
                {
                    blur();
                    expect((ctx as any)._pausedOnBlur).toBe(true);
                    expect(ctx.paused).toBe(true);
                    focus();
                    expect(ctx.paused).toBe(true);
                    expect(await frozen()).toBe(true);
                });

                it('should run once unpaused', async () =>
                {
                    ctx.paused = false;
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                });

                it('should stay suspended after a second gesture', async () =>
                {
                    const playEmptySound = jest.spyOn(ctx, 'playEmptySound');

                    gesture();
                    expect(playEmptySound).not.toHaveBeenCalled();
                    expect(ctx.paused).toBe(true);
                    expect(await frozen()).toBe(true);
                });
            });

            it('should suspend again when playEmptySound is called while paused', async () =>
            {
                gesture();
                expect(await until(() => !locked())).toBe(true);
                ctx.paused = true;
                expect(await until(() => state() === 'suspended')).toBe(true);

                const resume = jest.spyOn(ac, 'resume');
                const stop = watchRejections();

                ctx.playEmptySound();
                await settled(resume);

                expect(await frozen()).toBe(true);
                expect(stop()).toEqual([]);
            });

            describe('destroyed while locked', () =>
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
                    const playEmptySound = jest.spyOn(ctx, 'playEmptySound');

                    ctx.destroy();
                    gesture(type);
                    expect(playEmptySound).not.toHaveBeenCalled();
                    expect(errors).toEqual([]);
                });

                it('should ignore a resume that settles after it', async () =>
                {
                    const closed = new Promise<void>((resolve) =>
                        ac.addEventListener('statechange', () => realState.call(ac) === 'closed' && resolve()));
                    const stop = watchRejections();

                    ctx.playEmptySound();
                    ctx.destroy();
                    await closed;
                    await wait(100);

                    expect(errors).toEqual([]);
                    expect(stop()).toEqual([]);
                });
            });
        });

        describe('the library context', () =>
        {
            let music: Sound;

            beforeEach(async () =>
            {
                restore = null;
                (Sound as any)._pool.length = 0;
                sound.close();
                ctx = await lockedContext(() => (sound.init().context as webaudio.WebAudioContext));
                ac = ctx.audioContext;
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
                if (lag)
                {
                    restore = lagState(ac);
                }
            });

            afterEach(() =>
            {
                restore?.();
                jest.restoreAllMocks();
                music.destroy();
                (Sound as any)._pool.length = 0;
                sound.close();
                sound.init();
            });

            it('should unlock on a click made after pauseAll, and play after resumeAll', async () =>
            {
                const resume = jest.spyOn(ac, 'resume');

                sound.pauseAll();
                gesture();
                await settled(resume);
                expect(locked()).toBe(false);
                expect(sound.context.paused).toBe(true);
                expect(await frozen()).toBe(true);

                sound.resumeAll();
                const instance = music.play() as IMediaInstance;

                expect(await until(() => instance.progress > 0)).toBe(true);
            });
        });
    });
}
