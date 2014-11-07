(function(window) {
	
	function DefaultAudioPlugin() {
		this.init();
	}

	DefaultAudioPlugin.capabilities = {
		mp3 : true,
		ogg : true,
		mpeg : true,
		wav : true
	};

	DefaultAudioPlugin.isSupported = function() {
		return true;
	};

	var p = DefaultAudioPlugin.prototype = {

		capabilities : null,

		init : function() {
			this.capabilities = DefaultAudioPlugin.capabilities;
		},

		register : function(src, instances) {
			var soundInstance = new SoundInstance(src);
			window.empiriaSoundJsInit(soundInstance, src);
			return soundInstance;
		},

		create : function(src) {
			return window.empiriaSoundJsGetSoundInstance(src);
		},

		toString : function() {
			return "[DefaultAudioPlugin]";
		}

	}

	window.SoundJS.DefaultAudioPlugin = DefaultAudioPlugin;

	function SoundInstance(src) {
		this.init(src);
	}

	var p = SoundInstance.prototype = {

		src : null,

		onComplete : null,

		init : function(src) {
			this.src = src;
		},

		/*
		 * --------------- Public API. ---------------
		 */
		play : function(interrupt, delay, offset, loop, volume, pan) {
			var src = this.src;
			
			if(offset == null) offset = 0;
			if(delay == null) delay = 0;
			if(loop == null) loop = 0;
			
			this.setPosition(offset);
			
			setTimeout(function() {
				if (loop != 0) {
					window.empiriaSoundJsPlayLooped(src);
				} else {
					window.empiriaSoundJsPlay(src);
				}
			}, delay);

		},

		pause : function() {
			window.empiriaSoundJsPause(this.src);
			return true;
		},

		resume : function() {
			window.empiriaSoundJsResume(this.src);
			return true;
		},

		stop : function() {
			window.empiriaSoundJsStop(this.src);
		},

		getPosition : function() {
			var time = window.empiriaSoundJsGetCurrentTime(this.src);
			time = time * 1000;

			return time;
		},

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