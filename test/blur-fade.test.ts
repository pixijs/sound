import { type IMediaInstance, Sound, sound, webaudio } from '../src';

const musical = '/test/resources/musical-11.mp3';
const realState = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'state')!.get!;

/** Milliseconds the pause waits after a blur once `slowOutput()` has been called */
const HOLD = 300;

/** A hold for the tests that read the level at the pause: a busy machine can stop rendering for a while */
const LONG_HOLD = 1000;

function wait(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Long enough for a pause that is still pending to land */
const afterHold = (): Promise<void> => wait(HOLD + 150);

/** Poll until the check passes, giving up after `cap` milliseconds. Resolves to whether it passed. */
async function until(check: () => boolean, cap = 2000): Promise<boolean>
{
    const end = performance.now() + cap;

    while (!check() && performance.now() < end)
    {
        await wait(5);
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

/** Report this `baseLatency`, in seconds, whatever the device has. Returns a function that undoes it. */
function fakeLatency(ctx: AudioContext, baseLatency: number): () => void
{
    Object.defineProperty(ctx, 'baseLatency', { configurable: true, value: baseLatency });

    return () =>
    {
        delete (ctx as any).baseLatency;
    };
}

/** Make the pause wait `hold` milliseconds after a blur, so a test has time to act before it */
const slowOutput = (ctx: AudioContext, hold = HOLD): (() => void) => fakeLatency(ctx, (hold / 1000) - 0.12);

const blur = (): boolean => globalThis.dispatchEvent(new Event('blur'));
const focus = (): boolean => globalThis.dispatchEvent(new Event('focus'));
const gesture = (type = 'mousedown'): boolean => document.dispatchEvent(new Event(type));

describe('WebAudioContext blur fade', () =>
{
    let ctx: webaudio.WebAudioContext;
    let ac: AudioContext;
    let tap: AnalyserNode;
    /** Takes what `tap` hears and keeps it from the speakers */
    let silent: GainNode;
    /** The level of the tone going into the context */
    let volume: GainNode;
    let suspend: ReturnType<typeof vi.spyOn>;
    /** The output level at each suspend() */
    let levels: number[];
    let refreshes: number;
    let restore: (() => void) | undefined;
    const data = new Float32Array(256);

    /** Loudest sample in the last 6 ms that the context sent to the speakers */
    const level = (): number =>
    {
        tap.getFloatTimeDomainData(data);

        return data.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
    };

    const suspended = (): Promise<boolean> => until(() => suspend.mock.calls.length > 0);

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
        restore = undefined;
        // Whatever the context connects to the speakers is the end of its chain
        const ends: AudioNode[] = [];
        const connect = AudioNode.prototype.connect;
        const spy = vi.spyOn(AudioNode.prototype, 'connect');

        spy.mockImplementation(function patched(this: AudioNode, ...args: any[])
        {
            // Firefox also plays a silent buffer straight to the speakers
            if (args[0] instanceof AudioDestinationNode && !(this instanceof AudioScheduledSourceNode))
            {
                ends.push(this);
            }

            return (connect as any).apply(this, args);
        });

        ctx = new webaudio.WebAudioContext();
        spy.mockRestore();
        ac = ctx.audioContext;
        const last = ends[ends.length - 1]!;

        // Listen there instead of playing it: the analyser only runs when it leads to the speakers
        silent = ac.createGain();

        silent.gain.value = 0;
        tap = ac.createAnalyser();
        tap.fftSize = data.length;
        last.disconnect();
        last.connect(tap);
        tap.connect(silent);
        silent.connect(ac.destination);
        // The context swaps in a new last node at each pause: keep listening to whichever is current
        vi.spyOn(AudioNode.prototype, 'connect').mockImplementation(function follow(this: AudioNode, ...args: any[])
        {
            return (connect as any).apply(this, args[0] === ac.destination ? [tap] : args);
        });

        const tone = ac.createOscillator();

        volume = ac.createGain();
        tone.connect(volume);
        volume.connect(ctx.destination);
        tone.start();
        gesture();
        expect(await until(() => !(ctx as any)._locked && ac.state === 'running' && level() > 0.1)).toBe(true);
        // A context renders its first buffer at once and can then stall while the output opens
        const started = ac.currentTime;

        expect(await until(() => ac.currentTime > started + 0.1, 5000)).toBe(true);

        levels = [];
        refreshes = 0;
        ctx.events.on('refreshPaused', () => refreshes++);
        const real = ac.suspend.bind(ac);

        suspend = vi.spyOn(ac, 'suspend').mockImplementation(() =>
        {
            levels.push(level());

            return real();
        });
    });

    afterEach(() =>
    {
        vi.restoreAllMocks();
        restore?.();
        if (ctx.audioContext)
        {
            ctx.destroy();
        }
    });

    it('should be silent by the time a blur suspends the context', async () =>
    {
        restore = slowOutput(ac, LONG_HOLD);
        blur();
        expect(ctx.paused).toBe(true);
        expect(suspend).not.toHaveBeenCalled();
        expect(refreshes).toBe(0);

        expect(await suspended()).toBe(true);
        expect(levels[0]).toBeLessThan(0.001);
        expect(refreshes).toBe(1);
        expect(suspend).toHaveBeenCalledTimes(1);
    });

    it('should not play the level from before a pause when it resumes', async () =>
    {
        // The analyser only shows the last 6 ms, so record the peak of every block the speakers would get
        const recorder = `registerProcessor('peaks', class extends AudioWorkletProcessor
        {
            process(inputs)
            {
                const peak = (inputs[0][0] || []).reduce((max, v) => Math.max(max, Math.abs(v)), 0);

                this.port.postMessage([currentFrame, peak]);

                return true;
            }
        });`;
        const blocks: [frame: number, peak: number][] = [];

        await ac.audioWorklet.addModule(URL.createObjectURL(new Blob([recorder], { type: 'text/javascript' })));
        const peaks = new AudioWorkletNode(ac, 'peaks');

        peaks.port.onmessage = ({ data }) => blocks.push(data);
        tap.connect(peaks);
        peaks.connect(silent);
        expect(await until(() => blocks.some(([, peak]) => peak > 0.1))).toBe(true);

        // The compressor still holds 6 ms at the old level when the context stops
        volume.gain.setValueAtTime(0, ac.currentTime);
        ctx.paused = true;
        expect(await until(() => realState.call(ac) === 'suspended')).toBe(true);
        const stoppedAt = Math.round(ac.currentTime * ac.sampleRate);

        ctx.paused = false;
        expect(await until(() => blocks[blocks.length - 1]![0] > stoppedAt + (ac.sampleRate / 10))).toBe(true);
        const heard = blocks.filter(([frame]) => frame >= stoppedAt).map(([, peak]) => peak);

        expect(Math.max(...heard)).toBeLessThan(0.001);
    });

    it('should come back to full level after a pause', async () =>
    {
        ctx.paused = true;
        expect(await until(() => realState.call(ac) === 'suspended')).toBe(true);
        const stoppedAt = ac.currentTime;

        ctx.paused = false;
        // Not until the analyser has dropped what it heard before the pause
        expect(await until(() => ac.currentTime > stoppedAt + 0.1 && level() > 0.1)).toBe(true);
    });

    it('should pause, and leave the compressor alone, when the app has disconnected it', async () =>
    {
        ctx.compressor.disconnect();
        expect(() => { ctx.paused = true; }).not.toThrow();
        expect(await until(() => realState.call(ac) === 'suspended')).toBe(true);
        const stoppedAt = ac.currentTime;

        ctx.paused = false;
        expect(await until(() => ac.currentTime > stoppedAt + 0.1)).toBe(true);
        expect(level()).toBeLessThan(0.001);
    });

    it('should wait for the output delay before it suspends', async () =>
    {
        restore = fakeLatency(ac, 0.4);
        let elapsed = 0;
        const start = performance.now();

        suspend.mockImplementationOnce(() =>
        {
            elapsed = performance.now() - start;

            return Promise.resolve();
        });
        blur();
        expect(await suspended()).toBe(true);
        // 20 ms before the fade starts, 40 ms for the fade, 60 ms for the output, then the context's own delay
        expect(elapsed).toBeGreaterThan(510);
        expect(elapsed).toBeLessThan(1000);
    });

    it('should still wait for the fade when the browser reports no baseLatency', async () =>
    {
        restore = fakeLatency(ac, undefined as any);
        const start = performance.now();

        blur();
        expect(await suspended()).toBe(true);
        expect(performance.now() - start).toBeGreaterThan(110);
    });

    it('should start the fade out 20 ms ahead, past what has already been rendered', async () =>
    {
        const setTarget = vi.spyOn(AudioParam.prototype, 'setTargetAtTime');
        const before = ac.currentTime;

        blur();
        const after = ac.currentTime;

        expect(setTarget).toHaveBeenCalledTimes(1);
        expect(setTarget.mock.calls[0][0]).toBe(0);
        expect(setTarget.mock.calls[0][1]).toBeGreaterThan(before + 0.02 - 1e-6);
        expect(setTarget.mock.calls[0][1]).toBeLessThan(after + 0.02 + 1e-6);
    });

    it('should not read the output latency', async () =>
    {
        const read = vi.fn(() => 0);

        Object.defineProperty(ac, 'outputLatency', { configurable: true, get: read });
        restore = () => delete (ac as any).outputLatency;
        blur();
        expect(await suspended()).toBe(true);
        focus();
        expect(read).not.toHaveBeenCalled();
    });

    it('should come back to full level on focus', async () =>
    {
        blur();
        expect(await suspended()).toBe(true);
        focus();
        expect(ctx.paused).toBe(false);
        expect(await until(() => level() > 0.1)).toBe(true);
    });

    it('should start the fade in once the compressor has let go of the audio from before the pause', async () =>
    {
        blur();
        expect(await suspended()).toBe(true);
        expect(await until(() => realState.call(ac) === 'suspended')).toBe(true);
        const setTarget = vi.spyOn(AudioParam.prototype, 'setTargetAtTime');
        const now = ac.currentTime;

        focus();
        expect(setTarget).toHaveBeenCalledTimes(1);
        expect(setTarget.mock.calls[0][0]).toBe(1);
        expect(setTarget.mock.calls[0][1]).toBeCloseTo(now + 0.006, 6);
    });

    it('should come back to full level on a tap taken as the focus', async () =>
    {
        blur();
        expect(await suspended()).toBe(true);
        gesture('touchend');
        expect(ctx.paused).toBe(false);
        expect(await until(() => level() > 0.1)).toBe(true);
    });

    it('should not pause when focus returns during the fade', async () =>
    {
        restore = slowOutput(ac);
        blur();
        expect(await until(() => level() < 0.001)).toBe(true);
        focus();
        expect(ctx.paused).toBe(false);
        expect(await until(() => level() > 0.1)).toBe(true);
        await afterHold();
        expect(suspend).not.toHaveBeenCalled();
        expect(refreshes).toBe(1);
    });

    it('should pause once after a blur, a focus and a blur in quick succession', async () =>
    {
        restore = slowOutput(ac, LONG_HOLD);
        blur();
        await wait(10);
        focus();
        await wait(10);
        blur();
        expect(ctx.paused).toBe(true);
        expect(await suspended()).toBe(true);
        expect(levels[0]).toBeLessThan(0.001);
        await afterHold();
        expect(suspend).toHaveBeenCalledTimes(1);

        focus();
        expect(await until(() => level() > 0.1)).toBe(true);
    });

    it('should fade out after a blur, a focus and a blur in the same tick', async () =>
    {
        restore = slowOutput(ac, LONG_HOLD);
        blur();
        focus();
        blur();
        expect(await suspended()).toBe(true);
        expect(levels[0]).toBeLessThan(0.001);
        await afterHold();
        expect(suspend).toHaveBeenCalledTimes(1);
    });

    it('should not pause after the context is destroyed during the fade', async () =>
    {
        restore = slowOutput(ac);
        blur();
        ctx.destroy();
        await afterHold();
        expect(suspend).not.toHaveBeenCalled();
        expect(refreshes).toBe(0);
    });

    it('should not pause after paused is set to false during the fade', async () =>
    {
        restore = slowOutput(ac);
        blur();
        ctx.paused = false;
        await afterHold();
        expect(suspend).not.toHaveBeenCalled();
        expect(refreshes).toBe(0);
        expect(ctx.paused).toBe(false);
        expect(level()).toBeGreaterThan(0.1);
    });

    it('should pause at once when paused is set to true during the fade', async () =>
    {
        restore = slowOutput(ac);
        blur();
        ctx.paused = true;
        expect(suspend).toHaveBeenCalledTimes(1);
        await afterHold();
        expect(suspend).toHaveBeenCalledTimes(1);
        expect(refreshes).toBe(0);
    });

    it('should pause at once on a blur while already paused', async () =>
    {
        // The state still reads running here, as it does in Firefox and Safari
        suspend.mockRestore();
        restore = lagState(ac);
        suspend = vi.spyOn(ac, 'suspend');
        ctx.paused = true;
        expect(ac.state).toBe('running');
        suspend.mockClear();

        blur();
        expect(suspend).toHaveBeenCalledTimes(1);
        expect(refreshes).toBe(1);
        focus();
        expect(ctx.paused).toBe(true);
    });

    it('should pause at once on a blur while something else has stopped the context', async () =>
    {
        await ac.suspend();
        suspend.mockClear();

        blur();
        expect(suspend).toHaveBeenCalledTimes(1);
        expect(refreshes).toBe(1);
    });

    it('should suspend a context that starts while paused, after an earlier blur and focus', async () =>
    {
        blur();
        expect(await suspended()).toBe(true);
        focus();
        expect(await until(() => level() > 0.1)).toBe(true);

        ctx.paused = true;
        expect(await until(() => realState.call(ac) === 'suspended')).toBe(true);
        suspend.mockClear();
        // As a tap does while the context is still locked
        ctx.playEmptySound();
        expect(await suspended()).toBe(true);
        expect(await until(() => realState.call(ac) === 'suspended')).toBe(true);
    });

    it('should come back when paused is set to false with autoPause turned off after the blur', async () =>
    {
        blur();
        expect(await suspended()).toBe(true);
        ctx.autoPause = false;
        focus();
        expect(ctx.paused).toBe(true);

        ctx.paused = false;
        expect(await until(() => level() > 0.1)).toBe(true);
    });

    it('should leave the output alone on a blur when autoPause is off', async () =>
    {
        ctx.autoPause = false;
        blur();
        expect(ctx.paused).toBe(false);
        await afterHold();
        expect(suspend).not.toHaveBeenCalled();
        expect(level()).toBeGreaterThan(0.1);
    });
});

for (const useLegacy of [false, true])
{
    describe(`A playing sound on a window blur (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        let ac: AudioContext;
        let music: Sound;
        let instance: IMediaInstance;
        let events: string[];
        let restore: (() => void) | undefined;

        /** Start the sound and note its paused and resumed events */
        const play = (): void =>
        {
            instance = music.play() as IMediaInstance;
            instance.on('paused', () => events.push('paused'));
            instance.on('resumed', () => events.push('resumed'));
        };

        beforeAll(async () =>
        {
            sound.useLegacy = false;
            const context = sound.context as webaudio.WebAudioContext;

            sound.useLegacy = useLegacy;
            (Sound as any)._pool.length = 0;
            music = await new Promise<Sound>((resolve, reject) =>
            {
                Sound.from({
                    url: musical,
                    preload: true,
                    volume: 0,
                    loaded: (err, s) => (err ? reject(err) : resolve(s!)),
                });
            });
            ac = context.audioContext;
            gesture();
            expect(await until(() => !(context as any)._locked && ac.state === 'running')).toBe(true);
        });

        afterAll(() =>
        {
            music.destroy();
            (Sound as any)._pool.length = 0;
            sound.useLegacy = false;
        });

        beforeEach(async () =>
        {
            restore = undefined;
            events = [];
            expect(await until(() => ac.state === 'running')).toBe(true);
        });

        afterEach(() =>
        {
            restore?.();
            music.stop();
            focus();
        });

        if (useLegacy)
        {
            // HTMLAudioContext has no blur handling, so only WebAudio auto-pauses
            it('should keep playing', async () =>
            {
                play();
                expect(await until(() => instance.progress > 0)).toBe(true);
                blur();
                expect(sound.context.paused).toBe(false);
                await afterHold();
                expect(events).toEqual([]);
            });

            return;
        }

        it('should pause once the fade has played, and carry on from there on focus', async () =>
        {
            play();
            expect(await until(() => instance.progress > 0)).toBe(true);
            const before = instance.progress;

            blur();
            expect(sound.context.paused).toBe(true);
            expect(events).toEqual([]);
            expect(await until(() => events.length > 0)).toBe(true);
            expect(events).toEqual(['paused']);

            focus();
            expect(events).toEqual(['paused', 'resumed']);
            const progress = await new Promise<number>((resolve) => instance.once('progress', resolve));

            expect(progress).toBeGreaterThan(before);
        });

        it('should not pause or restart when focus returns during the fade', async () =>
        {
            restore = slowOutput(ac);
            play();
            expect(await until(() => instance.progress > 0)).toBe(true);
            blur();
            await wait(15);
            focus();
            expect(sound.context.paused).toBe(false);
            await afterHold();
            expect(events).toEqual([]);
        });

        it('should pause a sound started during the fade with the rest', async () =>
        {
            blur();
            play();
            expect(await until(() => events.length > 0)).toBe(true);
            expect(events).toEqual(['paused']);

            focus();
            expect(events).toEqual(['paused', 'resumed']);
            expect(await until(() => instance.progress > 0)).toBe(true);
        });
    });
}
