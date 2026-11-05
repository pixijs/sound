import path from 'path';
import { Assets } from 'pixi.js';
import { IMediaInstance, Sound, sound } from '../src';

const musical = path.join(__dirname, 'resources', 'musical-11.mp3');

function wait(ms: number): Promise<void>
{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

for (const useLegacy of [false, true])
{
    describe(`Undefined options (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        const alias = `undefined-options-${useLegacy}`;
        let music: Sound;

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
            music.stop();
            jest.restoreAllMocks();
        });

        afterAll(() =>
        {
            sound.remove(alias);
            (Sound as any)._pool.length = 0;
        });

        it('should use the default volume when play gets an undefined volume', () =>
        {
            let instance: IMediaInstance;

            expect(() =>
            {
                instance = music.play({ volume: undefined }) as IMediaInstance;
            }).not.toThrow();
            expect(instance.volume).toBe(1);
        });

        it('should use the default speed when play gets an undefined speed', () =>
        {
            let instance: IMediaInstance;

            expect(() =>
            {
                instance = music.play({ speed: undefined }) as IMediaInstance;
            }).not.toThrow();
            expect(instance.speed).toBe(1);
        });

        it('should keep looping when play gets an undefined end', async () =>
        {
            const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            let instance: IMediaInstance;

            expect(() =>
            {
                instance = music.play({ loop: true, end: undefined }) as IMediaInstance;
            }).not.toThrow();
            await wait(50);
            expect(instance.loop).toBe(true);
            expect(warn).not.toHaveBeenCalled();
        });

        it('should keep a volume of 0 when play gets one', () =>
        {
            const instance = music.play({ volume: 0 }) as IMediaInstance;

            expect(instance.volume).toBe(0);
        });

        it('should keep a volume of 0 when Sound.from gets one', () =>
        {
            const fromSound = Sound.from({ url: musical, volume: 0 });

            expect(fromSound.volume).toBe(0);
            fromSound.destroy();
        });

        it('should use the default volume and speed when Sound.from gets undefined values', async () =>
        {
            const fromSound = Sound.from({ url: musical, volume: undefined, speed: undefined });

            expect(fromSound.volume).toBe(1);
            expect(fromSound.speed).toBe(1);

            const instance = await fromSound.play();

            expect(instance.volume).toBe(1);
            fromSound.destroy();
        });

        it('should use the default volume when an asset has an undefined volume in its data', async () =>
        {
            const assetAlias = `undefined-options-asset-${useLegacy}`;

            Assets.add({ alias: assetAlias, src: musical, data: { volume: undefined } });
            const loaded = await Assets.load<Sound>(assetAlias);

            expect(loaded.volume).toBe(1);
            await Assets.unload(assetAlias);
        });
    });
}
