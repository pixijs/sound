import path from 'path';
import { Assets, utils } from 'pixi.js';
import { Sound, sound, soundAsset } from '../src';

/** Every alias currently registered in the library. */
const libraryAliases = () => Object.keys((sound as any)._sounds);

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
                name: [fullAlias, shortAlias],
                srcs: path.join(__dirname, 'resources/silence.mp3'),
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
            jest.restoreAllMocks();
            sound.removeAll();
        });

        it('should play every manifest alias and unload the shared sound once', async () =>
        {
            const loaded = Assets.get(fullAlias) as Sound;

            expect(sound.exists(fullAlias)).toBe(true);
            expect(sound.exists(shortAlias)).toBe(true);
            expect(sound.find(fullAlias)).toBe(loaded);
            expect(sound.find(shortAlias)).toBe(loaded);
            expect(Assets.get(shortAlias)).toBe(loaded);
            const play = jest.spyOn(loaded, 'play').mockReturnValue(null);

            sound.play(fullAlias);
            sound.play(shortAlias);
            expect(play).toHaveBeenCalledTimes(2);

            const destroy = jest.spyOn(loaded, 'destroy');

            await Assets.unload(shortAlias);
            expect(destroy).toHaveBeenCalledTimes(1);
            expect(sound.exists(fullAlias)).toBe(false);
            expect(sound.exists(shortAlias)).toBe(false);
        });

        it('should unload a bundle asset with several names without errors', async () =>
        {
            const loaded = Assets.get(fullAlias) as Sound;
            const destroy = jest.spyOn(loaded, 'destroy');
            const unload = jest.spyOn(soundAsset.loader, 'unload');
            const assert = jest.spyOn(console, 'assert');

            // The bundle resolves to one asset per name, so the loader unloads it once per name.
            await Assets.unloadBundle(bundle);
            // The loader doesn't wait for parser unloads, so wait here to surface any rejection.
            await Promise.all(unload.mock.results.map((result) => result.value));

            expect(unload).toHaveBeenCalledTimes(2);
            expect(assert).not.toHaveBeenCalledWith(false, expect.any(String));
            expect(destroy).toHaveBeenCalledTimes(1);
            expect(sound.exists(fullAlias)).toBe(false);
            expect(sound.exists(shortAlias)).toBe(false);
        });

        it('should remove all references when removed by a secondary alias', async () =>
        {
            const loaded = Assets.get(fullAlias) as Sound;
            const destroy = jest.spyOn(loaded, 'destroy');

            sound.remove(shortAlias);
            expect(sound.exists(fullAlias)).toBe(false);
            expect(sound.exists(shortAlias)).toBe(false);
            await Assets.unload(fullAlias);
            expect(destroy).toHaveBeenCalledTimes(1);
        });

        it('should destroy each sound only once in removeAll', async () =>
        {
            const loaded = Assets.get(fullAlias) as Sound;
            const destroy = jest.spyOn(loaded, 'destroy');

            sound.removeAll();
            expect(sound.exists(fullAlias)).toBe(false);
            expect(sound.exists(shortAlias)).toBe(false);
            await Assets.unload(fullAlias);
            expect(destroy).toHaveBeenCalledTimes(1);
        });

        it('should destroy a sound added under two names only once in removeAll', () =>
        {
            const shared = Sound.from({ url: path.join(__dirname, 'resources/alert-7.mp3') });
            const destroy = jest.spyOn(shared, 'destroy');

            sound.add(`first-${useLegacy}`, shared);
            sound.add(`second-${useLegacy}`, shared);

            expect(() => sound.removeAll()).not.toThrow();
            expect(destroy).toHaveBeenCalledTimes(1);
            expect(sound.exists(`first-${useLegacy}`)).toBe(false);
            expect(sound.exists(`second-${useLegacy}`)).toBe(false);
        });

        it('should keep the name a direct URL load had before', async () =>
        {
            const url = path.join(__dirname, 'resources/alert-12.mp3').replace(/\\/g, '/');
            const load = jest.spyOn(soundAsset.loader, 'load');
            const before = libraryAliases();
            const loaded = await Assets.load(url) as Sound;

            try
            {
                // Some PixiJS 7 versions pass no alias for a URL load and others pass the URL,
                // so compute the name v5 has always used from what the loader was given.
                expect(load).toHaveBeenCalledTimes(1);
                const asset = load.mock.calls[0][1] as { src: string, alias?: string[] };
                const name = asset.alias?.[0] ?? utils.path.basename(asset.src, utils.path.extname(asset.src));

                expect(libraryAliases().filter((alias) => !before.includes(alias))).toEqual([name]);
                expect(sound.find(name)).toBe(loaded);

                const play = jest.spyOn(loaded, 'play').mockReturnValue(null);

                sound.play(name);
                expect(play).toHaveBeenCalledTimes(1);
            }
            finally
            {
                await Assets.unload(url);
            }
            expect(libraryAliases()).toEqual(before);
        });

        it('should skip empty aliases', async () =>
        {
            const src = path.join(__dirname, 'resources/alert-12.mp3');
            const name = `named-${useLegacy}`;
            const asset = { src, alias: [name, '', undefined] } as any;
            const before = libraryAliases();
            const loaded = await soundAsset.loader.load(src, asset);

            expect(libraryAliases().filter((alias) => !before.includes(alias))).toEqual([name]);
            expect(sound.find(name)).toBe(loaded);
            await soundAsset.loader.unload(loaded, asset);
            expect(libraryAliases()).toEqual(before);
        });

        it('should preserve the basename alias for direct URL loads', async () =>
        {
            const url = path.join(__dirname, 'resources/alert-4.mp3').replace(/\\/g, '/');
            const loaded = await Assets.load(url) as Sound;

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

        it.each([false, true])('should preserve reassigned aliases on unload (all: %s)', async (all) =>
        {
            const loaded = Assets.get(fullAlias) as Sound;
            const replacement = Sound.from({ url: path.join(__dirname, 'resources/silence.mp3') });
            const destroy = jest.spyOn(loaded, 'destroy');
            const replacementDestroy = jest.spyOn(replacement, 'destroy');
            const assert = jest.spyOn(console, 'assert').mockImplementation(() => undefined);

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
            const loaded = Assets.get(fullAlias) as Sound;
            const stop = jest.spyOn(loaded, 'stop');

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
