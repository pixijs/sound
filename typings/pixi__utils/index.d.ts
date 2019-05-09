/// <reference types="pixi.js" />
declare module "@pixi/utils" {
    import { utils } from "pixi.js";
    export class EventEmitter extends utils.EventEmitter {}
}