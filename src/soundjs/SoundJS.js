(function(window) {

	function SoundJS() {
		throw "SoundJS cannot be instantiated";
	}

	SoundJS.DELIMITER = "|";

	SoundJS.activePlugin = null;

	SoundJS.idHash = {};

	SoundJS.registerPlugins = function(plugins) {
		for (var i = 0, l = plugins.length; i < l; i++) {
			var plugin = plugins[i];
			if (plugin == null) {
				continue;
			} 
			if (plugin.isSupported()) {
				SoundJS.activePlugin = new plugin();
				return true;
			}
		}
		return false;
	}

	SoundJS.registerPlugin = function(plugin) {
		if (plugin.isSupported()) {
			SoundJS.activePlugin = new plugin();
			return true;
		}
		return false;
	}

	SoundJS.isReady = function() {
		return (SoundJS.activePlugin != null);
	}

	SoundJS.getCapabilities = function() {
		return SoundJS.activePlugin ? SoundJS.activePlugin.capabilities : null;
	}

	SoundJS.getCapability = function(key) {
		if (SoundJS.activePlugin == null) {
			return null;
		}
		return SoundJS.activePlugin.capabilities[key];
	}

	SoundJS.getPreloadHandlers = function() {
		return {
			callback : SoundJS.proxy(SoundJS.initLoad, SoundJS),
			types : [ "sound" ],
			extensions : [ "mp3", "ogg", "wav" ]
		}
	}

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

	SoundJS.checkPlugin = function(initializeDefault) {
		if (SoundJS.activePlugin == null) {
			SoundJS.registerPlugin(SoundJS.DefaultAudioPlugin);

			if (SoundJS.activePlugin == null) {
				return false;
			}
		}
		return true;
	}

	SoundJS.getSrcFromId = function(value) {
		if (SoundJS.idHash[value] == null) {
			return value;
		}
		return SoundJS.idHash[value];
	}

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

	SoundJS.proxy = function(method, scope) {
		return function() {
			return method.apply(scope, arguments);
		}
	}

	/*
	 * --------------- Public API. ---------------
	 */
	SoundJS.play = function(srcOrId, interrupt, delay, offset, loop) {
		var src = SoundJS.getSrcFromId(srcOrId);

		var instance = SoundJS.activePlugin.create(src);

		instance.play(null, delay, offset, loop);
		return instance;
	}

	SoundJS.pause = function(id) {
		return SoundJS.tellAllInstances("pause", id);
	}

	SoundJS.resume = function(id) {
		return SoundJS.tellAllInstances("resume", id);
	}

	SoundJS.stop = function(id) {
		return SoundJS.tellAllInstances("stop", id);
	}

	window.SoundJS = SoundJS;

}(window));