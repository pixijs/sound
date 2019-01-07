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
export { Filter } from "./Filter";
export { EqualizerFilter } from "./EqualizerFilter";
export { DistortionFilter } from "./DistortionFilter";
export { StereoFilter } from "./StereoFilter";
export { ReverbFilter } from "./ReverbFilter";
export { MonoFilter } from "./MonoFilter";
export { TelephoneFilter } from "./TelephoneFilter";
