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
export { default as Filter } from './Filter';
export { default as EqualizerFilter } from './EqualizerFilter';
export { default as DistortionFilter } from './DistortionFilter';
export { default as StereoFilter } from './StereoFilter';
export { default as ReverbFilter } from './ReverbFilter';
export { default as MonoFilter } from './MonoFilter';
export { default as TelephoneFilter } from './TelephoneFilter';
