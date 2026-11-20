import { Assets } from 'pixi.js';
import { IMediaInstance, Sound, sound, webaudio } from '../src';

// Bytes that no audio decoder accepts, as a data URL so both backends can load it
const garbage = new Uint8Array(4096).map((_, i) => (i * 31) + 7);
const corruptUrl = `data:audio/mpeg;base64,${btoa(String.fromCharCode(...garbage))}`;

function wait(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wait for the first report, then a little longer to catch a second one. */
async function settle(reported: () => boolean): Promise<void>
{
    const started = Date.now();

    while (!reported() && Date.now() - started < 5000)
    {
        await wait(10);
    }
    await wait(100);
}

/** Replace the context's decodeAudioData with one that calls back as the test says. */
function mockDecode(
    context: webaudio.WebAudioContext,
    decode: (ok: (buffer: AudioBuffer) => void, fail: (err: Error) => void) => Promise<void> | undefined,
): void
{
    const offline: OfflineAudioContext = (context as any)._offlineCtx;

    jest.spyOn(offline, 'decodeAudioData').mockImplementation(
        (_buffer, ok, fail) => decode(ok, fail as (err: Error) => void) as Promise<any>,
    );
}

// Anything reported outside the callback or promise: an unhandled rejection, or an
// uncaught error thrown by a second callback
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

beforeAll(() =>
{
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);
});

beforeEach(() =>
{
    uncaught.length = 0;
    (Sound as any)._pool.length = 0;
});

afterEach(() =>
{
    jest.restoreAllMocks();
    sound.removeAll();
});

afterAll(() =>
{
    window.removeEventListener('unhandledrejection', onRejection);
    window.removeEventListener('error', onError);
    sound.useLegacy = false;
});

for (const useLegacy of [false, true])
{
    describe(`Undecodable audio (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        beforeEach(() =>
        {
            sound.useLegacy = useLegacy;
        });

        it('should pass the error to the loaded callback exactly once', async () =>
        {
            const errors: Error[] = [];

            Sound.from({
                url: corruptUrl,
                preload: true,
                loaded: (err) => errors.push(err),
            });
            await settle(() => errors.length > 0);

            expect(errors).toHaveLength(1);
            expect(errors[0]).toBeInstanceOf(Error);
            expect(uncaught).toHaveLength(0);
        });

        it('should reject play() without an unhandled rejection', async () =>
        {
            const s = Sound.from(corruptUrl);
            const errors: Error[] = [];

            (s.play() as Promise<IMediaInstance>).catch((err) => errors.push(err));
            await settle(() => errors.length > 0);

            expect(errors).toHaveLength(1);
            expect(errors[0]).toBeInstanceOf(Error);
            expect(uncaught).toHaveLength(0);
        });

        it('should reject sound.play() by alias without an unhandled rejection', async () =>
        {
            const alias = `corrupt-${useLegacy}`;
            const errors: Error[] = [];

            sound.add(alias, corruptUrl);
            (sound.play(alias) as Promise<IMediaInstance>).catch((err) => errors.push(err));
            await settle(() => errors.length > 0);

            expect(errors).toHaveLength(1);
            expect(errors[0]).toBeInstanceOf(Error);
            expect(uncaught).toHaveLength(0);
        });

        it('should reject Assets.load and call the user loaded callback once', async () =>
        {
            const errors: Error[] = [];
            const loaded = jest.fn((err: Error) =>
            {
                errors.push(err);
            });

            await expect(Assets.load({
                src: corruptUrl,
                alias: `corrupt-asset-${useLegacy}`,
                data: { loaded },
            })).rejects.toThrow();
            await settle(() => errors.length > 0);

            expect(loaded).toHaveBeenCalledTimes(1);
            expect(errors[0]).toBeInstanceOf(Error);
            expect(uncaught).toHaveLength(0);
        });
    });
}

// HTML audio can't decode an ArrayBuffer or take one as a source, so these are WebAudio only
describe('Undecodable audio, decode() (webaudio)', () =>
{
    beforeEach(() =>
    {
        sound.useLegacy = false;
    });

    it('should pass an ArrayBuffer source error to the loaded callback exactly once', async () =>
    {
        const errors: Error[] = [];

        Sound.from({
            source: garbage.slice().buffer,
            preload: true,
            loaded: (err) => errors.push(err),
        });
        await settle(() => errors.length > 0);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toBeInstanceOf(Error);
        expect(uncaught).toHaveLength(0);
    });

    it('should call back from decode() exactly once', async () =>
    {
        const context = sound.context as webaudio.WebAudioContext;
        const calls: [Error, AudioBuffer][] = [];

        context.decode(garbage.slice().buffer, (err, buffer) => calls.push([err, buffer]));
        await settle(() => calls.length > 0);

        expect(calls).toHaveLength(1);
        expect(calls[0][0]).toBeInstanceOf(Error);
        expect(calls[0][1]).toBeUndefined();
        expect(uncaught).toHaveLength(0);
    });

    it('should report an error that only rejects the promise', async () =>
    {
        const errors: Error[] = [];

        // Not an ArrayBuffer, so decodeAudioData rejects without calling the error callback
        Sound.from({
            source: document.createElement('audio') as any,
            preload: true,
            loaded: (err) => errors.push(err),
        });
        await settle(() => errors.length > 0);

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toMatch(/ArrayBuffer/);
        expect(uncaught).toHaveLength(0);
    });

    it('should report only the first outcome', async () =>
    {
        const context = sound.context as webaudio.WebAudioContext;
        const calls: string[] = [];

        mockDecode(context, (ok, fail) =>
        {
            fail(new Error('first'));
            ok({} as AudioBuffer);

            return Promise.resolve();
        });
        context.decode(new ArrayBuffer(8), (err) => calls.push(err ? `err:${err.message}` : 'ok'));
        await settle(() => calls.length > 0);

        expect(calls).toEqual(['err:first']);
    });

    it('should report a null error from a callback-only engine', async () =>
    {
        const context = sound.context as webaudio.WebAudioContext;
        const calls: Error[] = [];

        mockDecode(context, (_ok, fail) =>
        {
            setTimeout(() => fail(null));

            return undefined;
        });
        expect(() => context.decode(new ArrayBuffer(8), (err) => calls.push(err))).not.toThrow();
        await settle(() => calls.length > 0);

        expect(calls).toHaveLength(1);
        expect(calls[0].message).toBe('Unable to decode file');
    });
});
