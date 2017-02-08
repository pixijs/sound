import SoundLibrary from './SoundLibrary';
import Sound from './Sound';

const SoundLibraryPrototype:any = SoundLibrary.prototype as any;

/**
 * Gets a sound.
 * @method PIXI.sound#sound
 * @deprecated since 1.1.0
 * @see PIXI.sound#find
 */
SoundLibraryPrototype.sound = function sound(alias:string): Sound
{
    console.warn('PIXI.sound.sound is deprecated, use PIXI.sound.find');
    return this.find(alias);
};

/**
 * Get or set the panning for a sound.
 * @method PIXI.sound#panning
 * @deprecated since 1.1.0
 * @see PIXI.sound.filters.StereoFilter
 */
SoundLibraryPrototype.panning = function(alias:string, panning?:number):number
{
    console.warn('PIXI.sound.panning is deprecated, use PIXI.sound.filters.StereoPan');
    return 0;
}

/**
 * Get the utilities.
 * @name PIXI.sound#SoundUtils
 * @deprecated since 1.1.0
 * @see PIXI.sound.utils
 */
Object.defineProperty(SoundLibraryPrototype, 'SoundUtils', {
    get() {
        console.warn('PIXI.sound.SoundUtils is deprecated, use PIXI.sound.utils');
        return this.utils;
    }
});
