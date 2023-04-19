import { Assets } from 'pixi.js';
import { sound, Sound, utils, webaudio, htmlaudio, filters, SoundLibrary, IMediaInstance } from '../src';
import { dataUrlMp3 } from './resources/dataUrlResources';
import path from 'path';

declare global
{
    var __resources: string;
}

// Global reference to the resources
window.__resources = path.join(__dirname, 'resources');

const manifest: Record<string, string> = {
    'alert-4': path.join(__resources, 'alert-4.mp3'),
    'alert-7': path.join(__resources, 'alert-7.mp3'),
    'alert-12': path.join(__resources, 'alert-12.mp3'),
    'musical-11': path.join(__resources, 'musical-11.mp3'),
    silence: path.join(__resources, 'silence.mp3'),
    'dataUrlMp3': dataUrlMp3,
};

// Import the library
export function suite(useLegacy = false): void
{
    const suffix = useLegacy ? ' (legacy)' : '';

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

        it('should recreate the library', () =>
        {
            sound.close().init();
            sound.useLegacy = !!useLegacy;
        });

        it('should load a manifest', function (done)
        {
            let counter = 0;
            const results = sound.add(manifest, {
                preload: true,
                loaded: (_err, s) =>
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
                        done();
                    }
                },
            });

            expect(typeof results).toBe('object');
            expect(results['alert-4']).toBeInstanceOf(Sound);
            expect(results['alert-7']).toBeInstanceOf(Sound);
            expect(results['alert-12']).toBeInstanceOf(Sound);
            expect(results['musical-11']).toBeInstanceOf(Sound);
            expect(results.silence).toBeInstanceOf(Sound);
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

        it('should support volume change when instance is paused', function (done)
        {
            const s = sound.find('alert-4');
            const i = s.play({ volume: 0 }) as IMediaInstance;

            setTimeout(() =>
            {
                i.paused = true;
                i.volume = 0.2;
                done();
            }, 100);
        });

        it('should play a sound by alias', function (done)
        {
            sound.play('silence', {
                complete()
                {
                    done();
                },
            });
        });

        it('should check to see if a file is playing', function (done)
        {
            sound.stopAll();
            expect(sound.isPlaying()).toBe(false);
            sound.play('silence', {
                complete()
                {
                    sound.stopAll();
                    expect(sound.isPlaying()).toBe(false);
                    done();
                }
            });
            expect(sound.isPlaying()).toBe(true);
        });

        it('should remove all sounds', () =>
        {
            sound.removeAll();
            expect(Object.keys((sound as any)._sounds).length).toBe(0);
        });

        it('should load a sound file', function (done)
        {
            const alias = 'silence';
            const s = sound.add(alias, {
                url: manifest[alias],
                volume: 0,
                preload: true,
                loaded: (err, instance) =>
                {
                    expect(err).toBe(null);
                    expect(instance).toBe(s);
                    expect(instance?.isPlayable).toBe(true);
                    expect(sound.exists(alias)).toBe(true);
                    sound.remove(alias);
                    expect(sound.exists(alias)).toBe(false);
                    done();
                },
            });

            expect(s.isLoaded).toBe(false);
            expect(s.isPlayable).toBe(false);
        });

        it('should play a file', function (done)
        {
            const alias = 'silence';
            const s = sound.add(alias, {
                url: manifest[alias],
                preload: true,
                loaded: () =>
                {
                    expect(sound.volume(alias)).toBe(1);
                    sound.volume(alias, 0);
                    expect(sound.volume(alias)).toBe(0);
                    expect(s.volume).toBe(0);

                    const instance = sound.play(alias, () =>
                    {
                        expect(instance.progress).toBe(1);
                        sound.remove(alias);
                        done();
                    }) as IMediaInstance;

                    expect(instance.progress).toBe(0);

                    // Pause
                    sound.pause(alias);
                    expect(s.isPlaying).toBe(false);

                    // Resume
                    sound.resume(alias);
                    expect(s.isPlaying).toBe(true);
                },
            });
        });

        it('sound play once a file', (done) =>
        {
            const alias = utils.playOnce(manifest.silence, (err) =>
            {
                expect(alias).toBeDefined();
                expect(sound.exists(alias)).toBe(false);
                expect(err).toBe(null);
                done();
            });
        });

        if (!useLegacy)
        {
            it('should play a sine tone', (done) =>
            {
                const s = utils.sineTone(200, 0.1);

                s.volume = 0;
                s.play(() =>
                {
                    done?.();
                });
                expect(s.isPlaying);
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
            it('should take AudioBuffer as source', (done) =>
            {
                const s = utils.sineTone(200, 0.1);
                const buffer = (s.media as any).buffer as AudioBuffer;

                expect(buffer).toBeInstanceOf(AudioBuffer);

                const snd = Sound.from(buffer);

                snd.volume = 0;
                snd.play(() =>
                {
                    done?.();
                });
                expect(snd.duration).toBe(0.1);
                expect(snd.isPlaying).toBe(true);

                expect(sound.add('sine', buffer)).toBeInstanceOf(Sound);
            });
        }
    });

    if (!useLegacy)
    {
        describe(`filters.DistortionFilter${suffix}`, () =>
        {
            it('should create a DistortionFilter', () =>
            {
                const filter = new filters.DistortionFilter(0.5);

                expect(filter.amount).toBe(0.5);
            });
        });
    }

    describe(`SoundInstance${suffix}`, () =>
    {
        afterEach(() =>
        {
            sound.removeAll();
        });

        it('should return Promise for playing unloaded sound', function (done)
        {
            const SoundInstance = useLegacy
                ? htmlaudio.HTMLAudioInstance
                : webaudio.WebAudioInstance;
            const s = Sound.from(manifest.silence);

            expect(s).toBeInstanceOf(Sound);
            const promise = s.play() as Promise<IMediaInstance>;

            promise.then((instance) =>
            {
                expect(instance).toBeInstanceOf(SoundInstance);
                done();
            });
            expect(promise).toBeInstanceOf(Promise);
        });

        it('should return instance for playing loaded sound', function (done)
        {
            const SoundInstance = useLegacy
                ? htmlaudio.HTMLAudioInstance
                : webaudio.WebAudioInstance;
            const s = Sound.from({
                url: manifest.silence,
                preload: true,
                loaded: (err) =>
                {
                    expect(err).toBe(null);
                    expect(s.isLoaded).toBe(true);
                    expect(s.isPlayable).toBe(true);
                    const instance = s.play();

                    expect(instance).toBeInstanceOf(SoundInstance);
                    done();
                },
            });
        });

        it('should apply filters for sound instance', function (done)
        {
            Sound.from({
                url: manifest.silence,
                preload: true,
                loaded: (err, snd) =>
                {
                    expect(err).toBe(null);

                    const filter = new filters.TelephoneFilter();
                    const instance = snd?.play({
                        filters: [filter],
                    });
                    const instance2 = snd?.play();

                    if (useLegacy)
                    {
                        expect((instance as any).filters).toBe(null);
                        expect((instance2 as any).filters).toBe(null);
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
                    done();
                }
            });
        });
    });

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
                Assets.add(name, manifest[name]);
                const s = await Assets.load<Sound>(name);
                const ClassRef = useLegacy
                    ? htmlaudio.HTMLAudioMedia
                    : webaudio.WebAudioMedia;

                expect(s.media).toBeInstanceOf(ClassRef);
                expect(s).toBeInstanceOf(Sound);
                expect(s.isLoaded).toBe(true);
                expect(s.isPlayable).toBe(true);
                await Assets.unload(name);
            }
        });

        it('should load an asset without alias', async () =>
        {
            const s = await Assets.load<Sound>(manifest.silence);
            const ClassRef = useLegacy
                ? htmlaudio.HTMLAudioMedia
                : webaudio.WebAudioMedia;

            expect(sound.find('silence')).toBe(s);
            expect(s.media).toBeInstanceOf(ClassRef);
            expect(s).toBeInstanceOf(Sound);
            expect(s.isLoaded).toBe(true);
            expect(s.isPlayable).toBe(true);
            await Assets.unload(manifest.silence);
        });
    });
}

suite(false);
suite(true);
