const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const sprites = {
    'alien death': {
        start: 1,
        end: 2,
        loop: true,
    },
    'boss hit': {
        start: 3,
        end: 3.5,
    },
    escape: {
        start: 4,
        end: 7.2,
    },
    meow: {
        start: 8,
        end: 8.5,
    },
    numkey: {
        start: 9,
        end: 9.1,
    },
    ping: {
        start: 10,
        end:  11,
    },
    death: {
        start: 12,
        end:  16.2,
    },
    shot: {
        start: 17,
        end:  18,
    },
    squit: {
        start: 19,
        end:  19.3,
    },
};
const playhead = new PIXI.Graphics()
    .beginFill(0xff0000)
    .drawRect(0, 0, 1, 100);

playhead.x = -1;
const sound = PIXI.sound.Sound.from({
    url: 'resources/sprite.mp3',
    sprites,
    singleInstance: true,
    preload: true,
    loaded()
    {
        const app = new PIXI.Application({
            width: 1024,
            height: 100,
            backgroundColor: 0xffffff,
            view: document.getElementById('waveform'),
        });
        const baseTexture = PIXI.sound.utils.render(sound, {
            width: 1024,
            height: 100,
            fill: '#ccc',
        });

        app.stage.addChild(new PIXI.Sprite(new PIXI.Texture(baseTexture)), playhead);
    },
});

const buttons = $$('button[data-sprite]');

for (let i = 0; i < buttons.length; i++)
{
    const button = buttons[i];

    button.addEventListener('click', function ()
    {
        sound.play(this.getAttribute('data-sprite')).on('progress', function (value)
        {
            playhead.x = 1024 * value;
        });
    });
}

hljs.initHighlightingOnLoad();
