/*
 * SoundJS
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
 * The SoundJS library manages the playback of audio in HTML, via plugins which
 * abstract the actual implementation, and allow multiple playback modes
 * depending on the environment.
 * 
 * For example, a developer could specify: [WebAudioPlugin, HTML5AudioPlugin,
 * FlashAudioPlugin] In the latest browsers with webaudio support, a WebAudio
 * plugin would be used, other modern browsers could use HTML5 audio, and older
 * browsers with no HTML5 audio support would use the Flash Plugin.
 * 
 * Note that there is not currently a supported WebAudio plugin.
 * 
 * @module SoundJS
 */
(function(window) {

	/**
	 * The public API for creating sounds, and controlling the overall sound
	 * levels, and affecting multiple sounds at once. All SoundJS APIs are
	 * static.
	 * 
	 * SoundJS can also be used as a PreloadJS plugin to help preload audio
	 * properly.
	 * 
	 * @class SoundJS
	 * @constructor
	 */
	function SoundJS() {
		throw "SoundJS cannot be instantiated";
	}

	/**
	 * Determine how audio is split, when multiple paths are specified in a
	 * source.
	 * 
	 * @property DELIMITER
	 * @type String
	 * @default |
	 * @static
	 */
	SoundJS.DELIMITER = "|";

	/**
	 * The currently active plugin. If this is null, then no plugin could be
	 * initialized. If no plugin was specified, only the DefaultAudioPlugin is
	 * tested.
	 * 
	 * @property activePlugin
	 * @type Object
	 * @default null
	 * @static
	 */
	SoundJS.activePlugin = null;

	SoundJS.idHash = {};

	/**
	 * Register a list of plugins, in order of precedence.
	 * 
	 * @method registerPlugins
	 * @param {Array}
	 *            plugins An array of plugins to install.
	 * @return {Boolean} Whether a plugin was successfully initialized.
	 * @static
	 */
	SoundJS.registerPlugins = function(plugins) {
		for (var i = 0, l = plugins.length; i < l; i++) {
			var plugin = plugins[i];
			if (plugin == null) {
				continue;
			} // In case a plugin is not defined.
			// Note: Each plugin is passed in as a class reference, but we store
			// the activePlugin as an instances
			if (plugin.isSupported()) {
				SoundJS.activePlugin = new plugin();
				// TODO: Check error on initialization?
				return true;
			}
		}
		return false;
	}

	/**
	 * Register a SoundJS plugin. Plugins handle the actual playing of audio. By
	 * default the HTMLAudio plugin will be installed if no other plugins are
	 * present when the user starts playback.
	 * 
	 * @method registerPlugin
	 * @param {Object}
	 *            plugin The plugin class to install.
	 * @return {Boolean} Whether the plugin was successfully initialized.
	 * @static
	 */
	SoundJS.registerPlugin = function(plugin) {
		if (plugin.isSupported()) {
			SoundJS.activePlugin = new plugin();
			return true;
		}
		return false;
	}

	/**
	 * Determines if SoundJS has been initialized, and a plugin has been
	 * activated.
	 * 
	 * @method isReady
	 * @return {Boolean} If SoundJS has initialized a plugin.
	 * @static
	 */
	SoundJS.isReady = function() {
		return (SoundJS.activePlugin != null);
	}

	/**
	 * Get the active plugin's capabilities, which help determine if a plugin
	 * can be used in the current environment, or if the plugin supports a
	 * specific feature. Capabilities include:
	 * <ul>
	 * <li><b>mp3:</b> If MP3 audio is supported.</li>
	 * <li><b>ogg:</b> If OGG audio is supported.</li>
	 * <li><b>mpeg:</b> If MPEG audio is supported.</li>
	 * 
	 * @method getCapabilities
	 * @return {Object} An object containing the capabilities of the active
	 *         plugin.
	 * @static
	 */
	SoundJS.getCapabilities = function() {
		return SoundJS.activePlugin ? SoundJS.activePlugin.capabilities : null;
	}

	/**
	 * Get a specific capability of the active plugin. See the
	 * <b>getCapabilities</b> for a full list of capabilities.
	 * 
	 * @method getCapability
	 * @param {String}
	 *            key The capability to retrieve
	 * @return {String | Number | Boolean} The capability value.
	 * @static
	 */
	SoundJS.getCapability = function(key) {
		if (SoundJS.activePlugin == null) {
			return null;
		}
		return SoundJS.activePlugin.capabilities[key];
	}
	
	/*
	 * Private api
	 */

	/**
	 * Get the preload rules to be used by PreloadJS. This function should not
	 * be called, except by PreloadJS.
	 * 
	 * @return {Object} The callback, file types, and file extensions to use for
	 *         preloading.
	 * @static
	 * @private
	 */
	SoundJS.getPreloadHandlers = function() {
		return {
			callback : SoundJS.proxy(SoundJS.initLoad, SoundJS),
			types : [ "sound" ],
			extensions : [ "mp3", "ogg", "wav" ]
		}
	}

	/**
	 * Process manifest items from PreloadJS.
	 * 
	 * @method initLoad
	 * @param {String |
	 *            Object} value The src or object to load
	 * @param {String}
	 *            type The optional type of object. Will likely be "sound".
	 * @param {String}
	 *            id An optional id
	 * @param {Number |
	 *            String | Boolean | Object} data Optional data associated with
	 *            the item
	 * @return {Object} An object with the modified values that were passed in.
	 * @private
	 */
	SoundJS.initLoad = function(src, type, id, data) {
		if (!SoundJS.checkPlugin(true)) {
			return false;
		}

		var details = SoundJS.parsePath(src, type, id, data);
		if (details == null) {
			return false;
		}

		if (id != null) {
			SoundJS.idHash[id] = details.src;
		}

		var instance = SoundJS.activePlugin.register(details.src, data);
		if (instance != null) {
			if (instance.src) {
				details.src = instance.src;
			}
		}
		return details;
	}

	/**
	 * Parse the path of a manifest item
	 * 
	 * @method parsePath
	 * @param {String |
	 *            Object} value
	 * @param {String}
	 *            type
	 * @param {String}
	 *            id
	 * @param {Number |
	 *            String | Boolean | Object} data
	 * @return {Object} A formatted object to load.
	 * @private
	 */
	SoundJS.parsePath = function(value, type, id, data) {
		// Assume value is string.
		var sounds = value.split(SoundJS.DELIMITER);
		var ret = {
			type : type || "sound",
			id : id,
			data : data
		};
		var found = false;
		var c = SoundJS.getCapabilities();
		for (var i = 0, l = sounds.length; i < l; i++) {
			var sound = sounds[i];
			var point = sound.lastIndexOf(".");
			var ext = sound.substr(point + 1).toLowerCase();
			var name = sound.substr(0, point).split("/").pop();
			switch (ext) {
			case "mp3":
				if (c.mp3) {
					found = true
				}
				break;
			case "ogg":
				if (c.ogg) {
					found = true
				}
				break;
			case "wav":
				if (c.wav) {
					found = true;
				}
				break;
			}

			if (found) {
				ret.name = name;
				ret.src = sound;
				ret.extension = ext;
				return ret;
			}
		}
		return null;
	}
	
	/**
	 * Determine if a plugin has been initialized. Optionally initialize the
	 * default plugin, which enables SoundJS to work without manually setting up
	 * the plugins.
	 * 
	 * @method checkPlugin
	 * @param {Boolean}
	 *            initializeDefault Determines if the default plugin should be
	 *            initialized if there is not yet a plugin when this is checked.
	 * @returns If a plugin is initialized. If the browser does not have the
	 *          capabilities to initialize an available plugin, this will be
	 *          false.
	 *          
	 * @private
	 */
	SoundJS.checkPlugin = function(initializeDefault) {
		if (SoundJS.activePlugin == null) {
			SoundJS.registerPlugin(SoundJS.DefaultAudioPlugin);

			if (SoundJS.activePlugin == null) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Get the source of a sound via the ID passed in with the manifest. If no
	 * ID is found the value is passed back.
	 * 
	 * @method getSrcFromId
	 * @param value
	 *            The name or src of a sound.
	 * @return {String} The source of the sound.
	 * @static
	 * 
	 * @private
	 */
	SoundJS.getSrcFromId = function(value) {
		if (SoundJS.idHash[value] == null) {
			return value;
		}
		return SoundJS.idHash[value];
	}
	

	/**
	 * Call a method on all instances. Passing an optional ID will filter the
	 * event to only sounds matching that id (or source).
	 * 
	 * @private
	 */
	SoundJS.tellAllInstances = function(command, id) {
		var instances = window.empiriaSoundJsGetSoundInstances();
		if (this.activePlugin == null) {
			return false;
		}
		var src = this.getSrcFromId(id);
		for (var i = instances.length - 1; i >= 0; i--) {
			var instance = instances[i];
			if (src != null && instance.src != src) {
				continue;
			}
			switch (command) {
			case "pause":
				instance.pause();
				break;
			case "resume":
				instance.resume();
				break;
			case "stop":
				instance.stop();
				break;
			}
		}
		return true;
	}
	
	/**
	 * A function proxy for SoundJS methods. By default, JavaScript methods do
	 * not maintain scope, so passing a method as a callback will result in the
	 * method getting called in the scope of the caller. Using a proxy ensures
	 * that the method gets called in the correct scope. All internal callbacks
	 * in SoundJS use this approach.
	 * 
	 * @method proxy
	 * @param {Function}
	 *            method The function to call
	 * @param {Object}
	 *            scope The scope to call the method name on
	 * @static
	 * @private
	 */
	SoundJS.proxy = function(method, scope) {
		return function() {
			return method.apply(scope, arguments);
		}
	}


	/*
	 * --------------- Public API. ---------------
	 */
	/**
	 * Play a sound, receive an instance to control
	 * 
	 * @method play
	 * @param {String}
	 *            value The src or ID of the audio.
	 * @param {String}
	 *            interrupt How to interrupt other instances of audio. Values
	 *            are defined as constants on SoundJS.
	 * @param {Number}
	 *            delay The amount of time to delay the start of the audio.
	 *            Delay is in milliseconds.
	 * @param {Number}
	 *            offset The point to start the audio. Offset is in
	 *            milliseconds.
	 * @param {Number}
	 *            loop Determines how many times the audio loops when it reaches
	 *            the end of a sound. Default is 0 (no loops). Set to -1 for
	 *            infinite.
	 * @param {Number}
	 *            volume The volume of the sound, between 0 and 1
	 * @param {Number}
	 *            pan The left-right pan of the sound (if supported), between -1
	 *            (left) and 1 (right)
	 * @return {SoundInstance} A SoundInstance that can be controlled after it
	 *         is created.
	 * @static
	 */
	SoundJS.play = function(src, interrupt, delay, offset, loop, volume, pan) {
		src = SoundJS.getSrcFromId(src);
		var instance = SoundJS.activePlugin.create(src);
		SoundJS.playInstance(instance, interrupt, delay, offset, loop, volume,
				pan);
		return instance;
	}

	/**
	 * Play an instance. This is called by the static API, as well as from
	 * plugins. This allows the core class to control delays.
	 * 
	 * @method playInstance
	 * @return {Boolean} If the sound can start playing.
	 * @protected
	 */
	SoundJS.playInstance = function(instance, interrupt, delay, offset, loop,
			volume, pan) {
		instance.beginPlaying(offset, loop, volume, pan);

		return true;
	}

	/**
	 * Pause all instances.
	 * 
	 * @method pause
	 * @param id
	 *            The specific sound ID (set) to target.
	 * @return If the audio was paused or not.
	 * @static
	 */
	SoundJS.pause = function(id) {
		return SoundJS.tellAllInstances("pause", id);
	}

	/**
	 * Resume all instances. Note that the pause/resume methods do not work
	 * independantly of each instance's paused state. If one instance is already
	 * paused when the SoundJS.pause method is called, then it will resume when
	 * this method is called.
	 * 
	 * @method resume
	 * @param id
	 *            The specific sound ID (set) to target.
	 * @return If the audio was resumed or not
	 * @static
	 */
	SoundJS.resume = function(id) {
		return SoundJS.tellAllInstances("resume", id);
	}

	/**
	 * Stop all audio (Global stop).
	 * 
	 * @method stop
	 * @param id
	 *            The specific sound ID (set) to target.
	 * @return If the audio was stopped or not.
	 * @static
	 */
	SoundJS.stop = function(id) {
		return SoundJS.tellAllInstances("stop", id);
	}

	window.SoundJS = SoundJS;

}(window));