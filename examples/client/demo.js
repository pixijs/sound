const manifest = {
    loop1: 'resources/loops/loop1.mp3',
    loop2: 'resources/loops/loop2.mp3',
    loop3: 'resources/loops/loop3.mp3',
    loop4: 'resources/loops/loop4.mp3',
    bird: 'resources/bird.mp3',
    boing: 'resources/boing.mp3',
    buzzer: 'resources/buzzer.mp3',
    car: 'resources/car.mp3',
    chime: 'resources/chime.mp3',
    success: 'resources/success.mp3',
    sword: 'resources/sword.mp3',
    whistle: 'resources/whistle.mp3'
};

for (let name in manifest) {
    PIXI.loader.add(name, manifest[name]);
}

PIXI.loader.load(function(loader, resources) {
    const plays = document.querySelectorAll('button[data-sound]');
    for (let i = 0; i < plays.length; i++) {
        const button = plays[i];
        const alias = button.dataset.sound;
        const sound = resources[alias].sound;
        button.addEventListener('mousedown', function() {
            const button = this;
            const sound = resources[button.dataset.sound].sound;
            const loop = !!button.dataset.loop;
            const playing = !parseInt(button.dataset.playing);
            if (loop) {
                togglePlaying(button);
                sound.stop();
                progressBar(button, 0);
            }
            if (playing) {
                const instance = sound.play({
                    loop: loop,
                    singleInstance: loop
                });
                instance.on('progress', function(progress, duration) {
                    progressBar(button, progress);
                });
                instance.on('end', function() {
                    progressBar(button, 0);
                });
            }
        });
    }
});

function togglePlaying(button) {
    const playing = !parseInt(button.dataset.playing);
    button.className = button.className.replace(/ (play|stop) btn\-(info|default)/, '');
    button.className += playing ? ' stop btn-info' : ' play btn-default';
    button.dataset.playing = playing ? 1 : 0;
}

function progressBar(button, progress) {
    const bar = button.querySelector('.progress-bar');
    bar.style.width = (progress * 100) + '%';
}

document.querySelector('#volume').addEventListener('input', function() {
    PIXI.sound.volumeAll = Math.max(0, 
        Math.min(1, parseFloat(this.value))
    );
});

document.querySelector("#stop").addEventListener('click', function() {
    PIXI.sound.stopAll();
    const plays = document.querySelectorAll('button[data-sound]');
    for (let i = 0; i < plays.length; i++) {
        const button = plays[i];
        if (button.dataset.playing === "1") {
            togglePlaying(button);
        }
        progressBar(button, 0);
    }
});

document.querySelector("#paused").addEventListener('click', function() {
    const paused = PIXI.sound.togglePauseAll();
    this.className = this.className.replace(/\b(on|off)/g, '');
    this.className += paused ? 'on' : 'off'; 
});

document.querySelector("#muted").addEventListener('click', function() {
    const muted = PIXI.sound.toggleMuteAll();
    this.className = this.className.replace(/ (on|off)/g, ' ');
    this.className += muted ? 'on' : 'off'; 
});

hljs.initHighlightingOnLoad();
