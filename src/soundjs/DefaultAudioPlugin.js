/*
 * DefaultAudioPlugin for SoundJS
 * Visit http://createjs.com/ for documentation, updates and examples.
 *
 *
 * Copyright (c) 2012 gskinner.com, inc.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @module SoundJS
 */
(function (window) {

    /**
     * Play sounds using HTML <audio> tags in the browser.
     * @class DefaultAudioPlugin
     * @constructor
     */
    function DefaultAudioPlugin() {
        this.init();
    }

    /**
     * The capabilities of the plugin.
     * @property capabilities
     * @type Object
     * @default null
     * @static
     */
    DefaultAudioPlugin.capabilities = null;

    DefaultAudioPlugin.lastId = 0;

    /**
     * Determine if the plugin can be used.
     * @method isSupported
     * @return {Boolean} If the plugin can be initialized.
     * @static
     */
    DefaultAudioPlugin.isSupported = function () {
    	DefaultAudioPlugin.generateCapabilities();
    	return true;
    };

    /**
     * Determine the capabilities of the plugin.
     * @method generateCapabiities
     * @static
     */
    DefaultAudioPlugin.generateCapabilities = function () {
        if (DefaultAudioPlugin.capabilities != null) {
            return;
        }
        var c = DefaultAudioPlugin.capabilities = {
            panning: false,
            volume: false,
            mp3: true,
            ogg: true,
            mpeg: true,
            wav: true
        };
    }

    var p = DefaultAudioPlugin.prototype = {

        capabilities: null,

        init: function () {
            this.capabilities = DefaultAudioPlugin.capabilities;
        },

        /**
         * Pre-register a sound instance when preloading/setup.
         * @method register
         * @param {String} src The source of the audio
         * @param {Number} instances The number of concurrently playing instances to allow for the channel at any time.
         * @return {Object} A result object, containing a tag for preloading purposes.
         */
        register: function (src, instances) { 
        	var soundInstance = new SoundInstance(src);
            window.empiriaSoundJsInit(soundInstance, src);
            return soundInstance;
        },

        /**
         * Create a sound instance.
         * @method create
         * @param {String} src The source to use.
         * @return {SoundInstance} A sound instance for playback and control.
         */
        create: function (src) {
            var instance = window.empiriaSoundJsGetSoundInstance(src);
            instance.owner = this;
            return instance;
        },

        toString: function () {
            return "[DefaultAudioPlugin]";
        }

    }

    window.SoundJS.DefaultAudioPlugin = DefaultAudioPlugin;


    /**
     * Sound Instances are created when any calls to SoundJS.play() are made.
     * The instances are returned by the active plugin for control by the user.
     * Users can control audio directly through the instance.
     * @class SoundInstance
     * @param {String} src The path to the sound
     * @constructor
     */
    function SoundInstance(src) {
        this.init(src);
    }

    var p = SoundInstance.prototype = {

        /**
         * The source of the sound.
         * @property src
         * @type String
         * @default null
         */
        src: null,

        /**
         * The unique ID of the instance
         * @property uniqueId
         * @type String | Number
         * @default -1
         */
        uniqueId: -1,

        /**
         * The play state of the sound. Play states are defined as constants on SoundJS
         * @property playState
         * @type String
         * @default null
         */
        playState: null,

        /**
         * The plugin that created the instance
         * @property owner
         * @type DefaultAudioPlugin
         * @default null
         */
        owner: null,

        loaded: false,
        lastInterrupt: SoundJS.INTERRUPT_NONE,
        offset: 0,
        delay: 0,
        volume: 1,
        pan: 0,

        remainingLoops: 0,
        delayTimeout: -1,
        tag: null,


        /**
         * Determines if the audio is currently muted.
         * @property muted
         * @type Boolean
         * @default false
         */
        muted: false,

        /**
         * Determines if the audio is currently paused. If the audio has not yet started playing,
         * it will be true, unless the user pauses it.
         * @property paused
         * @type Boolean
         * @default false
         */
        paused: false,


        /**
         * The callback that is fired when a sound has completed playback
         * @event onComplete
         */
        onComplete: null,

        // Constructor
        init: function (src) {
            this.uniqueId = DefaultAudioPlugin.lastId++;
            this.src = src;
        },

        // Public API
        /**
         * Play an instance. This API is only used to play an instance after it has been stopped
         * or interrupted.`
         * @method play
         * @param {String} interrupt How this sound interrupts other instances with the same source. Interrupt values are defined as constants on SoundJS.
         * @param {Number} delay The delay in milliseconds before the sound starts
         * @param {Number} offset How far into the sound to begin playback.
         * @param {Number} loop The number of times to loop the audio. Use -1 for infinite loops.
         * @param {Number} volume The volume of the sound between 0 and 1.
         * @param {Number} pan The pan of the sound between -1 and 1. Note that pan does not work for HTML Audio.
         */
        play: function (interrupt, delay, offset, loop, volume, pan) {
        	this.beginPlaying(offset, loop, volume, pan);
        },

        // Called by SoundJS when ready
        beginPlaying: function (offset, loop, volume, pan) {
        	if(typeof loop != 'undefined' && loop > 0) {
        		window.empiriaSoundJsBeginPlayingLooped(this.src);
        	} else {
        		window.empiriaSoundJsBeginPlaying(this.src);
        	}
        },

        /**
         * Pause the instance.
         * @method pause
         * @return {Boolean} If the pause call succeeds.
         */
        pause: function () {
        	window.empiriaSoundJsPause(this.src);
        	return true;
        },

        /**
         * Resume a sound instance that has been paused.
         * @method resume
         * @return {Boolean} If the resume call succeeds.
         */
        resume: function () {
        	window.empiriaSoundJsResume(this.src);
        	return true;
        },

        /**
         * Stop a sound instance.
         * @method stop
         * @return {Boolean} If the stop call succeeds.
         */
        stop: function () {
            window.empiriaSoundJsStop(this.src);
        },

        /**
         * Get the position of the playhead in the sound instance.
         * @method getPosition
         * @return {Number} The position of the playhead in milliseconds.
         */
        getPosition: function () {
            if (this.tag == null) {
                return 0;
            }
            return this.tag.currentTime * 1000;
        },

        /**
         * Set the position of the playhead in the sound instance.
         * @method setPosition
         * @param {Number} value The position of the playhead in milliseconds.
         */
        setPosition: function (value) {
            if (this.tag == null) {
                return false;
            }
            try {
                this.tag.currentTime = value * 0.001;
            } catch (error) { // Out of range
                return false;
            }
            return true;
        },

        handleSoundComplete: function (event) {
            if (this.onComplete != null) {
                this.onComplete(this);
            }
        },

        toString: function () {
            return "[DefaultAudio SoundInstance]";
        }

    }
}(window));