import { Filter } from './Filter';
import { EqualizerFilter } from './EqualizerFilter';
import { DistortionFilter } from './DistortionFilter';
import { StereoFilter } from './StereoFilter';
import { ReverbFilter } from './ReverbFilter';
import { MonoFilter } from './MonoFilter';
import { TelephoneFilter } from './TelephoneFilter';

/**
 * Set of dynamic filters to be applied to Sound.
 * @example
 * import { Sound, filters } from '@pixi/sound';
 * const sound = Sound.from('file.mp3');
 * sound.filters = [
 *   new filters.StereoFilter(-1),
 *   new filters.ReverbFilter()
 * ];
 * @namespace filters
 */
export default {
    Filter,
    EqualizerFilter,
    DistortionFilter,
    StereoFilter,
    ReverbFilter,
    MonoFilter,
    TelephoneFilter
};
