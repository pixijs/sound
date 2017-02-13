const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const manifest = {
    applause: 'resources/applause.mp3',
    bird: 'resources/bird.mp3',
    boing: 'resources/boing.mp3',
    mechanical: 'resources/mechanical.mp3',
    whistle: 'resources/whistle.mp3'
};

for (const name in manifest) {
    PIXI.loader.add(name, manifest[name]);
}

const distort = new PIXI.sound.filters.DistortionFilter();
const stereo = new PIXI.sound.filters.StereoFilter();
const equalizer = new PIXI.sound.filters.EqualizerFilter();

PIXI.loader.load(function(loader, resources) {
    const singleInstance = $("#singleInstance");
    const loop = $("#loop");
    const speed = $("#speed");
    const volume = $('#volume');
    $$(`button[data-stop]`).forEach(function(button) {
        const progressBar = $(`#progress-${button.dataset.stop}`);
        button.addEventListener('click', function() {
            const sound = resources[this.dataset.stop].sound;
            sound.stop();
            progressBar.style.width = '';
        });
    });
    $$(`button[data-play]`).forEach(function(button) {
        const progressBar = $(`#progress-${button.dataset.play}`);
        button.addEventListener('click', function() {
            const sound = resources[this.dataset.play].sound;
            sound.filters = [stereo, equalizer, distort];
            sound.singleInstance = singleInstance.checked;
            sound.volume = parseFloat(volume.value);
            sound.loop = !!this.dataset.loop;
            sound.speed = parseFloat(speed.value);
            const instance = sound.play();
            instance.on('progress', (value) => {
                progressBar.style.width = `${value * 100}%`;
            });
            instance.on('end', () => {
                progressBar.style.width = '';
            });
        });
    });
});

$$('.eq').forEach(function(eq) {
    eq.addEventListener('input', function() {
        equalizer.setGain(PIXI.sound.filters.EqualizerFilter[this.id], parseFloat(this.value));
    });
});

$('#panning').addEventListener('input', function() {
    stereo.pan = parseFloat(this.value);
});

$('#distortion').addEventListener('input', function() {
    distort.amount = parseFloat(this.value);
});

$('#globalVolume').addEventListener('input', function() {
    PIXI.sound.volumeAll = Math.max(0, 
        Math.min(1, parseFloat(this.value))
    );
});

$("#stop").addEventListener('click', function() {
    PIXI.sound.stopAll();
    $$('.progress-bar').forEach(function(progress) {
        progress.style.width = '';
    });
});

$("#paused").addEventListener('click', function() {
    const paused = PIXI.sound.context.paused = !PIXI.sound.context.paused;
    this.className = this.className.replace(/\b(on|off)/g, '');
    this.className += paused ? 'on' : 'off'; 
});

$("#muted").addEventListener('click', function() {
    const muted = PIXI.sound.context.muted = !PIXI.sound.context.muted;
    this.className = this.className.replace(/ (on|off)/g, ' ');
    this.className += muted ? 'on' : 'off'; 
});

hljs.initHighlightingOnLoad();
