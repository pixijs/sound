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
export * from './Filter';
export * from './EqualizerFilter';
export * from './DistortionFilter';
export * from './StereoFilter';
export * from './ReverbFilter';
export * from './MonoFilter';
export * from './StreamFilter';
export * from './TelephoneFilter';
