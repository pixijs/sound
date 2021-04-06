const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const manifest = {
    applause: 'resources/applause.mp3',
    bird: 'resources/bird.mp3',
    boing: 'resources/boing.mp3',
    mechanical: 'resources/mechanical.mp3',
    whistle: 'resources/whistle.mp3',
};

for (const name in manifest)
{
    PIXI.Loader.shared.add(name, manifest[name]);
}

const distort = new PIXI.sound.filters.DistortionFilter();
const stereo = new PIXI.sound.filters.StereoFilter();
const equalizer = new PIXI.sound.filters.EqualizerFilter();

PIXI.Loader.shared.load(function (loader, resources)
{
    const singleInstance = $('#singleInstance');
    const loop = $('#loop');
    const speed = $('#speed');
    const volume = $('#volume');
    const stops = $$(`button[data-stop]`);

    for (let j = 0; j < stops.length; j++)
    {
        stops[j].addEventListener('click', function ()
        {
            const progressBar = $(`#progress-${this.dataset.stop}`);
            const sound = resources[this.dataset.stop].sound;

            sound.stop();
            progressBar.style.width = '';
        });
    }

    const plays = $$(`button[data-play]`);

    for (let k = 0; k < plays.length; k++)
    {
        plays[k].addEventListener('click', function ()
        {
            const progressBar = $(`#progress-${this.dataset.play}`);
            const sound = resources[this.dataset.play].sound;

            sound.filters = [stereo, equalizer, distort];
            sound.singleInstance = singleInstance.checked;
            sound.volume = parseFloat(volume.value);
            sound.loop = !!this.dataset.loop;
            sound.speed = parseFloat(speed.value);
            const instance = sound.play();

            instance.on('progress', function (value)
            {
                progressBar.style.width = `${value * 100}%`;
            });
            instance.on('end', function ()
            {
                progressBar.style.width = '';
            });
        });
    }
});

const bands = $$('.eq');

for (let i = 0; i < bands.length; i++)
{
    const eq = bands[i];

    eq.addEventListener('input', function ()
    {
        equalizer.setGain(PIXI.sound.filters.EqualizerFilter[this.id], parseFloat(this.value));
    });
}

$('#panning').addEventListener('input', function ()
{
    stereo.pan = parseFloat(this.value);
});

$('#distortion').addEventListener('input', function ()
{
    distort.amount = parseFloat(this.value);
});

$('#globalVolume').addEventListener('input', function ()
{
    PIXI.sound.volumeAll = Math.max(0,
        Math.min(1, parseFloat(this.value)),
    );
});

$('#stop').addEventListener('click', function ()
{
    PIXI.sound.stopAll();
    const bars = $$('.progress-bar');

    for (let n = 0; n < bars.length; n++)
    {
        bars[n].style.width = '';
    }
});

$('#paused').addEventListener('click', function ()
{
    const paused = PIXI.sound.context.paused = !PIXI.sound.context.paused;

    this.className = this.className.replace(/\b(on|off)/g, '');
    this.className += paused ? 'on' : 'off';
});

$('#muted').addEventListener('click', function ()
{
    const muted = PIXI.sound.context.muted = !PIXI.sound.context.muted;

    this.className = this.className.replace(/ (on|off)/g, ' ');
    this.className += muted ? 'on' : 'off';
});

hljs.initHighlightingOnLoad();
