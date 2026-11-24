import { Assets } from 'pixi.js';
import { filters, htmlaudio, IMediaInstance, Sound, sound, utils, webaudio } from '../src';
import { dataUrlMp3, dataUrlOgg } from './resources/dataUrlResources';

declare global
{
    var __resources: string;
}

// Global reference to the resources
window.__resources = '/test/resources';

const manifest: Record<string, string> = {
    'alert-4': `${__resources}/alert-4.mp3`,
    'alert-7': `${__resources}/alert-7.mp3`,
    'alert-12': `${__resources}/alert-12.mp3`,
    'musical-11': `${__resources}/musical-11.mp3`,
    'alert-4-ogg': `${__resources}/alert-4.ogg`,
    silence: `${__resources}/silence.mp3`,
    dataUrlMp3,
    dataUrlOgg
};

interface Deferred
{
    /** Settles when `resolve` is called, or rejects with the first error thrown in a guarded callback. */
    promise: Promise<void>;
    /** Call where the test is complete. */
    resolve: () => void;
    /** Wraps a callback so that an error thrown inside it rejects `promise`. */
    guard: <A extends unknown[]>(callback: (...args: A) => void) => (...args: A) => void;
}

/**
 * A promise for a test to await while its callbacks run. An assertion that fails inside
 * a guarded callback fails the test with its own message, instead of a timeout.
 */
function deferred(): Deferred
{
    let resolve!: () => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<void>((res, rej) =>
    {
        resolve = res;
        reject = rej;
    });

    return {
        promise,
        resolve,
        guard: (callback) => (...args) =>
        {
            try
            {
                callback(...args);
            }
            catch (err)
            {
                reject(err);
            }
        },
    };
}

// Import the library
function suite(useLegacy = false): void
{
    const suffix = useLegacy ? ' (htmlaudio)' : ' (webaudio)';

    describe(`SoundLibrary${suffix}`, () =>
    {
        beforeAll(async () =>
        {
            // Set the legacy
            sound.useLegacy = !!useLegacy;
        });

        afterAll(() =>
        {
            sound.removeAll();
        });

        afterEach(() =>
        {
            (Sound as any)._pool.length = 0;
        });

        it('should recreate the library', () =>
        {
            sound.close().init();
            sound.useLegacy = !!useLegacy;
        });

        it('should load a manifest', async () =>
        {
            let counter = 0;
            const allLoaded = deferred();
            const results = sound.add(manifest, {
                preload: true,
                loaded: allLoaded.guard((_err, s) =>
                {
                    expect(s?.isLoaded).toBe(true);
                    expect(s?.isPlayable).toBe(true);
                    expect(s?.autoPlay).toBe(false);
                    expect(s?.loop).toBe(false);
                    expect(s?.preload).toBe(true);
                    expect(s).toBeInstanceOf(Sound);
                    counter++;
                    if (counter === Object.keys(manifest).length)
                    {
                        allLoaded.resolve();
                    }
                }),
            });

            expect(typeof results).toBe('object');
            expect(results['alert-4']).toBeInstanceOf(Sound);
            expect(results['alert-7']).toBeInstanceOf(Sound);
            expect(results['alert-12']).toBeInstanceOf(Sound);
            expect(results['musical-11']).toBeInstanceOf(Sound);
            expect(results['alert-4-ogg']).toBeInstanceOf(Sound);
            expect(results.silence).toBeInstanceOf(Sound);
            expect(results.dataUrlMp3).toBeInstanceOf(Sound);
            expect(results.dataUrlOgg).toBeInstanceOf(Sound);
            await allLoaded.promise;
        });

        it('should let global options override local ones when adding a map', () =>
        {
            const results = sound.add({
                'map-precedence': { url: manifest['alert-4'], volume: 0.5, loop: true },
            }, { volume: 0.25 });
            const s = results['map-precedence'];

            expect(s.volume).toBe(0.25);
            expect(s.loop).toBe(true);
            sound.remove('map-precedence');
        });

        it('should get a reference by alias', () =>
        {
            const s = sound.find('alert-7');

            expect(s).toBeDefined();
            expect(s).toBeInstanceOf(Sound);
        });

        it('should play multiple at once', () =>
        {
            const s = sound.find('alert-12');

            s.play();
            s.play();
            s.play();
            s.play();
            expect(s.instances.length).toBe(4);
            s.stop();
            expect(s.instances.length).toBe(0);
        });

        it('should play with blocking', () =>
        {
            const s = sound.find('alert-4');

            s.singleInstance = true;
            s.play();
            s.play();
            s.play();
            s.play();
            expect(s.instances.length).toBe(1);
            s.stop();
            expect(s.instances.length).toBe(0);
            s.singleInstance = false;
        });

        it('should play with stopping single instance', () =>
        {
            const s = sound.find('alert-4');

            s.play();
            s.play();
            s.play();
            const instance = s.play() as IMediaInstance;

            instance.stop();
            expect(s.instances.length).toBe(3);
            s.stop();
            expect(s.instances.length).toBe(0);
        });

        it('should play with single instance param', () =>
        {
            const s = sound.find('alert-4');

            s.play();
            s.play();
            s.play();
            expect(s.instances.length).toBe(3);
            s.play({ singleInstance: true });
            expect(s.instances.length).toBe(1);
            s.stop();
            expect(s.instances.length).toBe(0);
        });

        it('should support volume change when instance is paused', async () =>
        {
            const s = sound.find('alert-4');
            const i = s.play({ volume: 0 }) as IMediaInstance;
            const changed = deferred();

            setTimeout(changed.guard(() =>
            {
                i.paused = true;
                i.volume = 0.2;
                changed.resolve();
            }), 100);
            await changed.promise;
        });

        it('should play a sound by alias', async () =>
        {
            const completed = deferred();

            sound.play('silence', {
                complete()
                {
                    completed.resolve();
                },
            });
            await completed.promise;
        });

        it('should check to see if a file is playing', async () =>
        {
            const completed = deferred();

            sound.stopAll();
            expect(sound.isPlaying()).toBe(false);
            sound.play('silence', {
                complete: completed.guard(() =>
                {
                    sound.stopAll();
                    expect(sound.isPlaying()).toBe(false);
                    completed.resolve();
                })
            });
            expect(sound.isPlaying()).toBe(true);
            await completed.promise;
        });

        it('should remove all sounds', () =>
        {
            sound.removeAll();
            expect(Object.keys((sound as any)._sounds).length).toBe(0);
        });

        it('should load a sound file', async () =>
        {
            const alias = 'silence';
            const loaded = deferred();
            const s = sound.add(alias, {
                url: manifest[alias],
                volume: 0,
                preload: true,
                loaded: loaded.guard((err, instance) =>
                {
                    expect(err).toBe(null);
                    expect(instance).toBe(s);
                    expect(instance?.isPlayable).toBe(true);
                    expect(sound.exists(alias)).toBe(true);
                    sound.remove(alias);
                    expect(sound.exists(alias)).toBe(false);
                    loaded.resolve();
                }),
            });

            expect(s.isLoaded).toBe(false);
            expect(s.isPlayable).toBe(false);
            await loaded.promise;
        });

        it('should play a file', async () =>
        {
            const alias = 'silence';
            const completed = deferred();
            const s = sound.add(alias, {
                url: manifest[alias],
                preload: true,
                loaded: completed.guard(() =>
                {
                    expect(sound.volume(alias)).toBe(1);
                    sound.volume(alias, 0);
                    expect(sound.volume(alias)).toBe(0);
                    expect(s.volume).toBe(0);

                    const instance = sound.play(alias, completed.guard(() =>
                    {
                        expect(instance.progress).toBe(1);
                        sound.remove(alias);
                        completed.resolve();
                    })) as IMediaInstance;

                    expect(instance.progress).toBe(0);

                    // Pause
                    sound.pause(alias);
                    expect(s.isPlaying).toBe(false);

                    // Resume
                    sound.resume(alias);
                    expect(s.isPlaying).toBe(true);
                }),
            });

            await completed.promise;
        });

        it('sound play once a file', async () =>
        {
            const completed = deferred();
            const alias = utils.playOnce(manifest.silence, completed.guard((err) =>
            {
                expect(alias).toBeDefined();
                expect(sound.exists(alias)).toBe(false);
                expect(err).toBe(null);
                completed.resolve();
            }));

            await completed.promise;
        });

        if (!useLegacy)
        {
            it('should play a sine tone', async () =>
            {
                const s = utils.sineTone(200, 0.1);
                const completed = deferred();

                s.volume = 0;
                s.play(() =>
                {
                    completed.resolve();
                });
                expect(s.isPlaying);
                await completed.promise;
            });
        }

        it('should setup sprites', () =>
        {
            const alias = 'musical-11';
            const s = sound.add(alias, {
                url: manifest[alias],
                sprites: {
                    foo: {
                        start: 0,
                        end: 2,
                    },
                    bar: {
                        start: 3,
                        end: 5,
                    },
                },
            });

            expect(Object.keys(s.sprites).length).toBe(2);
            expect(s.sprites.foo.start).toBe(0);
            expect(s.sprites.foo.end).toBe(2);
            expect(s.sprites.foo.duration).toBe(2);
            expect(s.sprites.bar.start).toBe(3);
            expect(s.sprites.bar.end).toBe(5);
            expect(s.sprites.bar.duration).toBe(2);
            expect(s.sprites.foo.parent).toBe(s);
            expect(s.sprites.bar.parent).toBe(s);
        });

        if (!useLegacy)
        {
            it('should take AudioBuffer as source', async () =>
            {
                const s = utils.sineTone(200, 0.1);
                const buffer = (s.media as any).buffer as AudioBuffer;

                expect(buffer).toBeInstanceOf(AudioBuffer);

                const snd = Sound.from(buffer);
                const completed = deferred();

                snd.volume = 0;
                snd.play(() =>
                {
                    completed.resolve();
                });
                expect(snd.duration).toBe(0.1);
                expect(snd.isPlaying).toBe(true);

                expect(sound.add('sine', buffer)).toBeInstanceOf(Sound);
                await completed.promise;
            });
        }
    });

    describe(`SoundInstance${suffix}`, () =>
    {
        afterEach(() =>
        {
            sound.removeAll();
        });

        it('should return Promise for playing unloaded sound', async () =>
        {
            const SoundInstance = useLegacy
                ? htmlaudio.HTMLAudioInstance
                : webaudio.WebAudioInstance;
            const s = Sound.from(manifest.silence);

            expect(s).toBeInstanceOf(Sound);
            const promise = s.play() as Promise<IMediaInstance>;
            const checked = promise.then((instance) =>
            {
                expect(instance).toBeInstanceOf(SoundInstance);
            });

            expect(promise).toBeInstanceOf(Promise);
            await checked;
        });

        it('should return instance for playing loaded sound', async () =>
        {
            const SoundInstance = useLegacy
                ? htmlaudio.HTMLAudioInstance
                : webaudio.WebAudioInstance;
            const loaded = deferred();
            const s = Sound.from({
                url: manifest.silence,
                preload: true,
                loaded: loaded.guard((err) =>
                {
                    expect(err).toBe(null);
                    expect(s.isLoaded).toBe(true);
                    expect(s.isPlayable).toBe(true);
                    const instance = s.play();

                    expect(instance).toBeInstanceOf(SoundInstance);
                    loaded.resolve();
                }),
            });

            await loaded.promise;
        });

        it('should apply filters for sound instance', async () =>
        {
            const loaded = deferred();

            Sound.from({
                url: manifest.silence,
                preload: true,
                loaded: loaded.guard((err, snd) =>
                {
                    expect(err).toBe(null);

                    const filter = new filters.TelephoneFilter();
                    const instance = snd?.play({
                        filters: [filter],
                    });
                    const instance2 = snd?.play();

                    if (useLegacy)
                    {
                        // eslint-disable-next-line @typescript-eslint/no-empty-function
                        const spy = vi.spyOn(console, 'warn').mockImplementation(() => { });

                        expect((instance as any).filters).toBe(null);
                        expect((instance2 as any).filters).toBe(null);
                        spy.mockRestore();
                    }
                    else
                    {
                        expect(instance).toBeInstanceOf(webaudio.WebAudioInstance);
                        expect(instance2).toBeInstanceOf(webaudio.WebAudioInstance);
                        expect((instance as webaudio.WebAudioInstance).filters).toBeInstanceOf(Array);
                        expect((instance as webaudio.WebAudioInstance).filters.length).toBe(1);
                        expect((instance as webaudio.WebAudioInstance).filters[0]).toBe(filter);
                        expect((instance as webaudio.WebAudioInstance).progress).toBeLessThan(1);
                        (instance as webaudio.WebAudioInstance).filters = null as any;
                        expect((instance as webaudio.WebAudioInstance).filters).toBe(null);
                        expect((instance as webaudio.WebAudioInstance).progress).toBeLessThan(1);
                        expect((instance2 as webaudio.WebAudioInstance).filters).toBeUndefined();
                        (instance2 as webaudio.WebAudioInstance).destroy();
                        expect((instance2 as webaudio.WebAudioInstance).filters).toBe(null);
                    }
                    loaded.resolve();
                })
            });
            await loaded.promise;
        });
    });

    // Currently this isn't working, probably because of Workers
    describe(`soundAsset${suffix}`, () =>
    {
        beforeAll(async () =>
        {
            await Assets.init({ basePath: window.__resources });
        });

        afterEach(() =>
        {
            sound.removeAll();
        });

        it('should load files with Assets', async () =>
        {
            for (const name in manifest)
            {
                expect(sound.exists(name)).toBe(false);

                Assets.add({ alias: name, src: manifest[name] });
                const s = await Assets.load<Sound>(name);
                const ClassRef = useLegacy
                    ? htmlaudio.HTMLAudioMedia
                    : webaudio.WebAudioMedia;

                expect(sound.exists(name)).toBe(true);
                expect(sound.find(name)).toBe(s);
                expect(s.media).toBeInstanceOf(ClassRef);
                expect(s).toBeInstanceOf(Sound);
                expect(s.isLoaded).toBe(true);
                expect(s.isPlayable).toBe(true);
                await Assets.unload(name);
                expect(sound.exists(name)).toBe(false);
            }
        });

        it('should load an asset without alias', async () =>
        {
            expect(sound.exists('silence')).toBe(false);

            const s = await Assets.load<Sound>(manifest.silence);
            const ClassRef = useLegacy
                ? htmlaudio.HTMLAudioMedia
                : webaudio.WebAudioMedia;

            expect(sound.exists('silence')).toBe(true);
            expect(sound.find('silence')).toBe(s);
            expect(s.media).toBeInstanceOf(ClassRef);
            expect(s).toBeInstanceOf(Sound);
            expect(s.isLoaded).toBe(true);
            expect(s.isPlayable).toBe(true);
            await Assets.unload(manifest.silence);
            expect(sound.exists('silence')).toBe(false);
        });
    });
}

export { suite };
