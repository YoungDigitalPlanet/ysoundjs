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
(function(window) {

	/**
	 * Play sounds using default mechanism
	 * 
	 * @class DefaultAudioPlugin
	 * @constructor
	 */
	function DefaultAudioPlugin() {
		this.init();
	}

	/**
	 * The capabilities of the plugin.
	 * 
	 * @property capabilities
	 * @type Object
	 * @static
	 */
	DefaultAudioPlugin.capabilities = {
		mp3 : true,
		ogg : true,
		mpeg : true,
		wav : true
	};

	/**
	 * Determine if the plugin can be used.
	 * 
	 * @method isSupported
	 * @return {Boolean} If the plugin can be initialized.
	 * @static
	 */
	DefaultAudioPlugin.isSupported = function() {
		return true;
	};

	var p = DefaultAudioPlugin.prototype = {

		capabilities : null,

		init : function() {
			this.capabilities = DefaultAudioPlugin.capabilities;
		},

		/**
		 * Pre-register a sound instance when preloading/setup.
		 * 
		 * @method register
		 * @param {String}
		 *            src The source of the audio
		 * @param {Number}
		 *            instances The number of concurrently playing instances to
		 *            allow for the channel at any time.
		 * @return {Object} A result object
		 */
		register : function(src, instances) {
			var soundInstance = new SoundInstance(src);
			window.empiriaSoundJsInit(soundInstance, src);
			return soundInstance;
		},

		/**
		 * Create a sound instance.
		 * 
		 * @method create
		 * @param {String}
		 *            src The source to use.
		 * @return {SoundInstance} A sound instance for playback and control.
		 */
		create : function(src) {
			return window.empiriaSoundJsGetSoundInstance(src);
		},

		toString : function() {
			return "[DefaultAudioPlugin]";
		}

	}

	window.SoundJS.DefaultAudioPlugin = DefaultAudioPlugin;

	/**
	 * Sound Instances are created when any calls to SoundJS.play() are made.
	 * The instances are returned by the active plugin for control by the user.
	 * Users can control audio directly through the instance.
	 * 
	 * @class SoundInstance
	 * @param {String}
	 *            src The path to the sound
	 * @constructor
	 */
	function SoundInstance(src) {
		this.init(src);
	}

	var p = SoundInstance.prototype = {

		/**
		 * The source of the sound.
		 * 
		 * @property src
		 * @type String
		 * @default null
		 */
		src : null,

		/**
		 * The callback that is fired when a sound has completed playback
		 * 
		 * @event onComplete
		 */
		onComplete : null,

		init : function(src) {
			this.src = src;
		},

		/*
		 * --------------- Public API. ---------------
		 */
		/**
		 * Play an instance. This API is only used to play an instance after it
		 * has been stopped or interrupted.`
		 * 
		 * @method play
		 * @param {Number}
		 *            loop determines if audio will be played in a loop. It will
		 *            loop if value will be not a zero
		 * @param {Number}
		 *            delay The delay in milliseconds before the sound starts
		 * @param {Number}
		 *            offset How far into the sound to begin playback.
		 * 
		 * Other parameters will be ignored
		 */
		play : function(interrupt, delay, offset, loop, volume, pan) {
			var src = this.src;
			
			if(offset == null) offset = 0;
			if(delay == null) delay = 0;
			if(loop == null) loop = 0;
			
			this.setPosition(offset);

			setTimeout(function() {
				if (loop !== 0) {
					window.empiriaSoundJsPlayLooped(src);
				} else {
					window.empiriaSoundJsPlay(src);
				}
			}, delay);

		},

		/**
		 * Pause the instance.
		 * 
		 * @method pause
		 * @return {Boolean} If the pause call succeeds.
		 */
		pause : function() {
			window.empiriaSoundJsPause(this.src);
			return true;
		},

		/**
		 * Resume a sound instance that has been paused.
		 * 
		 * @method resume
		 * @return {Boolean} If the resume call succeeds.
		 */
		resume : function() {
			window.empiriaSoundJsResume(this.src);
			return true;
		},

		/**
		 * Stop a sound instance.
		 * 
		 * @method stop
		 * @return {Boolean} If the stop call succeeds.
		 */
		stop : function() {
			window.empiriaSoundJsStop(this.src);
		},

		/**
		 * Get the position of the playhead in the sound instance.
		 * 
		 * @method getPosition
		 * @return {Number} The position of the playhead in milliseconds.
		 */
		getPosition : function() {
			var time = window.empiriaSoundJsGetCurrentTime(this.src);
			time = time * 1000;

			return time;
		},

		/**
		 * Set the position of the playhead in the sound instance.
		 * 
		 * @method setPosition
		 * @param {Number}
		 *            value The position of the playhead in milliseconds.
		 */
		setPosition : function(value) {
			var time = value * 0.001;
			window.empiriaSoundJsSetCurrentTime(this.src, time);

			return true;
		},

		toString : function() {
			return "[DefaultAudio SoundInstance]";
		}

	}
}(window));