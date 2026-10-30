import path from 'path';
import { DOMAdapter } from 'pixi.js';
import { filters, Sound, webaudio } from '../src';
import { suite } from './suite';

suite(false);

describe(`filters.DistortionFilter`, () =>
{
    it('should create a DistortionFilter', () =>
    {
        const filter = new filters.DistortionFilter(0.5);

        expect(filter.amount).toBe(0.5);
    });
});

describe('WebAudioMedia load errors', () =>
{
    const url = path.join(__resources, 'missing.mp3');

    type LoadError = Error & { cause?: unknown };

    // Waits past the decode callbacks, so a second call to loaded is counted
    async function load(): Promise<LoadError[]>
    {
        const errors: LoadError[] = [];

        Sound.from({ url, preload: true, loaded: (err) => errors.push(err) });
        await new Promise((resolve) => setTimeout(resolve, 100));

        return errors;
    }

    afterEach(() =>
    {
        jest.restoreAllMocks();
    });

    it('should call loaded once with the URL when fetch rejects', async () =>
    {
        const error = new TypeError('Failed to fetch');

        jest.spyOn(DOMAdapter.get(), 'fetch').mockRejectedValue(error);

        const errors = await load();

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe(`Failed to load sound from ${url}: Failed to fetch`);
        expect(errors[0].cause).toBe(error);
    });

    it('should call loaded once with the URL when reading the response fails', async () =>
    {
        const error = new TypeError('network error');

        jest.spyOn(DOMAdapter.get(), 'fetch').mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.reject(error),
        } as unknown as Response);

        const errors = await load();

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe(`Failed to load sound from ${url}: network error`);
        expect(errors[0].cause).toBe(error);
    });

    it('should call loaded once with the HTTP status without decoding when the response is not ok', async () =>
    {
        jest.spyOn(DOMAdapter.get(), 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
        const decode = jest.spyOn(webaudio.WebAudioContext.prototype, 'decode');

        const errors = await load();

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe(`Failed to load sound from ${url}: HTTP 404`);
        expect(errors[0]).not.toHaveProperty('cause');
        expect(decode).not.toHaveBeenCalled();
    });

    it('should pass a decode error to loaded unchanged', async () =>
    {
        const error = new TypeError('Cannot read properties of null');

        jest.spyOn(DOMAdapter.get(), 'fetch').mockResolvedValue(new Response(new ArrayBuffer(8)));
        jest.spyOn(webaudio.WebAudioContext.prototype, 'decode').mockImplementation(() =>
        {
            throw error;
        });

        const errors = await load();

        expect(errors).toHaveLength(1);
        expect(errors[0]).toBe(error);
    });

    it('should log the error with the URL when there is no loaded callback', async () =>
    {
        jest.spyOn(DOMAdapter.get(), 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        Sound.from({ url, preload: true });
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(consoleError).toHaveBeenCalledTimes(1);
        expect(consoleError.mock.calls[0][0].message).toBe(`Failed to load sound from ${url}: Failed to fetch`);
    });
});
