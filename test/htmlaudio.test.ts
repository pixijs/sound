import path from 'node:path';
import { Sound } from '../src';
import { HTMLAudioInstance } from '../src/htmlaudio/HTMLAudioInstance';
import { WebAudioContext } from '../src/webaudio/WebAudioContext';
import { suite } from './suite';

suite(true);

describe(`HTMLAudioInstance`, () =>
{
    let mockAudioContext: jest.SpyInstance;
    let warningMock: jest.SpyInstance;

    beforeAll(() =>
    {
        warningMock = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        mockAudioContext = jest.spyOn(WebAudioContext, 'AudioContext', 'get').mockReturnValue(null);
    });

    afterAll(() =>
    {
        mockAudioContext.mockRestore();
        warningMock.mockRestore();
    });

    let instance: HTMLAudioInstance;

    beforeEach(async () =>
    {
        const mediaInstance = Sound.from({
            url: path.join(__dirname, 'resources, alert-4.mp3'),
        }).media;

        await new Promise<void>((resolve) => mediaInstance.load(() => resolve()));

        instance = mediaInstance.create() as HTMLAudioInstance;
    });

    it('should match type hinting without having being interacted with', () =>
    {
        expect(instance.speed).toBe(1);
        expect(instance.volume).toBe(1);
        expect(instance.muted).toBe(false);
        expect(instance.loop).toBe(false);
        expect(instance.filters).toEqual([]);
    });
});
