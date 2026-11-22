import fs from 'fs';
import path from 'path';
import { settings } from '@pixi/core';
import { htmlaudio, IMediaInstance, Sound, sound, webaudio } from '../src';

const good = path.join(__dirname, 'resources', 'silence.mp3');
const missing = path.join(__dirname, 'resources', 'not-there.mp3');
// Bytes that no audio decoder accepts, as a data URL so both backends can load it
const garbage = new Uint8Array(4096).map((_, i) => (i * 31) + 7);
const corruptUrl = `data:audio/mpeg;base64,${btoa(String.fromCharCode(...garbage))}`;
const destroyed = 'Sound was destroyed before it finished loading';

type Played = IMediaInstance | Promise<IMediaInstance>;
type Outcome = { resolved?: IMediaInstance; rejected?: Error; pending?: boolean };

function wait(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** How a play() ended. A promise that never settles gives `pending`, not a test timeout. */
function outcome(played: Played, ms = 2000): Promise<Outcome>
{
    return Promise.race<Outcome>([
        Promise.resolve(played).then((resolved) => ({ resolved }), (rejected) => ({ rejected })),
        wait(ms).then(() => ({ pending: true })),
    ]);
}

/** The outcomes of several play() calls, then a moment longer to catch anything late. */
async function outcomes(...played: Played[]): Promise<Outcome[]>
{
    const results = await Promise.all(played.map((p) => outcome(p)));

    await wait(100);

    return results;
}

// Anything reported outside the callback or promise: an unhandled rejection or an uncaught error
const uncaught: unknown[] = [];
const onRejection = (event: PromiseRejectionEvent) =>
{
    event.preventDefault();
    uncaught.push(event.reason);
};
const onError = (event: ErrorEvent) =>
{
    event.preventDefault();
    uncaught.push(event.error);
};

// The fixture is 0.1 s long, so the tests that count instances loop it to keep them alive.
// A sound made with Sound.from isn't in the library, so it is destroyed here
const created: Sound[] = [];

function from(options: Parameters<typeof Sound.from>[0]): Sound
{
    const s = Sound.from(options);

    created.push(s);

    return s;
}

/** The console.error spy that every test starts with. */
function logged(): jest.SpyInstance
{
    return console.error as unknown as jest.SpyInstance;
}

beforeAll(() =>
{
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);
});

beforeEach(() =>
{
    uncaught.length = 0;
    (Sound as any)._pool.length = 0;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() =>
{
    jest.restoreAllMocks();
    sound.removeAll();
    created.splice(0).filter((s) => s.media).forEach((s) => s.destroy());
});

afterAll(() =>
{
    window.removeEventListener('unhandledrejection', onRejection);
    window.removeEventListener('error', onError);
    sound.useLegacy = false;
});

for (const useLegacy of [false, true])
{
    describe(`play() before the sound has loaded (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        let loads: jest.SpyInstance;

        beforeEach(() =>
        {
            sound.useLegacy = useLegacy;
            // Spy before any sound exists, so a load started by the constructor is counted
            loads = jest.spyOn((useLegacy ? htmlaudio.HTMLAudioMedia : webaudio.WebAudioMedia).prototype, 'load');
        });

        it('should load once for preload then play()', async () =>
        {
            const fetches = jest.spyOn(settings.ADAPTER, 'fetch');
            // HTML audio has no decode step
            const decodes = useLegacy ? null : jest.spyOn(sound.context as webaudio.WebAudioContext, 'decode');
            const s = from({ url: good, preload: true, volume: 0, loop: true });
            const [played] = await outcomes(s.play());

            expect(played.resolved).toBe(s.instances[0]);
            expect(played.resolved).toBeTruthy();
            expect(s.instances).toHaveLength(1);
            expect(loads).toHaveBeenCalledTimes(1);
            if (!useLegacy)
            {
                expect(fetches).toHaveBeenCalledTimes(1);
                expect(decodes).toHaveBeenCalledTimes(1);
            }
            expect(logged()).not.toHaveBeenCalled();
            expect(uncaught).toHaveLength(0);
        });

        it('should call the sound loaded callback once for preload then play() by alias', async () =>
        {
            const alias = `preloaded-${useLegacy}`;
            const loaded = jest.fn();
            const s = sound.add(alias, { url: good, preload: true, volume: 0, loop: true, loaded });
            const [played] = await outcomes(sound.play(alias));

            expect(played.resolved).toBeTruthy();
            expect(loaded).toHaveBeenCalledTimes(1);
            expect(loaded).toHaveBeenCalledWith(null, s, played.resolved);
            expect(loads).toHaveBeenCalledTimes(1);
            expect(uncaught).toHaveLength(0);
        });

        it('should play a sprite once for preload then play()', async () =>
        {
            const complete = jest.fn();
            const s = from({
                url: good, preload: true, volume: 0, sprites: { short: { start: 0, end: 0.1 } },
            });
            const [played] = await outcomes(s.play('short', complete));

            expect(played.resolved).toBeTruthy();
            for (let i = 0; i < 150 && complete.mock.calls.length === 0; i++)
            {
                await wait(10);
            }
            await wait(300);

            expect(complete).toHaveBeenCalledTimes(1);
            expect(loads).toHaveBeenCalledTimes(1);
            expect(uncaught).toHaveLength(0);
        });

        it('should load once and start one instance for autoPlay then play()', async () =>
        {
            const loaded = jest.fn();
            const s = from({ url: good, autoPlay: true, volume: 0, loop: true, loaded });
            const [played] = await outcomes(s.play());

            expect(played.resolved).toBeTruthy();
            expect(s.instances).toEqual([played.resolved]);
            expect(loaded).toHaveBeenCalledTimes(1);
            expect(loaded).toHaveBeenCalledWith(null, s, played.resolved);
            expect(loads).toHaveBeenCalledTimes(1);
            expect(uncaught).toHaveLength(0);
        });

        it('should start an instance for each play() after preload', async () =>
        {
            const s = from({ url: good, preload: true, volume: 0, loop: true });
            const [first, second] = await outcomes(s.play(), s.play());

            expect(first.resolved).toBeTruthy();
            expect(second.resolved).toBeTruthy();
            expect(first.resolved).not.toBe(second.resolved);
            expect(s.instances).toHaveLength(2);
            expect(loads).toHaveBeenCalledTimes(1);
            expect(uncaught).toHaveLength(0);
        });

        it('should start an instance for each play() with one load', async () =>
        {
            const s = from({ url: good, volume: 0, loop: true });
            const played = await outcomes(s.play(), s.play(), s.play());
            const instances = played.map((result) => result.resolved);

            expect(instances.every((instance) => !!instance)).toBe(true);
            expect(new Set(instances).size).toBe(3);
            expect(s.instances).toHaveLength(3);
            expect(loads).toHaveBeenCalledTimes(1);
            expect(uncaught).toHaveLength(0);
        });

        it('should call loaded for every play() with the instance it started', async () =>
        {
            const loaded = [jest.fn(), jest.fn(), jest.fn()];
            const s = from({ url: good, volume: 0 });
            const played = await outcomes(...loaded.map((fn) => s.play({ loaded: fn })));

            expect(new Set(played.map((result) => result.resolved)).size).toBe(3);
            played.forEach((result, i) =>
            {
                expect(result.resolved).toBeTruthy();
                expect(loaded[i]).toHaveBeenCalledTimes(1);
                expect(loaded[i]).toHaveBeenCalledWith(null, s, result.resolved);
            });
            expect(uncaught).toHaveLength(0);
        });

        ([['a missing file', missing], ['an undecodable file', corruptUrl]] as const).forEach(([label, url]) =>
        {
            it(`should reject every play() with the same error for ${label}`, async () =>
            {
                const loaded = [jest.fn(), jest.fn(), jest.fn()];
                const s = from({ url });
                const played = await outcomes(...loaded.map((fn) => s.play({ loaded: fn })));

                expect(played[0]).toEqual({ rejected: expect.any(Error) });
                expect(played[1]).toEqual({ rejected: played[0].rejected });
                expect(played[2]).toEqual({ rejected: played[0].rejected });
                expect(played[1].rejected).toBe(played[0].rejected);
                expect(played[2].rejected).toBe(played[0].rejected);
                loaded.forEach((fn) => expect(fn).not.toHaveBeenCalled());
                expect(s.instances).toHaveLength(0);
                expect(loads).toHaveBeenCalledTimes(1);
                expect(logged()).not.toHaveBeenCalled();
                expect(uncaught).toHaveLength(0);
            });

            it(`should report the error once for preload then play() of ${label}`, async () =>
            {
                const loaded = jest.fn();
                const s = from({ url, preload: true, loaded });
                const [played] = await outcomes(s.play());

                expect(played).toEqual({ rejected: expect.any(Error) });
                expect(loaded).toHaveBeenCalledTimes(1);
                expect(loaded.mock.calls[0][0]).toBe(played.rejected);
                expect(loads).toHaveBeenCalledTimes(1);
                expect(logged()).not.toHaveBeenCalled();
                expect(uncaught).toHaveLength(0);
            });

            it(`should not log an error that rejected a play() made after preload of ${label}`, async () =>
            {
                const s = from({ url, preload: true });
                const [played] = await outcomes(s.play());

                expect(played).toEqual({ rejected: expect.any(Error) });
                expect(loads).toHaveBeenCalledTimes(1);
                expect(logged()).not.toHaveBeenCalled();
                expect(uncaught).toHaveLength(0);
            });
        });

        it('should log a load error once when nothing is waiting for it', async () =>
        {
            from({ url: missing, preload: true });
            for (let i = 0; i < 200 && logged().mock.calls.length === 0; i++)
            {
                await wait(10);
            }
            await wait(100);

            expect(logged()).toHaveBeenCalledTimes(1);
            expect(logged().mock.calls[0][0]).toBeInstanceOf(Error);
            expect(uncaught).toHaveLength(0);
        });

        it('should start a new load for a play() made after a failed one', async () =>
        {
            const s = from({ url: missing });
            const [first] = await outcomes(s.play());

            expect(first).toEqual({ rejected: expect.any(Error) });
            expect(loads).toHaveBeenCalledTimes(1);

            const [second, third] = await outcomes(s.play(), s.play());

            expect(second).toEqual({ rejected: expect.any(Error) });
            expect(third).toEqual({ rejected: second.rejected });
            expect(second.rejected).not.toBe(first.rejected);
            expect(loads).toHaveBeenCalledTimes(2);
            expect(uncaught).toHaveLength(0);
        });

        it('should reject every play() when the sound is destroyed while loading', async () =>
        {
            const s = from({ url: good, volume: 0 });
            const pending = [s.play(), s.play()];

            s.destroy();

            const [first, second] = await outcomes(...pending);

            expect(first).toEqual({ rejected: expect.any(Error) });
            expect(second).toEqual({ rejected: first.rejected });
            if (!useLegacy)
            {
                expect(first.rejected.message).toBe(destroyed);
            }
            expect(logged()).not.toHaveBeenCalled();
            expect(uncaught).toHaveLength(0);
        });

        it('should log once when a preloading sound with no callback is destroyed', async () =>
        {
            Sound.from({ url: good, preload: true, volume: 0 }).destroy();
            for (let i = 0; i < 200 && logged().mock.calls.length === 0; i++)
            {
                await wait(10);
            }
            await wait(100);

            expect(logged()).toHaveBeenCalledTimes(1);
            if (!useLegacy)
            {
                expect(logged().mock.calls[0][0].message).toBe(destroyed);
            }
            expect(uncaught).toHaveLength(0);
        });

        it('should forget the waiting calls when destroyed', async () =>
        {
            const loaded = jest.fn();
            const s = from({ url: good, preload: true, volume: 0, loaded });
            const pending = [s.play(), s.play()];

            expect((s as any)._preloadQueue).toHaveLength(1);
            expect((s as any)._loadCallbacks).toHaveLength(2);

            s.destroy();

            expect((s as any)._preloadQueue).toBeNull();
            expect((s as any)._loadCallbacks).toBeNull();

            // The load still reports to everything that was waiting for it
            const [first, second] = await outcomes(...pending);

            expect(first).toEqual({ rejected: expect.any(Error) });
            expect(second).toEqual({ rejected: first.rejected });
            expect(loaded).toHaveBeenCalledTimes(1);
            expect(loaded.mock.calls[0][0]).toBe(first.rejected);
            expect(uncaught).toHaveLength(0);
        });

        it('should still start the second play() when stop() comes before the load', async () =>
        {
            const s = from({ url: good, volume: 0, loop: true });
            const pending = [s.play(), s.play()];

            s.stop();

            const [first, second] = await outcomes(...pending);

            expect(first).toEqual({ resolved: undefined });
            expect(second.resolved).toBeTruthy();
            expect(s.instances).toEqual([second.resolved]);
            expect(loads).toHaveBeenCalledTimes(1);
            expect(uncaught).toHaveLength(0);
        });
    });
}

// HTML audio takes no ArrayBuffer and has no decode step, so these are WebAudio only
describe('play() before the sound has loaded, decoding (webaudio)', () =>
{
    beforeEach(() =>
    {
        sound.useLegacy = false;
    });

    it('should decode an ArrayBuffer source once for preload then play()', async () =>
    {
        const file = fs.readFileSync(good);
        const source = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        const decodes = jest.spyOn(sound.context as webaudio.WebAudioContext, 'decode');
        const loaded = jest.fn();
        const s = from({ source, preload: true, volume: 0, loaded });
        const [played] = await outcomes(s.play());

        expect(played.resolved).toBeTruthy();
        expect(loaded).toHaveBeenCalledTimes(1);
        expect(loaded).toHaveBeenCalledWith(null, s, played.resolved);
        expect(decodes).toHaveBeenCalledTimes(1);
        expect(uncaught).toHaveLength(0);
    });

    it('should play an AudioBuffer source that loads at once', async () =>
    {
        const context = sound.context as webaudio.WebAudioContext;
        const source = context.audioContext.createBuffer(1, 4410, 44100);
        const loaded = jest.fn();
        const s = from({ source, volume: 0 });
        const first = s.play({ loaded });
        const second = s.play();

        expect(first).toBeInstanceOf(Promise);
        expect(second).not.toBeInstanceOf(Promise);

        const [played] = await outcomes(first);

        expect(played.resolved).toBeTruthy();
        expect(played.resolved).not.toBe(second);
        expect(loaded).toHaveBeenCalledWith(null, s, played.resolved);
        expect((s as any)._preloadQueue).toBeNull();
        expect((s as any)._loadCallbacks).toBeNull();
        expect(uncaught).toHaveLength(0);
    });

    it('should report a sound destroyed while it decodes', async () =>
    {
        const context = sound.context as webaudio.WebAudioContext;
        const decode = context.decode.bind(context);
        const loaded = jest.fn();
        const s = from({ url: good, preload: true, volume: 0, loaded });

        jest.spyOn(context, 'decode').mockImplementation((buffer, callback) =>
        {
            decode(buffer, callback);
            s.destroy();
        });

        const [first, second] = await outcomes(s.play(), s.play());

        expect(first.rejected?.message).toBe(destroyed);
        expect(second.rejected).toBe(first.rejected);
        expect(loaded).toHaveBeenCalledTimes(1);
        expect(loaded.mock.calls[0][0]).toBe(first.rejected);
        expect(logged()).not.toHaveBeenCalled();
        expect(uncaught).toHaveLength(0);
    });

    it('should report a destroyed sound, not the decode error, when both happen', async () =>
    {
        const context = sound.context as webaudio.WebAudioContext;
        const decode = context.decode.bind(context);
        const s = from({ url: corruptUrl });

        jest.spyOn(context, 'decode').mockImplementation((buffer, callback) =>
        {
            decode(buffer, callback);
            s.destroy();
        });

        const [played] = await outcomes(s.play());

        expect(played.rejected?.message).toBe(destroyed);
        expect(uncaught).toHaveLength(0);
    });
});
