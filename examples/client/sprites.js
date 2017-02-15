
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const sprites = {
    'alien death': {
        start: 1, 
        end: 2
    },
    'boss hit': {
        start: 3, 
        end: 3.5
    },
    escape: {
        start: 4, 
        end: 7.2
    },
    meow: {
        start: 8, 
        end: 8.5
    },
    numkey: {
        start: 9, 
        end: 9.1
    },
    ping: {
        start: 10,
        end:  11
    },
    death: {
        start: 12,
        end:  16.2
    },
    shot: {
        start: 17,
        end:  18
    },
    squit: {
        start: 19,
        end:  19.3
    }
};

const sound = PIXI.sound.Sound.from({
    src: 'resources/sprite.mp3',
    sprites: sprites,
    preload: true
});

const buttons = $$('button[data-sprite]');
for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    button.addEventListener('click', function() {
        sound.play(this.dataset.sprite);
    });
}

hljs.initHighlightingOnLoad();
