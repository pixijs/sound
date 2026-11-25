import { IMediaInstance, Sound, sound, webaudio } from '../src';

import type { MockInstance } from 'vitest';

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

/** Build a context that's locked, as a browser's is before the first user gesture */
async function lockedContext(create: () => webaudio.WebAudioContext): Promise<webaudio.WebAudioContext>
{
    // Nothing blocks audio here, so report suspended until the context has started, then really suspend it
    const stub = vi.spyOn(BaseAudioContext.prototype, 'state', 'get').mockReturnValue('suspended');
    const context = create();

    // It starts by itself, in Firefox a moment later, and that would unlock it
    await new Promise((resolve) => context.audioContext.addEventListener('statechange', resolve, { once: true }));
    await context.audioContext.suspend();
    stub.mockRestore();

    return context;
}

const blur = (): boolean => globalThis.dispatchEvent(new Event('blur'));
const focus = (): boolean => globalThis.dispatchEvent(new Event('focus'));
const gesture = (type = 'mousedown'): boolean => document.dispatchEvent(new Event(type));

// Only WebAudio has a locked state and blur auto-pause; HTMLAudioContext has neither (CHARTER ADR-8)
for (const lag of [false, true])
{
    describe(`WebAudioContext focus with no blur (${lag ? 'when the state lags' : 'with the state as reported'})`, () =>
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

        /**
         * Wait for the resume() made by a gesture to settle, giving up after `cap` milliseconds. Resolves to whether
         * it settled. Newer Chromium leaves it pending once a suspend() follows.
         */
        const settled = async (resume: MockInstance, cap = 500): Promise<boolean> =>
        {
            expect(resume).toHaveBeenCalled();

            return Promise.race([
                Promise.all(resume.mock.results.map((r) => r.value?.catch((): void => undefined))).then(() => true),
                wait(cap).then(() => false),
            ]);
        };

        describe('a context of its own', () =>
        {
            /** Unlock the context with a click and wait for it to run */
            const unlocked = async (): Promise<void> =>
            {
                gesture();
                expect(await until(() => !locked())).toBe(true);
                expect(await until(() => state() === 'running')).toBe(true);
            };

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
                vi.restoreAllMocks();
                if (ctx.audioContext)
                {
                    ctx.destroy();
                }
            });

            describe('while locked', () =>
            {
                it('should leave paused false after a blur and a focus', () =>
                {
                    blur();
                    focus();
                    expect(ctx.paused).toBe(false);
                });

                it('should stay paused on a focus with no blur', async () =>
                {
                    ctx.paused = true;
                    expect(await until(() => state() === 'suspended')).toBe(true);
                    const resume = vi.spyOn(ac, 'resume');

                    focus();
                    expect(ctx.paused).toBe(true);
                    expect(resume).not.toHaveBeenCalled();
                    expect(await frozen()).toBe(true);
                });

                it('should stay paused after a blur and a focus', async () =>
                {
                    ctx.paused = true;
                    blur();
                    focus();
                    expect(ctx.paused).toBe(true);
                    expect(await frozen()).toBe(true);
                });
            });

            describe('once unlocked', () =>
            {
                beforeEach(unlocked);

                it('should leave paused false on a focus with no blur', async () =>
                {
                    focus();
                    expect(ctx.paused).toBe(false);
                    expect(await advances()).toBe(true);
                });

                it('should stay paused on a focus with no blur', async () =>
                {
                    ctx.paused = true;
                    focus();
                    expect(ctx.paused).toBe(true);
                    expect(await frozen()).toBe(true);
                });

                it('should not restore an old blur on a second focus', async () =>
                {
                    const resume = vi.spyOn(ac, 'resume');

                    blur();
                    focus();
                    expect(ctx.paused).toBe(false);
                    ctx.paused = true;
                    focus();
                    expect(ctx.paused).toBe(true);
                    // The first focus resumed the context; it's suspended again once that settles
                    await settled(resume);
                    expect(await frozen()).toBe(true);
                });

                it('should keep the state from the first of two blurs', async () =>
                {
                    blur();
                    blur();
                    focus();
                    expect(ctx.paused).toBe(false);
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                });

                it('should restore the state saved by each blur', async () =>
                {
                    blur();
                    expect(ctx.paused).toBe(true);
                    expect(await frozen()).toBe(true);
                    focus();
                    expect(ctx.paused).toBe(false);
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);

                    ctx.paused = true;
                    blur();
                    focus();
                    expect(ctx.paused).toBe(true);
                    expect(await frozen()).toBe(true);
                });

                it('should resume a context stopped behind its back on a focus with no blur', async () =>
                {
                    // As Safari can do when the screen is locked or the user switches app
                    await ac.suspend();
                    expect(state()).toBe('suspended');

                    focus();
                    expect(await until(() => state() === 'running')).toBe(true);
                    expect(await advances()).toBe(true);
                });

                it('should ignore a blur and a focus when autoPause is off', async () =>
                {
                    ctx.autoPause = false;
                    blur();
                    expect(ctx.paused).toBe(false);
                    expect((ctx as any)._pausedOnBlur).toBeUndefined();
                    expect(await advances()).toBe(true);

                    ctx.paused = true;
                    expect(await until(() => state() === 'suspended')).toBe(true);
                    const resume = vi.spyOn(ac, 'resume');

                    focus();
                    expect(ctx.paused).toBe(true);
                    expect(resume).not.toHaveBeenCalled();
                    expect(await frozen()).toBe(true);
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
                vi.restoreAllMocks();
                music.destroy();
                (Sound as any)._pool.length = 0;
                sound.close();
                sound.init();
            });

            it('should stay paused after pauseAll and a focus before the first click', async () =>
            {
                sound.pauseAll();
                focus();
                expect(sound.context.paused).toBe(true);
                expect(await frozen()).toBe(true);

                const resume = vi.spyOn(ac, 'resume');

                gesture();
                // Nothing suspends it before it settles, so it must, but Firefox waits for its audio device to start
                expect(await settled(resume, 2000)).toBe(true);
                expect(locked()).toBe(false);
                expect(sound.context.paused).toBe(true);

                sound.resumeAll();
                const instance = music.play() as IMediaInstance;

                expect(await until(() => instance.progress > 0)).toBe(true);
            });
        });
    });
}
