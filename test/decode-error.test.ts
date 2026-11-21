import path from 'path';
import { Assets } from '@pixi/assets';
import { settings } from '@pixi/core';
import { IMediaInstance, Sound, sound, webaudio } from '../src';

type DecodeError = Error & { cause?: Error };

// Bytes that no audio decoder accepts, as a data URL so both backends can load it
const garbage = new Uint8Array(4096).map((_, i) => (i * 31) + 7);
const toDataUrl = (bytes: Uint8Array) => `data:audio/mpeg;base64,${btoa(String.fromCharCode(...bytes))}`;
const corruptUrl = toDataUrl(garbage);
// What a decode error calls a data URL: its header, without the file
const corruptName = 'data:audio/mpeg;base64,…';
// A file URL for the cases that check the name. Nothing is there, so its fetch is mocked
const namedUrl = path.join(__dirname, 'resources', 'corrupt.mp3');

/** A corrupt data URL of its own, as each Assets case needs a src that no other case loads. */
function corruptUrlFor(seed: number): string
{
    const bytes = garbage.slice();

    bytes[0] = seed;

    return toDataUrl(bytes);
}

/** Make every fetch succeed with bytes that can't be decoded. */
function mockFetch(): void
{
    jest.spyOn(settings.ADAPTER, 'fetch').mockImplementation(async () => new Response(garbage.slice().buffer));
}

function wait(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for the first report, then a little longer to catch a second one.
 * Gives up before the test's own timeout, so a missing report fails on its assertion.
 */
async function settle(reported: () => boolean): Promise<void>
{
    const started = Date.now();

    while (!reported() && Date.now() - started < 3000)
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

/** The console.error spy that every test starts with. */
function logged(): jest.SpyInstance
{
    return console.error as unknown as jest.SpyInstance;
}

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

            // @pixi/assets 7 keeps the data of the first load of a src, so each backend loads its own file
            const src = toDataUrl(garbage.map((byte, i) => (i === 0 ? Number(useLegacy) : byte)));

            await expect(Assets.load({
                src,
                alias: [`corrupt-asset-${useLegacy}`],
                data: { loaded },
            })).rejects.toThrow();
            await settle(() => errors.length > 0);

            expect(loaded).toHaveBeenCalledTimes(1);
            expect(errors[0]).toBeInstanceOf(Error);
            expect(uncaught).toHaveLength(0);
        });

        it('should log the error once when there is no loaded callback', async () =>
        {
            Sound.from({ url: corruptUrl, preload: true });
            await settle(() => logged().mock.calls.length > 0);

            expect(logged()).toHaveBeenCalledTimes(1);
            expect(uncaught).toHaveLength(0);
        });

        it('should log the error once for a sound added without a loaded callback', async () =>
        {
            sound.add(`corrupt-silent-${useLegacy}`, { url: corruptUrl, preload: true });
            await settle(() => logged().mock.calls.length > 0);

            expect(logged()).toHaveBeenCalledTimes(1);
            expect(uncaught).toHaveLength(0);
        });

        it('should not log an error that was passed to the loaded callback', async () =>
        {
            const errors: Error[] = [];

            Sound.from({
                url: corruptUrl,
                preload: true,
                loaded: (err) => errors.push(err),
            });
            await settle(() => errors.length > 0);

            expect(errors).toHaveLength(1);
            expect(logged()).not.toHaveBeenCalled();
        });

        it('should not log an error that rejected play()', async () =>
        {
            const s = Sound.from(corruptUrl);
            const errors: Error[] = [];

            (s.play() as Promise<IMediaInstance>).catch((err) => errors.push(err));
            await settle(() => errors.length > 0);

            expect(errors).toHaveLength(1);
            expect(logged()).not.toHaveBeenCalled();
        });

        it('should not log an error that rejected Assets.load', async () =>
        {
            const loaded = jest.fn();

            await expect(Assets.load({
                src: corruptUrlFor(useLegacy ? 3 : 2),
                alias: [`corrupt-quiet-${useLegacy}`],
                data: { loaded },
            })).rejects.toThrow();
            await settle(() => loaded.mock.calls.length > 0);

            expect(loaded).toHaveBeenCalledTimes(1);
            expect(logged()).not.toHaveBeenCalled();
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

    it('should report an error with no message as unable to decode', async () =>
    {
        const context = sound.context as webaudio.WebAudioContext;
        const calls: Error[] = [];

        mockDecode(context, (_ok, fail) =>
        {
            fail(new Error(''));

            return undefined;
        });
        context.decode(new ArrayBuffer(8), (err) => calls.push(err));
        await settle(() => calls.length > 0);

        expect(calls).toHaveLength(1);
        expect(calls[0].message).toBe('Unable to decode file');
    });

    it('should call back from decode() with the browser error', async () =>
    {
        const context = sound.context as webaudio.WebAudioContext;
        const calls: Error[] = [];

        context.decode(garbage.slice().buffer, (err) => calls.push(err));
        await settle(() => calls.length > 0);

        expect(calls).toHaveLength(1);
        expect(calls[0].name).toBe('EncodingError');
    });

    it('should name the file in the error and keep the browser error as its cause', async () =>
    {
        const errors: DecodeError[] = [];

        mockFetch();
        Sound.from({
            url: namedUrl,
            preload: true,
            loaded: (err) => errors.push(err),
        });
        await settle(() => errors.length > 0);

        expect(errors).toHaveLength(1);
        expect(errors[0].name).toBe('Error');
        expect(errors[0].cause.name).toBe('EncodingError');
        expect(errors[0].cause.message).not.toBe('');
        expect(errors[0].message).toBe(`Failed to decode sound from ${namedUrl}: ${errors[0].cause.message}`);
        expect(logged()).not.toHaveBeenCalled();
    });

    it('should log the error with the file name when there is no loaded callback', async () =>
    {
        mockFetch();
        Sound.from({ url: namedUrl, preload: true });
        await settle(() => logged().mock.calls.length > 0);

        expect(logged()).toHaveBeenCalledTimes(1);

        const error: DecodeError = logged().mock.calls[0][0];

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(`Failed to decode sound from ${namedUrl}: ${error.cause.message}`);
        expect(uncaught).toHaveLength(0);
    });

    it('should reject play() with the file name in the error', async () =>
    {
        const errors: DecodeError[] = [];

        mockFetch();
        (Sound.from(namedUrl).play() as Promise<IMediaInstance>).catch((err) => errors.push(err));
        await settle(() => errors.length > 0);

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe(`Failed to decode sound from ${namedUrl}: ${errors[0].cause.message}`);
        expect(logged()).not.toHaveBeenCalled();
    });

    it('should leave the file name out of the error for an ArrayBuffer source', async () =>
    {
        const errors: DecodeError[] = [];

        Sound.from({
            source: garbage.slice().buffer,
            preload: true,
            loaded: (err) => errors.push(err),
        });
        await settle(() => errors.length > 0);

        expect(errors).toHaveLength(1);
        expect(errors[0].cause.name).toBe('EncodingError');
        expect(errors[0].message).toBe(`Failed to decode sound: ${errors[0].cause.message}`);
    });

    it('should log an ArrayBuffer source error when there is no loaded callback', async () =>
    {
        Sound.from({ source: garbage.slice().buffer, preload: true });
        await settle(() => logged().mock.calls.length > 0);

        expect(logged()).toHaveBeenCalledTimes(1);
        expect(logged().mock.calls[0][0].message).toMatch(/^Failed to decode sound: ./);
        expect(uncaught).toHaveLength(0);
    });

    it('should name the URL in the error when a source is given with one', async () =>
    {
        const errors: DecodeError[] = [];

        Sound.from({
            source: garbage.slice().buffer,
            url: namedUrl,
            preload: true,
            loaded: (err) => errors.push(err),
        });
        await settle(() => errors.length > 0);

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe(`Failed to decode sound from ${namedUrl}: ${errors[0].cause.message}`);
    });

    it('should shorten a data URL to its header in the error', async () =>
    {
        const errors: DecodeError[] = [];

        Sound.from({
            url: corruptUrl,
            preload: true,
            loaded: (err) => errors.push(err),
        });
        await settle(() => errors.length > 0);

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe(`Failed to decode sound from ${corruptName}: ${errors[0].cause.message}`);
        expect(errors[0].message).not.toContain(corruptUrl.slice(corruptName.length - 1));
    });

    it('should keep an error that only rejects the promise as the cause', async () =>
    {
        const errors: DecodeError[] = [];

        Sound.from({
            source: document.createElement('audio') as any,
            preload: true,
            loaded: (err) => errors.push(err),
        });
        await settle(() => errors.length > 0);

        expect(errors).toHaveLength(1);
        expect(errors[0].cause.name).toBe('TypeError');
        expect(errors[0].message).toBe(`Failed to decode sound: ${errors[0].cause.message}`);
    });

    it('should name the file when the browser gives no error', async () =>
    {
        const errors: DecodeError[] = [];

        mockFetch();
        mockDecode(sound.context as webaudio.WebAudioContext, (_ok, fail) =>
        {
            setTimeout(() => fail(null));

            return undefined;
        });
        Sound.from({
            url: namedUrl,
            preload: true,
            loaded: (err) => errors.push(err),
        });
        await settle(() => errors.length > 0);

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe(`Failed to decode sound from ${namedUrl}: Unable to decode file`);
    });

    it('should reject Assets.load with the shortened data URL in the error', async () =>
    {
        const errors: Error[] = [];

        await Assets.load({ src: corruptUrlFor(4), alias: ['corrupt-named'] }).catch((err) => errors.push(err));

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain(`Failed to decode sound from ${corruptName}: `);
        expect(logged()).not.toHaveBeenCalled();
    });

    it('should load a good file without logging when there is no loaded callback', async () =>
    {
        const s = Sound.from({ url: path.join(__dirname, 'resources', 'silence.mp3'), preload: true });

        await settle(() => s.isLoaded);

        expect(s.isLoaded).toBe(true);
        expect(logged()).not.toHaveBeenCalled();
    });
});
