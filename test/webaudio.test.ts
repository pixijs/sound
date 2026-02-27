import { scheduler } from 'node:timers/promises';
import { filters, Sound } from '../src';
import { WebAudioInstance } from '../src/webaudio/WebAudioInstance';
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

describe(`WebAudioInstance`, () =>
{
    let instance: WebAudioInstance;

    beforeEach(() =>
    {
        const context = new AudioContext({ sampleRate: 8000 });

        // Creates a 3 second long silent sound source
        const source = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);

        const media = Sound.from({ source }).media;

        // If we don't loead media here there is no sound buffer to look at later.
        media.load();
        instance = media.create() as WebAudioInstance;
    });

    afterEach(() =>
    {
        instance.destroy();
    });

    it('should match type hinting without having being interacted with', () =>
    {
        expect(instance.speed).toBe(1);
        expect(instance.volume).toBe(1);
        expect(instance.muted).toBe(false);
        expect(instance.loop).toBe(false);
        expect(instance.filters).toEqual([]);
    });

    it('should not keep a reference to the assigned filter array', () =>
    {
        const filter1 = new filters.DistortionFilter(0.5);
        const filter2 = new filters.DistortionFilter(0.5);
        const instanceFilters = [filter1];

        instance.filters = instanceFilters;
        expect(instance.filters).toHaveLength(1);
        expect(instance.filters).toContain(filter1);
        expect(instance.filters).not.toBe(instanceFilters);

        instanceFilters.push(filter2);

        expect(instance.filters).not.toContain(filter2);
    });

    it('should not keep a reference to the assigned filter array when filter is assigned through playOptions', async () =>
    {
        const filter1 = new filters.DistortionFilter(0.5);
        const instanceFilters = [filter1];

        instance.play({ filters: instanceFilters });

        expect(instance.filters).not.toBe(instanceFilters);
    });

    it('should allow array functions on the filter array', () =>
    {
        const filter = new filters.DistortionFilter(0.5);

        instance.filters.push(filter);

        expect(instance.filters).toContain(filter);

        instance.filters.pop();

        expect(instance.filters).toHaveLength(0);
    });

    it('should ramp out gain on pause', async () =>
    {
        instance.play({ pauseResumeRamp: 20 });

        await scheduler.yield();

        instance.paused = true;

        await scheduler.yield();

        expect((instance as any)._gain.gain.value).toBeLessThanOrEqual(1);
        expect((instance as any)._gain.gain.value).toBeGreaterThan(0);
    });
});
