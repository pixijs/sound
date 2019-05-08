var $ = document.querySelector.bind(document);
var $$ = document.querySelectorAll.bind(document);

var manifest = {
    applause: "resources/applause.mp3",
    bird: "resources/bird.mp3",
    boing: "resources/boing.mp3",
    mechanical: "resources/mechanical.mp3",
    whistle: "resources/whistle.mp3",
};

for (var name in manifest) {
    PIXI.Loader.shared.add(name, manifest[name]);
}

var distort = new PIXI.sound.filters.DistortionFilter();
var stereo = new PIXI.sound.filters.StereoFilter();
var equalizer = new PIXI.sound.filters.EqualizerFilter();

PIXI.Loader.shared.load(function(loader, resources) {
    var singleInstance = $("#singleInstance");
    var loop = $("#loop");
    var speed = $("#speed");
    var volume = $("#volume");
    var stops = $$(`button[data-stop]`);
    for (var j = 0; j < stops.length; j++) {
        stops[j].addEventListener("click", function() {
            var progressBar = $(`#progress-${this.dataset.stop}`);
            var sound = resources[this.dataset.stop].sound;
            sound.stop();
            progressBar.style.width = "";
        });
    }

    var plays = $$(`button[data-play]`);
    for (var k = 0; k < plays.length; k++) {
        plays[k].addEventListener("click", function() {
            var progressBar = $(`#progress-${this.dataset.play}`);
            var sound = resources[this.dataset.play].sound;
            sound.filters = [stereo, equalizer, distort];
            sound.singleInstance = singleInstance.checked;
            sound.volume = parseFloat(volume.value);
            sound.loop = !!this.dataset.loop;
            sound.speed = parseFloat(speed.value);
            var instance = sound.play();
            instance.on("progress", function(value) {
                progressBar.style.width = `${value * 100}%`;
            });
            instance.on("end", function() {
                progressBar.style.width = "";
            });
        });
    }
});

var bands = $$(".eq");
for (var i = 0; i < bands.length; i++) {
    var eq = bands[i];
    eq.addEventListener("input", function() {
        equalizer.setGain(PIXI.sound.filters.EqualizerFilter[this.id], parseFloat(this.value));
    });
}

$("#panning").addEventListener("input", function() {
    stereo.pan = parseFloat(this.value);
});

$("#distortion").addEventListener("input", function() {
    distort.amount = parseFloat(this.value);
});

$("#globalVolume").addEventListener("input", function() {
    PIXI.sound.volumeAll = Math.max(0,
        Math.min(1, parseFloat(this.value)),
    );
});

$("#stop").addEventListener("click", function() {
    PIXI.sound.stopAll();
    var bars = $$(".progress-bar");
    for (var n = 0; n < bars.length; n++) {
        bars[n].style.width = "";
    }
});

$("#paused").addEventListener("click", function() {
    var paused = PIXI.sound.context.paused = !PIXI.sound.context.paused;
    this.className = this.className.replace(/\b(on|off)/g, "");
    this.className += paused ? "on" : "off";
});

$("#muted").addEventListener("click", function() {
    var muted = PIXI.sound.context.muted = !PIXI.sound.context.muted;
    this.className = this.className.replace(/ (on|off)/g, " ");
    this.className += muted ? "on" : "off";
});

hljs.initHighlightingOnLoad();
