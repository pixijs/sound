import Filter from './Filter';
import EqualizerFilter from './EqualizerFilter';
import DistortionFilter from './DistortionFilter';
import StereoFilter from './StereoFilter';
import ReverbFilter from './ReverbFilter';
import MonoFilter from './MonoFilter';

/**
 * Set of dynamic filters to be applied to PIXI.sound.Sound.
 * @example
 * const sound = PIXI.sound.Sound.from('file.mp3');
 * sound.filters = [
 *   new PIXI.sound.filters.StereoFilter(-1),
 *   new PIXI.sound.filters.ReverbFilter()
 * ];
 * @namespace PIXI.sound.filters
 */
export {
    Filter,
    EqualizerFilter,
    DistortionFilter,
    StereoFilter,
    ReverbFilter,
    MonoFilter
};