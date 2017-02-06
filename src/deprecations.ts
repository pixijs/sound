import SoundLibrary from './SoundLibrary';
import Sound from './Sound';

/**
 * Gets a sound.
 * @method PIXI.sound#sound
 * @deprecated since 1.1.0
 * @see PIXI.sound#find
 */
(SoundLibrary.prototype as any).sound = function sound(alias:string): Sound
{
    console.warn('PIXI.sound.sound is deprecated, use PIXI.sound.find');
    return this.find(alias);
};