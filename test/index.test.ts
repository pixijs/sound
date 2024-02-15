import { filters, htmlaudio, Sound, sound, SoundLibrary, utils, webaudio } from '../src';

describe('SoundLibrary', () =>
{
    it('should have the correct classes', () =>
    {
        expect(typeof sound).toBe('object');
        expect(typeof Sound).toBe('function');
        expect(typeof utils).toBe('object');
        expect(typeof webaudio).toBe('object');
        expect(typeof htmlaudio).toBe('object');
        expect(typeof SoundLibrary).toBe('function');
        expect(typeof filters).toBe('object');
        expect(typeof filters.DistortionFilter).toBe('function');
        expect(typeof filters.EqualizerFilter).toBe('function');
        expect(typeof filters.ReverbFilter).toBe('function');
        expect(typeof filters.StereoFilter).toBe('function');
        expect(typeof filters.StreamFilter).toBe('function');
        expect(sound).toBeInstanceOf(SoundLibrary);
    });
});
