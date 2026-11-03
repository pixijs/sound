import path from 'path';
import { settings } from '@pixi/core';
import { Sound, webaudio } from '../src';
import { suite } from './suite';

suite(false);

describe('WebAudioMedia load errors', () =>
{
    const url = path.join(__resources, 'missing.mp3');

    // Waits past the decode callbacks, so a second call to loaded is counted
    async function load(): Promise<Error[]>
    {
        const errors: Error[] = [];

        Sound.from({ url, preload: true, loaded: (err) => errors.push(err) });
        await new Promise((resolve) => setTimeout(resolve, 100));

        return errors;
    }

    afterEach(() =>
    {
        jest.restoreAllMocks();
    });

    it('should call loaded once when fetch rejects', async () =>
    {
        jest.spyOn(settings.ADAPTER, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

        const errors = await load();

        expect(errors).toHaveLength(1);
    });

    it('should call loaded once when reading the response fails', async () =>
    {
        jest.spyOn(settings.ADAPTER, 'fetch').mockResolvedValue({
            arrayBuffer: () => Promise.reject(new TypeError('network error')),
        } as unknown as Response);

        const errors = await load();

        expect(errors).toHaveLength(1);
    });

    it('should call loaded once when decode throws', async () =>
    {
        jest.spyOn(settings.ADAPTER, 'fetch').mockResolvedValue(new Response(new ArrayBuffer(8)));
        jest.spyOn(webaudio.WebAudioContext.prototype, 'decode').mockImplementation(() =>
        {
            throw new TypeError('Cannot read properties of null');
        });

        const errors = await load();

        expect(errors).toHaveLength(1);
    });

    it('should log the error once when there is no loaded callback', async () =>
    {
        jest.spyOn(settings.ADAPTER, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        Sound.from({ url, preload: true });
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(consoleError).toHaveBeenCalledTimes(1);
    });
});
