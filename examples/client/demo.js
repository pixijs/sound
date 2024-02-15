const manifest = [
    { alias: 'loop1', src: 'resources/loops/loop1.mp3' },
    { alias: 'loop2', src: 'resources/loops/loop2.mp3' },
    { alias: 'loop3', src: 'resources/loops/loop3.mp3' },
    { alias: 'loop4', src: 'resources/loops/loop4.mp3' },
    { alias: 'bird', src: 'resources/bird.mp3' },
    { alias: 'boing', src: 'resources/boing.mp3' },
    { alias: 'buzzer', src: 'resources/buzzer.mp3' },
    { alias: 'car', src: 'resources/car.mp3' },
    { alias: 'chime', src: 'resources/chime.mp3' },
    { alias: 'success', src: 'resources/success.mp3' },
    { alias: 'sword', src: 'resources/sword.mp3' },
    { alias: 'whistle', src: 'resources/whistle.mp3' },
];

PIXI.Assets.addBundle('demo', manifest);
PIXI.Assets.loadBundle('demo').then(() =>
{
    const plays = document.querySelectorAll('button[data-sound]');

    for (let i = 0; i < plays.length; i++)
    {
        const button = plays[i];
        const alias = button.getAttribute('data-sound');

        if ('ontouchstart' in window)
        {
            button.addEventListener('touchstart', play, false);
        }
        else
        {
            button.addEventListener('mousedown', play, false);
        }
    }
});

function play()
{
    const button = this;
    const sound = PIXI.Assets.get(button.getAttribute('data-sound'));
    const loop = !!button.getAttribute('data-loop');
    const playing = !parseInt(button.getAttribute('data-playing'), 10);

    if (loop)
    {
        togglePlaying(button);
        sound.stop();
        progressBar(button, 0);
    }
    if (playing)
    {
        const instance = sound.play({
            loop,
            singleInstance: loop,
        });

        instance.on('progress', function (progress, duration)
        {
            progressBar(button, progress);
        });
        instance.on('end', function ()
        {
            progressBar(button, 0);
        });
    }
}

function togglePlaying(button)
{
    const playing = !parseInt(button.getAttribute('data-playing'), 10);

    button.className = button.className.replace(/ (play|stop) btn\-(info|default)/, '');
    button.className += playing ? ' stop btn-info' : ' play btn-default';
    button.setAttribute('data-playing', playing ? 1 : 0);
}

function progressBar(button, progress)
{
    const bar = button.querySelector('.progress-bar');

    bar.style.width = `${progress * 100}%`;
}

document.querySelector('#volume').addEventListener('input', function ()
{
    PIXI.sound.volumeAll = Math.max(0,
        Math.min(1, parseFloat(this.value)),
    );
});

document.querySelector('#speed').addEventListener('input', function ()
{
    PIXI.sound.speedAll = Math.max(0,
        Math.min(1, parseFloat(this.value)),
    );
});

document.querySelector('#stop').addEventListener('click', function ()
{
    PIXI.sound.stopAll();
    const plays = document.querySelectorAll('button[data-sound]');

    for (let i = 0; i < plays.length; i++)
    {
        const button = plays[i];

        if (button.getAttribute('data-playing') === '1')
        {
            togglePlaying(button);
        }
        progressBar(button, 0);
    }
});

document.querySelector('#paused').addEventListener('click', function ()
{
    const paused = PIXI.sound.togglePauseAll();

    this.className = this.className.replace(/\b(on|off)/g, '');
    this.className += paused ? 'on' : 'off';
});

document.querySelector('#muted').addEventListener('click', function ()
{
    const muted = PIXI.sound.toggleMuteAll();

    this.className = this.className.replace(/ (on|off)/g, ' ');
    this.className += muted ? 'on' : 'off';
});

hljs.initHighlightingOnLoad();
