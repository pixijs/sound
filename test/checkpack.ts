import "pixi.js";
import "../dist/pixi-sound.js";
import "../pixi-sound.d";

//@../node_modules/pixi.js/dist/pixi.min.js
//@../dist/pixi-sound.js

const app = new PIXI.Application();

PIXI.sound.Sound.from({
    url: "https://pixijs.github.io/pixi-sound/examples/resources/boing.mp3",
    autoPlay: true,
});

app.start();
