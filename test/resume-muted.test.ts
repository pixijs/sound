import path from 'path';
import { IMediaInstance, Sound, sound, webaudio } from '../src';

const alert = path.join(__dirname, 'resources', 'alert-4.mp3');

function wait(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const cycles: [string, (instance: IMediaInstance) => void][] = [
    ['instance paused', (instance) =>
    {
        instance.paused = true;
        instance.paused = false;
    }],
    ['pauseAll and resumeAll', () =>
    {
        sound.pauseAll();
        sound.resumeAll();
    }],
];

for (const useLegacy of [false, true])
{
    describe(`Resume a muted instance (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        let mySound: Sound;

        /** The volume the instance is output at: the element's volume, or the instance gain once the context runs. */
        async function outputVolume(instance: IMediaInstance): Promise<number>
        {
            if (useLegacy)
            {
                return (instance as any)._source.volume;
            }
            const { audioContext } = sound.context as webaudio.WebAudioContext;

            for (let i = 0; i < 50 && audioContext.state !== 'running'; i++)
            {
                await wait(10);
            }
            // a gain read straight after it's set still has the old value
            await wait(10);

            return (instance as any)._gain.gain.value;
        }

        async function playFresh(muted: boolean): Promise<IMediaInstance>
        {
            (Sound as any)._pool.length = 0;
            const instance = await mySound.play({ loop: true, muted });

            // let the HTML element report it is playing before anything pauses it
            await wait(50);

            return instance;
        }

        beforeAll(async () =>
        {
            sound.useLegacy = useLegacy;
            mySound = await new Promise<Sound>((resolve, reject) =>
            {
                Sound.from({
                    url: alert,
                    preload: true,
                    loaded: (err, s) => (err ? reject(err) : resolve(s)),
                });
            });
        });

        afterEach(() =>
        {
            mySound.stop();
            sound.resumeAll();
        });

        afterAll(() =>
        {
            mySound.destroy();
        });

        it.each(cycles)('should stay silent when muted (%s)', async (_name, pauseAndResume) =>
        {
            const instance = await playFresh(true);

            expect(await outputVolume(instance)).toBe(0);
            pauseAndResume(instance);
            expect(instance.muted).toBe(true);
            expect(await outputVolume(instance)).toBe(0);
        });

        it.each(cycles)('should stay audible when not muted (%s)', async (_name, pauseAndResume) =>
        {
            const instance = await playFresh(false);

            expect(await outputVolume(instance)).toBeGreaterThan(0);
            pauseAndResume(instance);
            expect(await outputVolume(instance)).toBeGreaterThan(0);
        });
    });
}
