# PixiJS Sound

WebAudio API playback library, with filters. Modern audio playback for modern browsers. 

[![Node.js CI](https://github.com/pixijs/sound/workflows/Node.js%20CI/badge.svg)](https://github.com/pixijs/sound/actions?query=workflow%3A%22Node.js+CI%22) [![npm version](https://badge.fury.io/js/%40pixi%2Fsound.svg)](https://badge.fury.io/js/%40pixi%2Fsound)

**Features**

* Pausing and resuming
* Independent volume control
* Support blocking or layered sounds (multiple instances)
* Support for `PIXI.Loader` system
* Dynamic filters:
    * ReverbFilter
    * DistortionFilter
    * EqualizerFilter
    * StereoFilter
    * TelephoneFilter

**Known Compatibility**

* Chrome 58+
* Firefox 49+
* Safari 10+
* iOS 9+
* IE 9+

## Usage

Installation is available by [NPM](https://npmjs.org):

```bash
npm i @pixi/sound --save
```

```typescript
import { sound } from '@pixi/sound';

sound.add('my-sound', 'path/to/file.mp3');
sound.play('my-sound');
```

### Resources

* [Releases](https://github.com/pixijs/sound/releases)
* [Basics](https://pixijs.io/sound/examples/index.html)
* [Sprites](https://pixijs.io/sound/examples/sprites.html)
* [Filters](https://pixijs.io/sound/examples/filters.html)
* [Demo](https://pixijs.io/sound/examples/demo.html)
* [API Documentation](https://pixijs.io/sound/docs/index.html)

## License

MIT License.
