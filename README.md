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

* Any browser that PixiJS v8 runs in. WebAudio is used where available, with HTML audio as the fallback.

**iOS silent mode**

On iOS, the ringer/silent switch mutes WebAudio, but not HTML audio. This applies to every iOS browser. On iOS 17+, you can let sounds play in silent mode by setting the page's audio session before playing:

```js
if ('audioSession' in navigator)
{
    navigator.audioSession.type = 'playback';
}
```

A `'playback'` session can pause audio from other apps, such as music, so only use it if that's acceptable for your app. On older iOS, setting `sound.useLegacy = true` before loading any sounds plays through HTML audio instead, without filters.

## Usage

Installation is available by [NPM](https://npmjs.org):

```bash
npm i @pixi/sound --save
```

To import into your project, for instance, when using [Webpack](https://webpack.js.org/), [Parcel](https://parceljs.org/), [Rollup](https://rollupjs.org/), or another bundler:

```typescript
import { sound, Sound } from '@pixi/sound';

sound.add('my-sound', 'path/to/file.mp3');
sound.play('my-sound');

// Or create a sound without adding it to the library
const mySound = Sound.from('path/to/file.mp3');
mySound.play();
```

Classes and namespaces (`Sound`, `filters`, `utils`, etc.) are named exports. They are not properties of the `sound` object, so import them directly.

### Assets

Importing `@pixi/sound` registers a loader with `PIXI.Assets`. Loaded sounds are added to the library under each of their aliases. Any [sound option](https://pixijs.io/sound/docs/Options.html) except `url` and `preload`, including `sprites`, can go in the asset's `data`. This works with `Assets.add`, `Assets.addBundle` and bundle manifests:

```typescript
import { Assets } from 'pixi.js';
import { sound } from '@pixi/sound';

Assets.add({
    alias: 'sfx',
    src: 'path/to/sfx.{ogg,mp3}',
    data: {
        volume: 0.5,
        sprites: {
            coin: { start: 0, end: 0.4 },
            jump: { start: 0.5, end: 1.1 },
        },
    },
});

await Assets.load('sfx');
sound.play('sfx', 'coin');
```

### Browser Usage

If you're using a `<script>` element to import `@pixi/sound` into your project, then the SoundLibrary object is `PIXI.sound` global. In the browser bundle, the named exports are also available on that global, which is why the [examples](https://pixijs.io/sound/examples/index.html) use `PIXI.sound.Sound` and `PIXI.sound.filters`.

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

### Autoplay and User Gestures

Browsers don't let a page start audio until the user has interacted with it. `@pixi/sound` creates its `AudioContext` on import, so it starts suspended and Chrome may log "The AudioContext was not allowed to start". That's expected. The library resumes the context on a `mousedown`, `touchstart` or `touchend` anywhere on the page, so a "click to start" screen is enough. If your app starts from the keyboard, resume it in your own handler:

```typescript
import { sound } from '@pixi/sound';

document.addEventListener('keydown', () =>
{
    if (!sound.context.paused)
    {
        sound.context.audioContext.resume();
    }
});
```

### Versions Compatibility

| PixiJS | PixiJS Sound | Status |
|---|---|---|
| v5.x - v6.x | v4.x | No longer maintained |
| v7.x | v5.x | No longer maintained |
| v8.x | v6.x | Maintained |

### Resources

* [Releases](https://github.com/pixijs/sound/releases)
* [Basics](https://pixijs.io/sound/examples/index.html)
* [Sprites](https://pixijs.io/sound/examples/sprites.html)
* [Filters](https://pixijs.io/sound/examples/filters.html)
* [Demo](https://pixijs.io/sound/examples/demo.html)
* [API Documentation](https://pixijs.io/sound/docs/index.html)

## Running the Tests

The tests run in headless Chromium and Firefox through Vitest's browser mode, so they get a real `AudioContext` and `HTMLAudioElement`. They need Node.js 22.12 or later. Install Playwright's browsers once, then run them:

```bash
npm install
npx playwright install chromium firefox
npm test
```

To run one file, pass its path: `npm test -- test/webaudio.test.ts`. To run one browser, name it: `npm test -- --project chromium`. Firefox needs an audio output, so on a machine without one its tests time out.

CI also runs the tests in WebKit, where a failure doesn't block a merge. To run them, install it with `npx playwright install webkit`, then run `npx vitest run --project webkit`.

## License

MIT License.
