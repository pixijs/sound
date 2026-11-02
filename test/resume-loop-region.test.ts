import { IMediaInstance, Sound, sound, webaudio } from '../src';

const regionStart = 1.2;
const regionEnd = 1.5;

function wait(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Records each buffer source started from here on, with its start offset. */
function recordStarts(): { source: AudioBufferSourceNode, offset: number }[]
{
    const starts: { source: AudioBufferSourceNode, offset: number }[] = [];
    const start = AudioBufferSourceNode.prototype.start;

    jest.spyOn(AudioBufferSourceNode.prototype, 'start').mockImplementation(function (
        this: AudioBufferSourceNode, when?: number, offset?: number, duration?: number)
    {
        starts.push({ source: this, offset });
        start.call(this, when, offset, duration);
    });

    return starts;
}

describe('Resume a looping sprite (webaudio)', () =>
{
    let mySound: Sound;

    beforeAll(() =>
    {
        sound.useLegacy = false;
    });

    beforeEach(() =>
    {
        const { audioContext } = sound.context as webaudio.WebAudioContext;

        (Sound as any)._pool.length = 0;
        mySound = Sound.from(audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate));
        mySound.addSprites('region', { start: regionStart, end: regionEnd });
    });

    afterEach(() =>
    {
        jest.restoreAllMocks();
        mySound.destroy();
        sound.resumeAll();
    });

    it.each([
        ['instance paused', (instance: IMediaInstance) =>
        {
            instance.paused = true;
            instance.paused = false;
        }],
        ['pauseAll and resumeAll', () =>
        {
            sound.pauseAll();
            sound.resumeAll();
        }],
    ])('should resume inside the loop region after a wrap (%s)', async (_name, pauseAndResume) =>
    {
        const instance = await mySound.play({ sprite: 'region', loop: true });

        // long enough to wrap past the region's end at least once
        await wait(500);
        const starts = recordStarts();

        pauseAndResume(instance);

        expect(starts).toHaveLength(1);
        const [{ source, offset }] = starts;

        expect(source.loopStart).toBeCloseTo(regionStart, 5);
        expect(source.loopEnd).toBeCloseTo(regionEnd, 5);
        expect(offset).toBeGreaterThanOrEqual(regionStart);
        expect(offset).toBeLessThan(regionEnd);
    });

    it('should loop the new region when a pooled instance plays another sprite', async () =>
    {
        mySound.addSprites('early', { start: 0.3, end: 0.6 });
        const first = await mySound.play({ sprite: 'region', loop: true });

        first.stop();
        const starts = recordStarts();
        const second = await mySound.play({ sprite: 'early', loop: true });

        expect(second).toBe(first);
        expect(starts).toHaveLength(1);
        expect(starts[0].source.loopStart).toBeCloseTo(0.3, 5);
        expect(starts[0].source.loopEnd).toBeCloseTo(0.6, 5);
    });
});
