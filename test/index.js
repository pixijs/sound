/* tslint:disable:no-unused-expression */
const PIXI = require("pixi.js");
const { expect } = require("chai");

// Import the library
module.exports = function(libraryPath, useLegacy)
{
    const sound = require(libraryPath);
    const {
        Sound,
        utils,
        webaudio,
        htmlaudio,
        SoundLibrary,
        filters,
    } = sound;

    const path = require("path");
    const suffix = useLegacy ? " (legacy)" : "";

    // Global reference to the resources
    global.__resources = path.join(__dirname, "resources");

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

    describe("PIXI.sound" + suffix, function()
    {
        before(function()
        {
            // Set the legacy
            sound.useLegacy = !!useLegacy;
        });

        after(function()
        {
            PIXI.Loader.shared.reset();
            sound.removeAll();
        });

        afterEach(function()
        {
            Sound._pool.length = 0;
        });

        it("should have the correct classes", function()
        {
            expect(sound).to.be.an("object");
            expect(sound.Sound).to.be.a("function");
            expect(sound.utils).to.be.an("object");
            expect(sound.webaudio).to.be.an("object");
            expect(sound.htmlaudio).to.be.an("object");
            expect(sound.SoundLibrary).to.be.a("function");
            expect(sound.filters).to.be.an("object");
            expect(sound.filters.DistortionFilter).to.be.a("function");
            expect(sound.filters.EqualizerFilter).to.be.a("function");
            expect(sound.filters.ReverbFilter).to.be.a("function");
            expect(sound.filters.StereoFilter).to.be.a("function");
            expect(sound).to.be.instanceof(sound.SoundLibrary);
        });

        it("should recreate the library", function()
        {
            sound.close().init();
            sound.useLegacy = !!useLegacy;
        });

        it("should load a manifest", function(done)
        {
            this.slow(200);
            let counter = 0;
            const results = sound.add(manifest, {
                preload: true,
                loaded: (err, s) => {
                    expect(s.isLoaded).to.be.true;
                    expect(s.isPlayable).to.be.true;
                    expect(s.autoPlay).to.be.false;
                    expect(s.loop).to.be.false;
                    expect(s.preload).to.be.true;
                    expect(s).to.be.instanceof(Sound);
                    counter++;
                    if (counter === Object.keys(manifest).length)
                    {
                        done();
                    }
                },
            });
            expect(results).to.be.a("object");
            expect(results["alert-4"]).to.be.instanceof(Sound);
            expect(results["alert-7"]).to.be.instanceof(Sound);
            expect(results["alert-12"]).to.be.instanceof(Sound);
            expect(results["musical-11"]).to.be.instanceof(Sound);
            expect(results.silence).to.be.instanceof(Sound);
        });

        it("should get a reference by alias", function()
        {
            const s = sound.find("alert-7");
            expect(s).to.not.be.undefined;
            expect(s).to.be.instanceof(Sound);
        });

        it("should play multiple at once", function()
        {
            const s = sound.find("alert-12");
            s.play();
            s.play();
            s.play();
            s.play();
            expect(s.instances.length).to.equal(4);
            s.stop();
            expect(s.instances.length).to.equal(0);
        });

        it("should play with blocking", function()
        {
            const s = sound.find("alert-4");
            s.singleInstance = true;
            s.play();
            s.play();
            s.play();
            s.play();
            expect(s.instances.length).to.equal(1);
            s.stop();
            expect(s.instances.length).to.equal(0);
            s.singleInstance = false;
        });

        it("should play with stopping single instance", function()
        {
            const s = sound.find("alert-4");
            s.play();
            s.play();
            s.play();
            const instance = s.play();
            instance.stop();
            expect(s.instances.length).to.equal(3);
            s.stop();
            expect(s.instances.length).to.equal(0);
        });

        it("should support volume change when instance is paused", function(done)
        {
            this.slow(200);
            const s = sound.find("alert-4");
            const i = s.play({ volume: 0 });
            setTimeout(() => {
                i.paused = true;
                i.volume = 0.2;
                done();
            }, 100);
        });

        it("should play a sound by alias", function(done)
        {
            sound.play("silence", {
                complete: function()
                {
                    done();
                },
            });
        });

        it("should remove all sounds", function()
        {
            sound.removeAll();
            expect(Object.keys(sound._sounds).length).to.equal(0);
        });

        it("should load a sound file", function(done)
        {
            const alias = "silence";
            const s = sound.add(alias, {
                url: manifest[alias],
                volume: 0,
                preload: true,
                loaded: (err, instance) =>
                {
                    expect(err).to.be.null;
                    expect(instance).to.equal(s);
                    expect(instance.isPlayable).to.be.true;
                    expect(sound.exists(alias)).to.be.true;
                    sound.remove(alias);
                    expect(sound.exists(alias)).to.be.false;
                    done();
                },
            });
            expect(s.isLoaded).to.be.false;
            expect(s.isPlayable).to.be.false;
        });

        it("should play a file", function(done)
        {
            const alias = "silence";
            const s = sound.add(alias, {
                url: manifest[alias],
                preload: true,
                loaded: () =>
                {
                    expect(sound.volume(alias)).to.equal(1);
                    sound.volume(alias, 0);
                    expect(sound.volume(alias)).to.equal(0);
                    expect(s.volume).to.equal(0);

                    const instance = sound.play(alias, () =>
                    {
                        expect(instance.progress).to.equal(1);
                        sound.remove(alias);
                        done();
                    });

                    expect(instance.progress).to.equal(0);

                    // Pause
                    sound.pause(alias);
                    expect(s.isPlaying).to.be.false;

                    // Resume
                    sound.resume(alias);
                    expect(s.isPlaying).to.be.true;
                },
            });
        });

        it("sound play once a file", function(done)
        {
            const alias = utils.playOnce(manifest.silence, (err) =>
            {
                expect(alias).to.be.ok;
                expect(sound.exists(alias)).to.be.false;
                expect(err).to.be.null;
                done();
            });
        });

        it("should resolve a file url", function()
        {
            const url = "file.{mp3,ogg}";
            expect(utils.resolveUrl(url)).to.equal("file.mp3");
        });

        it("should resolve a file url with object", function()
        {
            const object = {
                url: "file.{mp3,ogg}",
            };
            expect(utils.resolveUrl(object)).to.equal("file.mp3");
            expect(object.url).to.equal("file.mp3");
            expect(object.extension).to.equal("mp3");
        });

        it("should play a sine tone", webAudioOnly(function(done)
        {
            this.slow(300);
            const s = utils.sineTone(200, 0.1);
            s.volume = 0;
            s.play(() => {
                done();
            });
            expect(s.isPlaying);
        }));

        it("should setup sprites", function() {
            const alias = "musical-11";
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
            expect(Object.keys(s.sprites).length).to.equal(2);
            expect(s.sprites.foo.start).to.equal(0);
            expect(s.sprites.foo.end).to.equal(2);
            expect(s.sprites.foo.duration).to.equal(2);
            expect(s.sprites.bar.start).to.equal(3);
            expect(s.sprites.bar.end).to.equal(5);
            expect(s.sprites.bar.duration).to.equal(2);
            expect(s.sprites.foo.parent).to.equal(s);
            expect(s.sprites.bar.parent).to.equal(s);
        });
    });

    describe("PIXI.sound.SoundInstance" + suffix, function()
    {
        afterEach(function()
        {
            sound.removeAll();
        });

        it("should return Promise for playing unloaded sound", function(done)
        {
            const SoundInstance = useLegacy ?
                htmlaudio.HTMLAudioInstance :
                webaudio.WebAudioInstance;
            const s = Sound.from(manifest.silence);
            expect(s).to.be.instanceof(Sound);
            const promise = s.play();
            promise.then((instance) => {
                expect(instance).to.be.instanceof(SoundInstance);
                done();
            });
            expect(promise).to.be.instanceof(Promise);
        });

        it("should return instance for playing loaded sound", function(done)
        {
            const SoundInstance = useLegacy ?
                htmlaudio.HTMLAudioInstance :
                webaudio.WebAudioInstance;
            const s = Sound.from({
                url: manifest.silence,
                preload: true,
                loaded: (err) => {
                    expect(err).to.be.null;
                    expect(s.isLoaded).to.be.true;
                    expect(s.isPlayable).to.be.true;
                    const instance = s.play();
                    expect(instance).to.be.instanceof(SoundInstance);
                    done();
                },
            });
        });
    });

    describe("PIXI.loader" + suffix, function()
    {
        afterEach(function()
        {
            sound.removeAll();
        });

        it("should load files with the PIXI.loader", function(done)
        {
            this.slow(200);
            for (const name in manifest)
            {
                PIXI.Loader.shared.add(name, manifest[name]);
            }
            PIXI.Loader.shared.load((loader, resources) =>
            {
                expect(Object.keys(resources).length).to.equal(5);
                for (const name in resources)
                {
                    expect(resources[name]).to.be.ok;
                    const ClassRef = useLegacy ? HTMLAudioElement : ArrayBuffer;
                    expect(resources[name].data).to.be.instanceof(ClassRef);
                    expect(resources[name].sound).to.be.ok;
                    const s = resources[name].sound;
                    expect(s).to.be.instanceof(Sound);
                    expect(s.isLoaded).to.be.true;
                    expect(s.isPlayable).to.be.true;
                }
                done();
            });
        });
    });
};
