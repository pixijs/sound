import { EventEmitter } from '@pixi/utils';
import { Filter } from '../filters/Filter';
import { IMediaContext } from '../interfaces/IMediaContext';

/**
 * The fallback version of WebAudioContext which uses `<audio>` instead of WebAudio API.
 * @memberof htmlaudio
 * @extends PIXI.util.EventEmitter
 */
class HTMLAudioContext extends EventEmitter implements IMediaContext
{
    /** Current global speed from 0 to 1 */
    public speed = 1;

    /** Current muted status of the context */
    public muted = false;

    /** Current volume from 0 to 1  */
    public volume = 1;

    /** Current paused status */
    public paused = false;

    /** Internal trigger when volume, mute or speed changes */
    public refresh(): void
    {
        this.emit('refresh');
    }

    /** Internal trigger paused changes */
    public refreshPaused(): void
    {
        this.emit('refreshPaused');
    }

    /**
     * HTML Audio does not support filters, this is non-functional API.
     */
    public get filters(): Filter[]
    {
        console.warn('HTML Audio does not support filters');

        return null;
    }
    public set filters(_filters: Filter[])
    {
        console.warn('HTML Audio does not support filters');
    }

    /**
     * HTML Audio does not support `audioContext`
     * @readonly
     * @type {AudioContext}
     */
    public get audioContext(): AudioContext
    {
        console.warn('HTML Audio does not support audioContext');

        return null;
    }

    /**
     * Toggles the muted state.
     * @return The current muted state.
     */
    public toggleMute(): boolean
    {
        this.muted = !this.muted;
        this.refresh();

        return this.muted;
    }

    /**
     * Toggles the paused state.
     * @return The current paused state.
     */
    public togglePause(): boolean
    {
        this.paused = !this.paused;
        this.refreshPaused();

        return this.paused;
    }

    /** Destroy and don't use after this */
    public destroy(): void
    {
        this.removeAllListeners();
    }
}

export { HTMLAudioContext };
