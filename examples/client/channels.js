/* eslint-disable no-loop-func */
const manifest = {
    loop1: { src: 'resources/loops/loop1.mp3', data: { channel: 'music' } },
    loop2: { src: 'resources/loops/loop2.mp3', data: { channel: 'music' } },
    loop3: { src: 'resources/loops/loop3.mp3', data: { channel: 'music' } },
    loop4: { src: 'resources/loops/loop4.mp3', data: { channel: 'music' } },
    bird: { src: 'resources/bird.mp3', data: { channel: 'sfx' } },
    boing: { src: 'resources/boing.mp3', data: { channel: 'sfx' } },
    buzzer: { src: 'resources/buzzer.mp3', data: { channel: 'sfx' } },
    car: { src: 'resources/car.mp3', data: { channel: 'sfx' } },
};

PIXI.Assets.addBundle('demo', manifest);
PIXI.Assets.loadBundle('demo').then(() =>
{
    const plays = document.querySelectorAll('button[data-sound]');

    for (let i = 0; i < plays.length; i++)
    {
        const button = plays[i];

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

const selectors = [
    'music',
    'sfx'
];

for (let i = 0; i < selectors.length; i++)
{
    const channel = PIXI.sound.addChannel(selectors[i]);

    document.querySelector(`#volume-${selectors[i]}`).addEventListener('input', function ()
    {
        channel.volumeAll = Math.max(0,
            Math.min(1, parseFloat(this.value)),
        );
    });

    document.querySelector(`#speed-${selectors[i]}`).addEventListener('input', function ()
    {
        channel.speedAll = Math.max(0,
            Math.min(1, parseFloat(this.value)),
        );
    });

    document.querySelector(`#stop-${selectors[i]}`).addEventListener('click', function ()
    {
        channel.stopAll();
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

    document.querySelector(`#paused-${selectors[i]}`).addEventListener('click', function ()
    {
        const paused = channel.togglePauseAll();

        this.className = this.className.replace(/\b(on|off)/g, '');
        this.className += paused ? 'on' : 'off';
    });

    document.querySelector(`#muted-${selectors[i]}`).addEventListener('click', function ()
    {
        const muted = channel.toggleMuteAll();

        this.className = this.className.replace(/ (on|off)/g, ' ');
        this.className += muted ? 'on' : 'off';
    });
}

hljs.initHighlightingOnLoad();
