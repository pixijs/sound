// Require pixi
require("pixi.js");

// Import the library
module.exports = function(libraryPath, useLegacy)
{
    const library = require(libraryPath).default;
    const path = require("path");

    // Global reference to the resources
    global.__resources = path.join(__dirname, "resources");

    // Set the legacy
    library.useLegacy = useLegacy;

    function webAudioOnly(fn) {
        return !useLegacy ? fn : undefined;
    }

    const manifest = {
        "alert-4": path.join(__resources, "alert-4.mp3"),
        "alert-7": path.join(__resources, "alert-7.mp3"),
        "alert-12": path.join(__resources, "alert-12.mp3"),
        "musical-11": path.join(__resources, "musical-11.mp3"),
        "silence": path.join(__resources, "silence.mp3"),
    };

    describe("PIXI.sound", function()
    {
        after(function()
        {
            library.removeAll();
        });

        it("should have the correct classes", function()
        {
            expect(PIXI.sound).to.be.a.function;
            expect(PIXI.sound.Sound).to.be.a.function;
            expect(PIXI.sound.utils).to.be.a.function;
            expect(PIXI.sound.SoundInstance).to.be.a.function;
            expect(PIXI.sound.SoundLibrary).to.be.a.function;
            expect(PIXI.sound.filters).to.be.an.object;
            expect(PIXI.sound.filters.DistortionFilter).to.be.a.function;
            expect(PIXI.sound.filters.EqualizerFilter).to.be.a.function;
            expect(PIXI.sound.filters.ReverbFilter).to.be.a.function;
            expect(PIXI.sound.filters.StereoFilter).to.be.a.function;
            expect(PIXI.sound).to.be.instanceof(PIXI.sound.SoundLibrary);
            expect(library).to.equal(PIXI.sound);
        });

        it("should load file with Node's filesystem", webAudioOnly(function(done)
        {
            library.add("silence",
            {
                preload: true,
                src: manifest.silence,
                useXHR: false,
                loaded: (err, sound) => {
                    expect(sound.isLoaded).to.be.true;
                    expect(sound.isPlayable).to.be.true;
                    expect(sound.autoPlay).to.be.false;
                    expect(sound.loop).to.be.false;
                    expect(sound.preload).to.be.true;
                    expect(sound).to.be.instanceof(library.BaseSound);
                    library.removeAll();
                    done();
                },
            });
        }));

        it("should load a manifest", function(done)
        {
            this.slow(200);
            let counter = 0;
            const results = library.add(manifest, {
                preload: true,
                loaded: (err, sound) => {
                    expect(sound.isLoaded).to.be.true;
                    expect(sound.isPlayable).to.be.true;
                    expect(sound.autoPlay).to.be.false;
                    expect(sound.loop).to.be.false;
                    expect(sound.preload).to.be.true;
                    expect(sound).to.be.instanceof(library.BaseSound);
                    counter++;
                    if (counter === Object.keys(manifest).length)
                    {
                        done();
                    }
                },
            });
            expect(results).to.be.an.object;
            expect(results["alert-4"]).to.be.instanceof(library.BaseSound);
            expect(results["alert-7"]).to.be.instanceof(library.BaseSound);
            expect(results["alert-12"]).to.be.instanceof(library.BaseSound);
            expect(results["musical-11"]).to.be.instanceof(library.BaseSound);
            expect(results.silence).to.be.instanceof(library.BaseSound);
        });

        it("should get a reference by alias", function()
        {
            const sound = library.find("alert-7");
            expect(sound).to.not.be.undefined;
            expect(sound).to.be.instanceof(library.BaseSound);
        });

        it("should play multiple at once", function()
        {
            const sound = library.find("alert-12");
            sound.play();
            sound.play();
            sound.play();
            sound.play();
            expect(sound.instances.length).to.equal(4);
            sound.stop();
            expect(sound.instances.length).to.equal(0);
        });

        it("should play with blocking", function()
        {
            const sound = library.find("alert-4");
            sound.singleInstance = true;
            sound.play();
            sound.play();
            sound.play();
            sound.play();
            expect(sound.instances.length).to.equal(1);
            sound.stop();
            expect(sound.instances.length).to.equal(0);
            sound.singleInstance = false;
        });

        it("should play with stopping single instance", function()
        {
            const sound = library.find("alert-4");
            sound.play();
            sound.play();
            sound.play();
            const instance = sound.play();
            instance.stop();
            expect(sound.instances.length).to.equal(3);
            sound.stop();
            expect(sound.instances.length).to.equal(0);
        });

        it("should play a sound by alias", function(done)
        {
            library.play("silence", {
                complete: function()
                {
                    done();
                },
            });
        });

        it("should remove all sounds", function()
        {
            library.removeAll();
            expect(Object.keys(library._sounds).length).to.equal(0);
        });

        it("should load a sound file", function(done)
        {
            const alias = "silence";
            const sound = library.add(alias, {
                src: manifest[alias],
                volume: 0,
                preload: true,
                loaded: (err, instance) =>
                {
                    expect(err).to.be.null;
                    expect(instance).to.equal(sound);
                    expect(instance.isPlayable).to.be.true;
                    expect(library.exists(alias)).to.be.true;
                    library.remove(alias);
                    expect(library.exists(alias)).to.be.false;
                    done();
                },
            });
            expect(sound.isLoaded).to.be.false;
            expect(sound.isPlayable).to.be.false;
        });

        it("should play a file", function(done)
        {
            const alias = "silence";
            const sound = library.add(alias, {
                src: manifest[alias],
                preload: true,
                loaded: () =>
                {
                    expect(library.volume(alias)).to.equal(1);
                    library.volume(alias, 0);
                    expect(library.volume(alias)).to.equal(0);
                    expect(sound.volume).to.equal(0);

                    const instance = library.play(alias, () =>
                    {
                        expect(instance.progress).to.equal(1);
                        library.remove(alias);
                        done();
                    });

                    expect(instance.progress).to.equal(0);

                    // Pause
                    library.pause(alias);
                    expect(sound.isPlaying).to.be.false;

                    // Resume
                    library.resume(alias);
                    expect(sound.isPlaying).to.be.true;
                },
            });
        });

        it("sound play once a file", function(done)
        {
            const alias = library.utils.playOnce(manifest.silence, (err) =>
            {
                expect(alias).to.be.ok;
                expect(library.exists(alias)).to.be.false;
                expect(err).to.be.null;
                done();
            });
        });

        it("should play a sine tone", webAudioOnly(function(done)
        {
            this.slow(300);
            const sound = library.utils.sineTone(200, 0.1);
            sound.volume = 0;
            sound.play(() => {
                done();
            });
            expect(sound.isPlaying);
        }));

        it("should setup sprites", function() {
            const alias = "musical-11";
            const sound = library.add(alias, {
                src: manifest[alias],
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
            expect(Object.keys(sound.sprites).length).to.equal(2);
            expect(sound.sprites.foo.start).to.equal(0);
            expect(sound.sprites.foo.end).to.equal(2);
            expect(sound.sprites.foo.duration).to.equal(2);
            expect(sound.sprites.bar.start).to.equal(3);
            expect(sound.sprites.bar.end).to.equal(5);
            expect(sound.sprites.bar.duration).to.equal(2);
            expect(sound.sprites.foo.parent).to.equal(sound);
            expect(sound.sprites.bar.parent).to.equal(sound);
        });
    });

    describe("PIXI.sound.SoundInstance", function()
    {
        afterEach(function()
        {
            library.removeAll();
        });

        it("should return Promise for playing unloaded sound", function(done)
        {
            const Sound = library.Sound;
            const SoundInstance = useLegacy ?
                library.legacy.LegacySoundInstance :
                library.SoundInstance;
            const sound = Sound.from(manifest.silence);
            expect(sound).to.be.instanceof(library.BaseSound);
            const promise = sound.play();
            promise.then((instance) => {
                expect(instance).to.be.instanceof(SoundInstance);
                done();
            });
            expect(promise).to.be.instanceof(Promise);
        });

        it("should return instance for playing loaded sound", function(done)
        {
            const SoundInstance = useLegacy ?
                library.legacy.LegacySoundInstance :
                library.SoundInstance;
            const sound = library.Sound.from({
                src: manifest.silence,
                preload: true,
                loaded: (err) => {
                    expect(err).to.be.null;
                    expect(sound.isLoaded).to.be.true;
                    expect(sound.isPlayable).to.be.true;
                    const instance = sound.play();
                    expect(instance).to.be.instanceof(SoundInstance);
                    done();
                },
            });
        });
    });

    describe("PIXI.loader", function()
    {
        afterEach(function()
        {
            library.removeAll();
        });

        it("should load files with the PIXI.loader", function(done)
        {
            this.slow(200);
            for (const name in manifest)
            {
                PIXI.loader.add(name, manifest[name]);
            }
            PIXI.loader.load((loader, resources) =>
            {
                expect(Object.keys(resources).length).to.equal(5);
                for (const name in resources)
                {
                    expect(resources[name]).to.be.ok;
                    const ClassRef = useLegacy ? HTMLAudioElement : ArrayBuffer;
                    expect(resources[name].data).to.be.instanceof(ClassRef);
                    expect(resources[name].sound).to.be.ok;
                    const sound = resources[name].sound;
                    expect(sound).to.be.instanceof(library.BaseSound);
                    expect(sound.isLoaded).to.be.true;
                    expect(sound.isPlayable).to.be.true;
                }
                done();
            });
        });
    });
};
