import { Assets } from 'pixi.js';
import { Sound, sound } from '../src';

for (const useLegacy of [false, true])
{
    describe(`AssetPack sound aliases (${useLegacy ? 'htmlaudio' : 'webaudio'})`, () =>
    {
        const bundle = `sound-aliases-${useLegacy}`;
        const fullAlias = `main/sounds/silence-${useLegacy}.wav`;
        const shortAlias = `silence-${useLegacy}.wav`;

        beforeAll(() =>
        {
            Assets.addBundle(bundle, [{
                alias: [fullAlias, shortAlias],
                src: '/test/resources/silence.mp3',
            }]);
        });

        beforeEach(async () =>
        {
            sound.useLegacy = useLegacy;
            await Assets.loadBundle(bundle);
        });

        afterEach(async () =>
        {
            if (Assets.cache.has(fullAlias))
            {
                await Assets.unload(fullAlias);
            }
            vi.restoreAllMocks();
            sound.removeAll();
        });

        it('should play every manifest alias and unload the shared sound once', async () =>
        {
            const loaded = Assets.get<Sound>(fullAlias);

            expect(sound.exists(fullAlias)).toBe(true);
            expect(sound.exists(shortAlias)).toBe(true);
            expect(sound.find(fullAlias)).toBe(loaded);
            expect(sound.find(shortAlias)).toBe(loaded);
            expect(Assets.get(shortAlias)).toBe(loaded);
            const play = vi.spyOn(loaded, 'play').mockReturnValue(null!);

            sound.play(fullAlias);
            sound.play(shortAlias);
            expect(play).toHaveBeenCalledTimes(2);

            const destroy = vi.spyOn(loaded, 'destroy');

            await Assets.unload(shortAlias);
            expect(destroy).toHaveBeenCalledTimes(1);
            expect(sound.exists(fullAlias)).toBe(false);
            expect(sound.exists(shortAlias)).toBe(false);
        });

        it('should remove all references when removed by a secondary alias', async () =>
        {
            const loaded = Assets.get<Sound>(fullAlias);
            const destroy = vi.spyOn(loaded, 'destroy');

            sound.remove(shortAlias);
            expect(sound.exists(fullAlias)).toBe(false);
            expect(sound.exists(shortAlias)).toBe(false);
            await Assets.unload(fullAlias);
            expect(destroy).toHaveBeenCalledTimes(1);
        });

        it('should destroy each sound only once in removeAll', async () =>
        {
            const loaded = Assets.get<Sound>(fullAlias);
            const destroy = vi.spyOn(loaded, 'destroy');

            sound.removeAll();
            expect(sound.exists(fullAlias)).toBe(false);
            expect(sound.exists(shortAlias)).toBe(false);
            await Assets.unload(fullAlias);
            expect(destroy).toHaveBeenCalledTimes(1);
        });

        it('should preserve the basename alias for direct URL loads', async () =>
        {
            const url = '/test/resources/alert-4.mp3';
            const loaded = await Assets.load<Sound>(url);

            try
            {
                expect(sound.find('alert-4')).toBe(loaded);
            }
            finally
            {
                await Assets.unload(url);
            }
            expect(sound.exists('alert-4')).toBe(false);
        });

        it('should pass asset data, including sprites, to the sound', async () =>
        {
            const alias = `sprites-${useLegacy}`;

            Assets.add({
                alias,
                src: '/test/resources/musical-11.mp3',
                data: { volume: 0.5, sprites: { coin: { start: 0, end: 0.4 } } },
            });
            const loaded = await Assets.load<Sound>(alias);

            try
            {
                expect(loaded.volume).toBe(0.5);
                expect(loaded.sprites.coin.end).toBe(0.4);
            }
            finally
            {
                await Assets.unload(alias);
            }
        });

        it.each([false, true])('should preserve reassigned aliases on unload (all: %s)', async (all) =>
        {
            const loaded = Assets.get<Sound>(fullAlias);
            const replacement = Sound.from({ url: '/test/resources/silence.mp3' });
            const destroy = vi.spyOn(loaded, 'destroy');
            const replacementDestroy = vi.spyOn(replacement, 'destroy');
            const assert = vi.spyOn(console, 'assert').mockImplementation(() => undefined);

            sound.add(fullAlias, replacement);
            if (all)
            {
                sound.add(shortAlias, replacement);
            }
            assert.mockRestore();

            await Assets.unload(fullAlias);
            expect(destroy).toHaveBeenCalledTimes(1);
            expect(replacementDestroy).not.toHaveBeenCalled();
            expect(sound.find(fullAlias)).toBe(replacement);
            expect(sound.exists(shortAlias)).toBe(all);
        });
        it('should stop each sound only once in stopAll', () =>
        {
            const loaded = Assets.get<Sound>(fullAlias);
            const stop = vi.spyOn(loaded, 'stop');

            sound.stopAll();
            expect(stop).toHaveBeenCalledTimes(1);
        });

        it('should allow removeAll, stopAll and close after close', () =>
        {
            sound.close();

            try
            {
                expect(() => sound.removeAll()).not.toThrow();
                expect(() => sound.stopAll()).not.toThrow();
                expect(() => sound.close()).not.toThrow();
            }
            finally
            {
                sound.init();
            }
        });
    });
}
