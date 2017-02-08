require('pixi.js');
require('../'); // Load pixi-sound

const path = require('path');
const resources = path.join(__dirname, 'resources');
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const manifest = {
    applause: path.join(resources, 'applause.mp3'),
    bird: path.join(resources, 'bird.mp3'),
    boing: path.join(resources, 'boing.mp3'),
    mechanical: path.join(resources, 'mechanical.mp3'),
    whistle: path.join(resources, 'whistle.mp3')
};

for (const name in manifest) {
    PIXI.loader.add(name, manifest[name]);
}

const distortion = new PIXI.sound.filters.DistortionFilter();
const stereo = new PIXI.sound.filters.StereoFilter();
const equalizer = new PIXI.sound.filters.EqualizerFilter();
// const reverb = new PIXI.sound.filters.ReverbFilter();

PIXI.loader.load(function(loader, resources) {
    const block = $("#block");
    const loop = $("#loop");
    const speed = $("#speed");
    const volume = $('#volume');
    $$(`.play`).forEach(function(button) {
        const progressBar = $(`#progress-${button.dataset.id}`);
        button.addEventListener('click', function() {
            const sound = resources[this.dataset.id].sound;
            sound.filters = [stereo, equalizer, distortion];
            sound.block = block.checked;
            sound.volume = parseFloat(volume.value);
            sound.loop = !!this.dataset.loop;
            sound.speed = parseFloat(speed.value);
            const instance = sound.play();
            instance.on('progress', (value) => {
                progressBar.style = `width:${value * 100}%`;
            });
            instance.on('end', () => {
                progressBar.style = '';
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
    distortion.amount = parseFloat(this.value);
});

// Update the global volume
$('#globalVolume').addEventListener('input', function() {
    PIXI.sound.context.volume = Math.max(0, 
        Math.min(1, parseFloat(this.value))
    );
});

$("#stop").addEventListener('click', function() {
    PIXI.sound.stopAll();
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
