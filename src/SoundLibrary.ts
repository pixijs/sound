import SoundContext from './SoundContext';
import {Options, PlayOptions} from './Sound';
import Sound from './Sound';
import SoundInstance from './SoundInstance';
import SoundUtils from './SoundUtils';
import * as filters from './filters';

/**
 * @description Manages the playback of sounds.
 * @class SoundLibrary
 * @memberof PIXI.sound
 * @private
 */
export default class SoundLibrary
{
    /**
     * The reference to Sound class.
     * @name PIXI.sound.Sound
     * @type {Sound}
     */
    public Sound:typeof Sound;

    /**
     * The reference to SoundInstance class.
     * @name PIXI.sound.SoundInstance
     * @type {PIXI.sound.SoundInstance}
     */
    public SoundInstance:typeof SoundInstance;

    /*
     * The reference to SoundLibrary class.
     * @name PIXI.sound.SoundLibrary
     * @type {PIXI.sound.SoundLibrary}
     */
    public SoundLibrary:typeof SoundLibrary;

    // Documentation as namespace
    public filters:typeof filters;

    // Documented as namespace
    public utils:typeof SoundUtils;

    /**
     * The global context to use.
     * @name PIXI.sound#_context
     * @type {PIXI.sound.SoundContext}
     * @private
     */
    private _context:SoundContext;

    /**
     * The map of all sounds by alias.
     * @name PIXI.sound#_sounds
     * @type {Object}
     * @private
     */
    private _sounds:{[id:string]: Sound};

    constructor()
    {
        if (this.supported)
        {
            this._context = new SoundContext();
        }
        this._sounds = {};
        this.utils = SoundUtils;
        this.filters = filters;
        this.Sound = Sound;
        this.SoundInstance = SoundInstance;
        this.SoundLibrary = SoundLibrary;
    }

    /**
     * The global context to use.
     * @name PIXI.sound#context
     * @readOnly
     * @type {PIXI.sound.SoundContext}
     */
    get context():SoundContext
    {
        return this._context;
    }

    /**
     * WebAudio is supported on the current browser.
     * @name PIXI.sound#supported
     * @readOnly
     * @type {Boolean}
     */
    get supported(): boolean
    {
        return SoundContext.AudioContext !== null;
    }

    /**
     * Adds a new sound by alias.
     * @method PIXI.sound#add
     * @param {String} alias The sound alias reference.
     * @param {PIXI.sound.Sound} sound Sound reference to use.
     * @return {PIXI.sound.Sound} Instance of the Sound object.
     */

    /**
     * Adds a new sound by alias.
     * @method PIXI.sound#add
     * @param {String} alias The sound alias reference.
     * @param {ArrayBuffer|String|Object} options Either the path or url to the source file.
     *        or the object of options to use.
     * @param {ArrayBuffer|String} [options.src] If `options` is an object, the source of file.
     * @param {Boolean} [options.autoPlay=false] true to play after loading.
     * @param {Boolean} [options.preload=false] true to immediately start preloading.
     * @param {Boolean} [options.singleInstance=false] `true` to disallow playing multiple layered instances at once.
     * @param {Number} [options.volume=1] The amount of volume 1 = 100%.
     * @param {Boolean} [options.useXHR=true] true to use XMLHttpRequest to load the sound. Default is false, loaded with NodeJS's `fs` module.
     * @param {PIXI.sound.Sound~completeCallback} [options.complete=null] Global complete callback when play is finished.
     * @param {PIXI.sound.Sound~loadedCallback} [options.loaded=null] Call when finished loading.
     * @return {PIXI.sound.Sound} Instance of the Sound object.
     */
    add(alias:string, options:Options|string|ArrayBuffer|Sound):Sound
    {
        // @if DEBUG
        console.assert(!this._sounds[alias], `Sound with alias ${alias} already exists.`);
        // @endif
        let sound:Sound;
        if (options instanceof Sound)
        {
            sound = this._sounds[alias] = (options as Sound);
        }
        else
        {
            sound = this._sounds[alias] = new Sound(this.context, options);
        }
        return sound;
    }

    /**
     * Adds multiple sounds.
     * @method PIXI.sound#addMap
     * @param {Object} map Map of sounds to add, the key is the alias, the value is the
     *        string, ArrayBuffer or the list of options (see `add` method for options).
     * @param {Object|String|ArrayBuffer} globalOptions The default options for all sounds.
     *        if a property is defined, it will use the local property instead.
     * @return {PIXI.sound.Sound} Instance to the Sound object.
     */
    addMap(map:{[id:string]:Options|string|ArrayBuffer}, globalOptions?:Options):{[id:string]:Sound}
    {
        const results:{[id:string]:Sound} = {};
        for(const alias in map)
        {
            let options:Options;
            let sound:any = map[alias] as any;
            if (typeof sound === "string")
            {
                options = { src: sound as string };
            }
            else if(sound instanceof ArrayBuffer)
            {
                options = { srcBuffer: sound as ArrayBuffer };
            }
            else
            {
                options = sound as Options;
            }
            results[alias] = this.add(alias, Object.assign(
                options,
                globalOptions || {}
            ));
        }
        return results;
    }

    /**
     * Removes a sound by alias.
     * @method PIXI.sound#remove
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound} Instance for chaining.
     */
    remove(alias:string):SoundLibrary
    {
        this.exists(alias, true);
        this._sounds[alias].destroy();
        delete this._sounds[alias];
        return this;
    }

    /**
     * Pauses any playing sounds.
     * @method PIXI.sound#pauseAll
     * @return {PIXI.sound} Instance for chaining.
     */
    pauseAll():SoundLibrary
    {
        this._context.paused = true;
        return this;
    }

    /**
     * Resumes any sounds.
     * @method PIXI.sound#resumeAll
     * @return {PIXI.sound} Instance for chaining.
     */
    resumeAll():SoundLibrary
    {
        this._context.paused = false;
        return this;
    }

    /**
     * Mutes all playing sounds.
     * @method PIXI.sound#muteAll
     * @return {PIXI.sound} Instance for chaining.
     */
    muteAll():SoundLibrary
    {
        this._context.muted = true;
        return this;
    }

    /**
     * Unmutes all playing sounds.
     * @method PIXI.sound#unmuteAll
     * @return {PIXI.sound} Instance for chaining.
     */
    unmuteAll():SoundLibrary
    {
        this._context.muted = false;
        return this;
    }

    /**
     * Stops and removes all sounds. They cannot be used after this.
     * @method PIXI.sound#removeAll
     * @return {PIXI.sound} Instance for chaining.
     */
    removeAll():SoundLibrary
    {
        for (let alias in this._sounds)
        {
            this._sounds[alias].destroy();
            delete this._sounds[alias];
        }
        return this;
    }

    /**
     * Stops all sounds.
     * @method PIXI.sound#stopAll
     * @return {PIXI.sound} Instance for chaining.
     */
    stopAll():SoundLibrary
    {
        for(let alias in this._sounds)
        {
            this._sounds[alias].stop();
        }
        return this;
    }

    /**
     * Checks if a sound by alias exists.
     * @method PIXI.sound#exists
     * @param {String} alias Check for alias.
     * @return {Boolean} true if the sound exists.
     */
    exists(alias:string, assert:boolean=false):boolean
    {
        const exists = !!this._sounds[alias];
        if (assert)
        {
            console.assert(exists, `No sound matching alias '${alias}'.`);
        }
        return exists;
    }

    /**
     * Find a sound by alias.
     * @method PIXI.sound#find
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    find(alias:string):Sound
    {
        this.exists(alias, true);
        return this._sounds[alias];
    }

    /**
     * Plays a sound.
     * @method PIXI.sound#play
     * @param {String} alias The sound alias reference.
     * @param {Object|Function} options The options or callback when done.
     * @param {Function} [options.complete] When completed.
     * @param {Function} [options.loaded] If not already preloaded, callback when finishes load.
     * @param {Number} [options.offset=0] Start time offset.
     * @return {PIXI.sound.SoundInstance|null} The sound instance, this cannot be reused
     *         after it is done playing. Returns `null` if the sound has not yet loaded.
     */
    play(alias:string, options?:PlayOptions|Object):SoundInstance
    {
        return this.find(alias).play(options);
    }

    /**
     * Stops a sound.
     * @method PIXI.sound#stop
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    stop(alias:string):Sound
    {
        return this.find(alias).stop();
    }

    /**
     * Pauses a sound.
     * @method PIXI.sound#pause
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    pause(alias:string):Sound
    {
        return this.find(alias).pause();
    }

    /**
     * Resumes a sound.
     * @method PIXI.sound#resume
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound} Instance for chaining.
     */
    resume(alias:string):Sound
    {
        return this.find(alias).resume();
    }

    /**
     * Get or set the volume for a sound.
     * @method PIXI.sound#volume
     * @param {String} alias The sound alias reference.
     * @param {Number} [volume] Optional current volume to set.
     * @return {Number} The current volume.
     */
    volume(alias:string, volume?:number):number
    {
        const sound = this.find(alias);
        if (volume !== undefined) {
            sound.volume = volume;
        }
        return sound.volume;
    }

    /**
     * Get the length of a sound in seconds.
     * @method PIXI.sound#duration
     * @param {String} alias The sound alias reference.
     * @return {Number} The current duration in seconds.
     */
    duration(alias:string):number
    {
        return this.find(alias).duration;
    }

    /**
     * Destroys the sound module.
     * @method PIXI.sound#destroy
     * @private
     */
    destroy():void
    {
        this.removeAll();
        this._sounds = null;
        this._context = null;
    }
}
