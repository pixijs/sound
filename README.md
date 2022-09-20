# PixiJS Sound

WebAudio API playback library, with filters. Modern audio playback for modern browsers. 

[![Node.js CI](https://github.com/pixijs/sound/workflows/Node.js%20CI/badge.svg)](https://github.com/pixijs/sound/actions?query=workflow%3A%22Node.js+CI%22) [![npm version](https://badge.fury.io/js/%40pixi%2Fsound.svg)](https://badge.fury.io/js/%40pixi%2Fsound)

**Features**

* Pausing and resuming
* Independent volume control
* Support blocking or layered sounds (multiple instances)
* Support for `PIXI.Assets` system
* Dynamic filters:
    * ReverbFilter
    * DistortionFilter
    * EqualizerFilter
    * StereoFilter
    * TelephoneFilter

**Known Compatibility**

* Chrome 58+
* Firefox 52+
* Safari 11+
* iOS 11+

## Usage

Installation is available by [NPM](https://npmjs.org):

```bash
npm i @pixi/sound --save
```

To import into your project, for instance, when using [Webpack](https://webpack.js.org/), [Parcel](https://parceljs.org/), [Rollup](https://rollupjs.org/), or another bundler:

```typescript
import { sound } from '@pixi/sound';

sound.add('my-sound', 'path/to/file.mp3');
sound.play('my-sound');
```

### Browser Usage

If you're using a `<script>` element to import `@pixi/sound` into your project, then the SoundLibrary object is `PIXI.sound` global.

```html
<!-- PixiJS must be imported before @pixi/sound -->
<script src="https://unpkg.com/pixi.js/dist/browser/pixi.min.js"></script>

<!-- found here, if not using CDN "./node_modules/@pixi/sound/dist/pixi-sound.js" -->
<script src="https://unpkg.com/@pixi/sound/dist/pixi-sound.js"></script>

<script>
    PIXI.sound.add('my-sound', 'path/to/file.mp3');
    PIXI.sound.play('my-sound');
</script>
```

### Versions Compatibility

| PixiJS | PixiJS Sound |
|---|---|
| v5.x - v6.x | v4.x |
| v7.x | v5.x |

### Resources

* [Releases](https://github.com/pixijs/sound/releases)
* [Basics](https://pixijs.io/sound/examples/index.html)
* [Sprites](https://pixijs.io/sound/examples/sprites.html)
* [Filters](https://pixijs.io/sound/examples/filters.html)
* [Demo](https://pixijs.io/sound/examples/demo.html)
* [API Documentation](https://pixijs.io/sound/docs/index.html)

## License

MIT License.
