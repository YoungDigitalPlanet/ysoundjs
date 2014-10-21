/*
 * HTMLAudioPlugin for SoundJS
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
     * @class HTMLAudioPlugin
     * @constructor
     */
    function HTMLAudioPlugin() {
        this.init();
    }

    /**
     * The maximum number of instances that can be played. This is a browser limitation.
     * @property MAX_INSTANCES
     * @type Number
     * @default 30
     * @static
     */
    HTMLAudioPlugin.MAX_INSTANCES = 30;

    /**
     * The capabilities of the plugin.
     * @property capabilities
     * @type Object
     * @default null
     * @static
     */
    HTMLAudioPlugin.capabilities = null;

    HTMLAudioPlugin.lastId = 0;

    // Event constants
    HTMLAudioPlugin.AUDIO_READY = "canplaythrough";
    HTMLAudioPlugin.AUDIO_ENDED = "ended";
    HTMLAudioPlugin.AUDIO_ERROR = "error"; //TODO: Handle error cases
    HTMLAudioPlugin.AUDIO_STALLED = "stalled";

    //TODO: Not used. Chrome can not do this when loading audio from a server.
    HTMLAudioPlugin.fillChannels = false;

    /**
     * Determine if the plugin can be used.
     * @method isSupported
     * @return {Boolean} If the plugin can be initialized.
     * @static
     */
    HTMLAudioPlugin.isSupported = function () {
        if (SoundJS.BrowserDetect.isAdobeAIR && SoundJS.BrowserDetect.isAndroid) {
            return false;
        }
        HTMLAudioPlugin.generateCapabilities();
        if (HTMLAudioPlugin.capabilities.mp3 ||
            HTMLAudioPlugin.capabilities.ogg ||
            HTMLAudioPlugin.capabilities.mpeg ||
            HTMLAudioPlugin.capabilities.wav) {
            var t = HTMLAudioPlugin.tag;
            if (t == null || t.canPlayType == null) {
                return false;
            }
            return true;
        } else {
            return false;
        }
    };

    /**
     * Determine the capabilities of the plugin.
     * @method generateCapabiities
     * @static
     */
    HTMLAudioPlugin.generateCapabilities = function () {
        if (HTMLAudioPlugin.capabilities != null) {
            return;
        }
        var t = HTMLAudioPlugin.tag = document.createElement("audio");
        var c = HTMLAudioPlugin.capabilities = {
            panning: false,
            volume: true,
            mp3: (t.canPlayType && t.canPlayType("audio/mp3") != "no" && t.canPlayType("audio/mp3") != "")
                || (t.canPlayType && t.canPlayType("audio/mpeg") != "no" && t.canPlayType("audio/mpeg") != ""),
            ogg: t.canPlayType && t.canPlayType("audio/ogg") != "no" && t.canPlayType("audio/ogg") != "",
            mpeg: t.canPlayType && t.canPlayType("audio/mpeg") != "no" && t.canPlayType("audio/mpeg") != "",
            wav: t.canPlayType && t.canPlayType("audio/wav") != "no" && t.canPlayType("audio/wav") != "",
            channels: HTMLAudioPlugin.MAX_INSTANCES
        };
        console.log("HTMLAudioPlugin.generateCapabilities");
        // TODO: Other props?
    }

    var p = HTMLAudioPlugin.prototype = {

        capabilities: null,
        FT: 0.001,
        channels: null,

        init: function () {
            this.capabilities = HTMLAudioPlugin.capabilities;
            this.channels = {};
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
            return "[HTMLAudioPlugin]";
        }

    }

    window.SoundJS.HTMLAudioPlugin = HTMLAudioPlugin;


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

        //TODO: Fading out when paused/stopped?

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
         * @type HTMLAudioPlugin
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

        /**
         * The callback that is fired when a sound has completed playback, but has loops remaining.
         * @event onLoop
         */
        onLoop: null,

        /**
         * The callback that is fired when a sound is ready to play.
         * @event onReady
         */
        onReady: null,

        /**
         * The callback that is fired when a sound has failed to start.
         * @event onPlayFailed
         */
        onPlayFailed: null,

        /**
         * The callback that is fired when a sound has been interrupted.
         * @event onPlayInterrupted
         */
        onPlayInterrupted: null,

        // Proxies, make removing listeners easier.
        endedHandler: null,
        readyHandler: null,
        stalledHandler: null,

        // Constructor
        init: function (src) {
            this.uniqueId = HTMLAudioPlugin.lastId++;
            this.src = src;
            this.endedHandler = SoundJS.proxy(this.handleSoundComplete, this);
            this.readyHandler = SoundJS.proxy(this.handleSoundReady, this);
            this.stalledHandler = SoundJS.proxy(this.handleSoundStalled, this);
        },

        cleanUp: function () {
        },

        interrupt: function () {
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
        	beginPlaying(offset, loop, volume, pan);
        },

        // Called by SoundJS when ready
        beginPlaying: function (offset, loop, volume, pan) {
        	if(typeof loop != 'undefined' && loop > 0) {
        		window.empiriaSoundJsBeginPlayingLooped(this.src);
        	} else {
        		window.empiriaSoundJsBeginPlaying(this.src);
        	}
        },

        handleSoundStalled: function (event) {
        },

        handleSoundReady: function (event) {
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

//        // Called by SoundJS
//        setMasterVolume: function (value) {
//        },
//
//        /**
//         * Set the volume of the sound instance.
//         * @method setVolume
//         * @param value
//         * @return {Boolean} If the setVolume call succeeds.
//         */
//        setVolume: function (value) {
//        },
//
//        updateVolume: function () {
//        },
//
//        /**
//         * Get the volume of the sound, not including how the master volume has affected it.
//         * @method getVolume
//         * @param value
//         * @return The volume of the sound.
//         */
//        getVolume: function (value) {
//            console.log("getVolume SoundInstance");
//        },
//
//        /**
//         * Mute the sound.
//         * @method mute
//         * @param {Boolean} isMuted If the sound should be muted or not.
//         * @return {Boolean} If the mute call succeeds.
//         */
//        mute: function (isMuted) {
//            console.log("mute SoundInstance");
//            return true;
//        },

        /**
         * Set the pan of a sound instance. Note that this does not work in HTML audio.
         * @method setPan
         * @param {Number} value The pan value between -1 (left) and 1 (right).
         * @return {Number} If the setPan call succeeds.
         */
        setPan: function (value) {
            return false;
        }, // Can not set pan in HTML

        /**
         * Get the pan of a sound instance. Note that this does not work in HTML audio.
         * @method getPan
         * @return {Number} The value of the pan between -1 (left) and 1 (right).
         */
        getPan: function () {
            return 0;
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

        /**
         * Get the duration of the sound instance.
         * @method getDuration
         * @return {Number} The duration of the sound instance in milliseconds.
         */
        getDuration: function () {
            if (this.tag == null) {
                return 0;
            }
            return this.tag.duration * 1000;
        },

        handleSoundComplete: function (event) {
           
            this.playState = SoundJS.PLAY_FINISHED;
            if (this.onComplete != null) {
                this.onComplete(this);
            }
        },

        // Play has failed
        playFailed: function () {
            this.playState = SoundJS.PLAY_FAILED;
            if (this.onPlayFailed != null) {
                this.onPlayFailed(this);
            }
            this.cleanUp();
        },

        toString: function () {
            return "[HTMLAudio SoundInstance]";
        }

    }
}(window));