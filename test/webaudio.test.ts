import path from 'path';
import { DOMAdapter } from 'pixi.js';
import { filters, Sound } from '../src';
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

    afterEach(() =>
    {
        jest.restoreAllMocks();
    });

    it('should call loaded with an error when fetch rejects', (done) =>
    {
        const error = new TypeError('Failed to fetch');

        jest.spyOn(DOMAdapter.get(), 'fetch').mockRejectedValue(error);

        Sound.from({
            url,
            preload: true,
            loaded: (err) =>
            {
                expect(err).toBe(error);
                done();
            },
        });
    });

    it('should call loaded with an error when reading the response fails', (done) =>
    {
        const error = new TypeError('network error');

        jest.spyOn(DOMAdapter.get(), 'fetch').mockResolvedValue({
            arrayBuffer: () => Promise.reject(error),
        } as unknown as Response);

        Sound.from({
            url,
            preload: true,
            loaded: (err) =>
            {
                expect(err).toBe(error);
                done();
            },
        });
    });
});
