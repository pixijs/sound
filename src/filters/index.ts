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
export { Filter } from './Filter';
export { EqualizerFilter } from './EqualizerFilter';
export { DistortionFilter } from './DistortionFilter';
export { StereoFilter } from './StereoFilter';
export { ReverbFilter } from './ReverbFilter';
export { MonoFilter } from './MonoFilter';
export { StreamFilter } from './StreamFilter';
export { TelephoneFilter } from './TelephoneFilter';
