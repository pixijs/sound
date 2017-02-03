import SoundContext from './SoundContext';
import {Options, PlayOptions} from './Sound';
import Sound from './Sound';
import SoundInstance from './SoundInstance';
import SoundUtils from './SoundUtils';

/**
 * @description Manages the playback of sounds.
 * @class SoundLibrary
 * @memberof PIXI.sound
 * @private
 */
export default class SoundLibrary
{
    public SoundUtils:typeof SoundUtils;
    public Sound:typeof Sound;
    public SoundInstance:typeof SoundInstance;
    public SoundLibrary:typeof SoundLibrary;

    private _context:SoundContext;
    private _sounds:{[id:string]: Sound};

    constructor()
    {
        /**
         * The global context to use.
         * @name PIXI.sound#_context
         * @type {PIXI.sound.SoundContext}
         * @private
         */
        this._context = new SoundContext();

        /**
         * The map of all sounds by alias.
         * @name PIXI.sound#_sounds
         * @type {Object}
         * @private
         */
        this._sounds = {};

        /*
         * The reference to SoundUtils class.
         * @name PIXI.sound.SoundUtils
         * @type {PIXI.sound.SoundUtils}
         */
        this.SoundUtils = SoundUtils;

        /*
         * The reference to Sound class.
         * @name PIXI.sound.Sound
         * @type {Sound}
         */
        this.Sound = Sound;

        /*
         * The reference to SoundInstance class.
         * @name PIXI.sound.SoundInstance
         * @type {PIXI.sound.SoundInstance}
         */
        this.SoundInstance = SoundInstance;
        
        /*
         * The reference to SoundLibrary class.
         * @name PIXI.sound.SoundLibrary
         * @type {PIXI.sound.SoundLibrary}
         */
        this.SoundLibrary = SoundLibrary;
    }

    /**
     * The global context to use.
     * @name PIXI.sound#context
     * @readOnly
     * @type {PIXI.sound.SoundContext}
     */
    get context(): SoundContext
    {
        return this._context;
    }

    /**
     * Adds a new sound by alias.
     * @method PIXI.sound#add
     * @param {String} alias The sound alias reference.
     * @param {ArrayBuffer|String|Object} options Either the path or url to the source file.
     *        or the object of options to use.
     * @param {ArrayBuffer|String} [options.src] If `options` is an object, the source of file.
     * @param {Boolean} [options.autoPlay=false] true to play after loading.
     * @param {Boolean} [options.preload=false] true to immediately start preloading.
     * @param {Boolean} [options.block=false] true to only play one instance of the sound at a time.
     * @param {Number} [options.volume=1] The amount of volume 1 = 100%.
     * @param {Boolean} [options.useXHR=true] true to use XMLHttpRequest to load the sound. Default is false, loaded with NodeJS's `fs` module.
     * @param {Number} [options.panning=0] The panning amount from -1 (left) to 1 (right).
     * @param {PIXI.sound.Sound~completeCallback} [options.complete=null] Global complete callback when play is finished.
     * @param {PIXI.sound.Sound~loadedCallback} [options.loaded=null] Call when finished loading.
     * @return {PIXI.sound.Sound} Instance to the Sound object.
     */
    add(alias:string, options:Options|string|ArrayBuffer):Sound
    {
        // @if DEBUG
        console.assert(!this._sounds[alias], `Sound with alias ${alias} already exists.`);
        // @endif
        const sound = this._sounds[alias] = new Sound(this.context, options);
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
    addMap(map:{string:Options|string|ArrayBuffer}, globalOptions?:Options):{[id:string]:Sound}
    {
        let results:{[id:string]:Sound} = {};
        for(let a in map)
        {
            let options:Options;
            if (typeof map[a] === "string" || map[a] instanceof ArrayBuffer)
            {
                options = {src: map[a]};
            }
            else
            {
                options = map[a];
            }
            results[a] = this.add(a, Object.assign(
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
    removeAll(): SoundLibrary
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
     * Gets a sound.
     * @method PIXI.sound#sound
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    sound(alias:string):Sound
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
        return this.sound(alias).play(options);
    }

    /**
     * Stops a sound.
     * @method PIXI.sound#stop
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    stop(alias:string):Sound
    {
        return this.sound(alias).stop();
    }

    /**
     * Pauses a sound.
     * @method PIXI.sound#pause
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    pause(alias:string):Sound
    {
        return this.sound(alias).pause();
    }

    /**
     * Resumes a sound.
     * @method PIXI.sound#resume
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound} Instance for chaining.
     */
    resume(alias:string):Sound
    {
        return this.sound(alias).resume();
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
        const sound = this.sound(alias);
        if (volume !== undefined) {
            sound.volume = volume;
        }
        return sound.volume;
    }

    /**
     * Get or set the panning for a sound.
     * @method PIXI.sound#panning
     * @param {String} alias The sound alias reference.
     * @param {Number} [panning] Optional current panning from -1 to 1 (0 is centered).
     * @return {Number} The current panning.
     */
    panning(alias:string, panning?:number):number
    {
        const sound = this.sound(alias);
        if (panning !== undefined) {
            sound.panning = panning;
        }
        return sound.panning;
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
