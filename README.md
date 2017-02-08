# PIXI.sound

WebAudio API playback without any Flash shims or HTML Audio fallback. Modern audio playback for modern browsers. 

[![Build Status](https://travis-ci.org/pixijs/pixi-sound.svg?branch=master)](https://travis-ci.org/pixijs/pixi-sound)

**Features**

* Pausing and resuming
* Independent volume control
* Loading with XMLHttpRequest or Node's `fs` module
* Support blocking or layered sounds (multiple instances)
* Support for `PIXI.loader` system
* Dynamic filters:
    * ReverbFilter
    * DistortionFilter
    * EqualizerFilter
    * StereoFilter

## Usage

Installation is available by [NPM](https://npmjs.org):

```bash
npm i pixi-sound --save
```

### TypeScript

Module definitions are available using TypeScript:

```typescript
import * as pixiSound from 'pixi-sound';

pixiSound.add('foo', 'foo.mp3');
pixiSound.play('foo');
```

### Browserify or Webpack

Require the library, recommended for using Webpack or Browserify.

```js
const pixiSound = require('pixi-sound');

pixiSound.add('foo', 'foo.mp3');
pixiSound.play('foo');
```

### HTML

You can include the bundle file directly and use the global `PIXI.sound` namespace.

```html
<script src="node_modules/pixi-sound/dist/pixi-sound.js"></script>
<script>
    PIXI.sound.add('foo', 'foo.mp3');
    PIXI.sound.play('foo');
</script>
```

### PIXI.loader

Integration is available using PIXI's `loader` if the **pixi.js** module is included _before_ the **pixi-sound** module:

```js
PIXI.loader.add('foo', 'foo.mp3')
    .load((loader, resources) => {
        resources.foo.sound.play();
        // Alteratively: PIXI.sound.play('foo');
    });
```
