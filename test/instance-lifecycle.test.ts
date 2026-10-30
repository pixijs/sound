import path from 'path';
import { IMediaInstance, Sound, sound, webaudio } from '../src';

const musical = path.join(__dirname, 'resources', 'musical-11.mp3');

function wait(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Loudest sample on the library's analyser, read once the context is running again. */
async function level(): Promise<number>
{
    const context = sound.context as webaudio.WebAudioContext;

    for (let i = 0; i < 50 && context.audioContext.state !== 'running'; i++)
    {
        await wait(10);
    }
    expect(context.audioContext.state).toBe('running');
    await wait(100);
    const data = new Uint8Array(context.analyser.fftSize);

    context.analyser.getByteTimeDomainData(data);

    return Math.max(...Array.from(data, (value) => Math.abs(value - 128)));
}

for (const useLegacy of [false, true])
{
    describe(`Instance lifecycle (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        const alias = `lifecycle-${useLegacy}`;
        let music: Sound;

        async function playCounted(): Promise<{ instance: IMediaInstance, stopCount: () => number }>
        {
            const instance = music.play() as IMediaInstance;
            let stops = 0;

            instance.on('stop', () => stops++);
            // let the HTML element report it is playing before anything pauses it
            await wait(50);

            return { instance, stopCount: () => stops };
        }

        async function expectSilent(): Promise<void>
        {
            if (!useLegacy)
            {
                expect(await level()).toBe(0);
            }
        }

        beforeAll(async () =>
        {
            sound.useLegacy = useLegacy;
            (Sound as any)._pool.length = 0;
            music = await new Promise<Sound>((resolve, reject) =>
            {
                sound.add(alias, {
                    url: musical,
                    preload: true,
                    loaded: (err, s) => (err ? reject(err) : resolve(s)),
                });
            });
        });

        afterEach(() =>
        {
            // Stop playing instances before resuming, so a resume can't restart them over themselves (#137)
            music.stop();
            window.dispatchEvent(new Event('focus'));
            sound.resumeAll();
            music.resume();
            music.instances.forEach((instance) =>
            {
                instance.paused = false;
            });
            music.stop();
        });

        afterAll(() =>
        {
            sound.remove(alias);
            (Sound as any)._pool.length = 0;
        });

        it('should not emit stop again from an instance that was already stopped', async () =>
        {
            const { instance } = await playCounted();
            let stops = 0;

            instance.stop();
            instance.on('stop', () => stops++);
            instance.stop();

            expect(stops).toBe(0);
        });

        it('should stop an instance paused on itself', async () =>
        {
            const { instance, stopCount } = await playCounted();

            instance.paused = true;
            instance.stop();

            expect(stopCount()).toBe(1);
            expect(music.instances.length).toBe(0);
        });

        it('should stop an instance whose sound is paused, and not restart on resume', async () =>
        {
            const { instance, stopCount } = await playCounted();

            music.pause();
            instance.stop();
            music.resume();

            expect(stopCount()).toBe(1);
            expect(music.instances.length).toBe(0);
            await expectSilent();
        });

        it('should stop an instance paused by pauseAll, and not restart on resumeAll', async () =>
        {
            const { instance, stopCount } = await playCounted();

            sound.pauseAll();
            instance.stop();
            sound.resumeAll();

            expect(stopCount()).toBe(1);
            expect(music.instances.length).toBe(0);
            await expectSilent();
        });

        it('should stop every instance of a paused sound with Sound.stop', async () =>
        {
            const first = await playCounted();
            const second = await playCounted();

            music.pause();
            music.stop();
            music.resume();

            expect(first.stopCount()).toBe(1);
            expect(second.stopCount()).toBe(1);
            expect(music.instances.length).toBe(0);
            await expectSilent();
        });

        it('should stop paused sounds with stopAll', async () =>
        {
            const { stopCount } = await playCounted();

            sound.pauseAll();
            sound.stopAll();
            sound.resumeAll();

            expect(stopCount()).toBe(1);
            expect(music.instances.length).toBe(0);
            await expectSilent();
        });

        if (!useLegacy)
        {
            // HTMLAudioContext has no blur handling, so only WebAudio auto-pauses
            it('should stop an instance paused by window blur, and not restart on focus', async () =>
            {
                const { instance, stopCount } = await playCounted();

                window.dispatchEvent(new Event('blur'));
                expect(sound.context.paused).toBe(true);
                instance.stop();
                window.dispatchEvent(new Event('focus'));

                expect(stopCount()).toBe(1);
                expect(music.instances.length).toBe(0);
                await expectSilent();
            });
        }
    });
}
