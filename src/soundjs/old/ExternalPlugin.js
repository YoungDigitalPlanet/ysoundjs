
/**
 * @module SoundJS
 */
(function(window) {

    /**
     * Play sounds using a Flash instance. This plugin requires swfObject.as
     * as well as the FlashAudioPlugin.swf. Ensure that ExternalPlugin.BASE_PATH
     * is set when using this plugin, so that the script can find the swf.
     * @class ExternalPlugin
     * @constructor
     */
    function ExternalPlugin() {
        this.init();
    }

    /**
     * The capabilities of the plugin.
     * @property capabilities
     * @type Object
     * @default null
     * @static
     */
    ExternalPlugin.capabilities = null;

    /**
     * The path relative to the HTML page that the FlashAudioPlugin.swf resides.
     * If this is not correct, this plugin will not work.
     * @property BASE_PATH
     * @type String
     * @default src/soundjs
     * @static
     */
    ExternalPlugin.BASE_PATH = "src/soundjs";

    // Protected static
    ExternalPlugin.lastId = 0;

    ExternalPlugin.preloadId = 0;

    /**
     * Determine if the plugin can be used.
     * @method isSupported
     * @return {Boolean} If the plugin can be initialized.
     * @static
     */
    ExternalPlugin.isSupported = function() {
       return SoundJS.BrowserDetect.isAdobeAIR && SoundJS.BrowserDetect.isAndroid;
    };

    /**
     * Determine the capabilities of the plugin.
     * @method generateCapabiities
     * @static
     */
    ExternalPlugin.generateCapabilities = function() {
        if (ExternalPlugin.capabilities != null) { return ExternalPlugin.capabilities; }
        var c = ExternalPlugin.capabilities = {
            panning: true,
            volume: true,
            mp3: true,
            ogg: true,
            mpeg: true,
            wav: true,
            channels: 255
        };
        return c;
    };


    var p = ExternalPlugin.prototype = {

        CONTAINER_ID: "flashAudioContainer",
        capabilities: null,

        // ExternalPlugin Specifics
        container: null, // Reference to the DIV containing the Flash Player
        externalContainer: null, // Reference to the externalContainer player instance
        flashReady: false,
        externalPlayerSoundInstances: null, // Hash of flashSoundInstances by Flash ID
        externalPlayerPreloadInstances: null, // Hash of preload instances, by Flash ID
        queuedInstances: null,

        init: function() {
            this.capabilities = ExternalPlugin.generateCapabilities();
            this.externalPlayerSoundInstances = {};
            this.externalPlayerPreloadInstances = {};
            this.queuedInstances = [];
        },

        handleTimeout: function() {
            //TODO: Surface to user?
            //LM: Maybe SoundJS.handleError(error); ???
        },

        /**
         * Pre-register a sound instance when preloading/setup.
         * Note that the ExternalPlugin will return a SoundLoader instance for preloading
         * since Flash can not access the browser cache consistently.
         * @param {String} src The source of the audio
         * @param {Number} instances The number of concurrently playing instances to allow for the channel at any time.
         * @return {Object} A result object, containing a tag for preloading purposes.
         */
        register: function(src, instances) {

            //todo api rafala
           // this.externalContainer.register(src);
            var preloadId = "p" + (ExternalPlugin.preloadId++);
            return new SoundLoader(src, this.externalContainer, this, preloadId);
        },

        /**
         * Create a sound instance.
         * @method create
         * @param {String} src The source to use.
         * @return {SoundInstance} A sound instance for playback and control.
         */
        create: function(src) {
            try {
                var instance = new SoundInstance(src, this.externalContainer);
                instance.owner = this;
                return instance;
            } catch (err) {
                //console.log("Error: Please ensure you have permission to play audio from this location.", err);
            }
            return null;
        },

        registerSoundInstance: function(playerId, instance) {
            this.externalPlayerSoundInstances[playerId] = instance;
        },
        unregisterSoundInstance: function(playerId) {
            delete this.externalPlayerSoundInstances[playerId];
        },

        // Events from Flash pertaining to a specific SoundInstance
        handleSoundEvent: function(playerId, method) {
            var instance = this.externalPlayerSoundInstances[playerId];
            if (instance == null) { return; }
            var args = [];
            for (var i=2, l=arguments.length; i<l; i++) { args.push(arguments[i]); }
            try {
                if (args.length == 0) {
                    instance[method]();
                } else {
                    instance[method].apply(instance, args);
                }
            } catch(error) {}
        },

        // Events from Flash pertaining to general functions
        handleEvent: function(method) {},

        // Events from Flash when an error occurs.
        handleErrorEvent: function(error) {},

        toString: function() {
            return "[ExternalPlugin]";
        }

    }

    window.SoundJS.ExternalPlugin = ExternalPlugin;


    function SoundInstance(src, externalContainer) {
        this.init(src, externalContainer);
    }

    var p = SoundInstance.prototype = {

        /**
         * The source of the sound.
         * @private
         */
        src: null,

        /**
         * The unique ID of the instance
         * @private
         */
        uniqueId: -1,

        capabilities: null,
        externalContainer: null,
        playerId: null, // To communicate with Flash

        loop:0,
        volume:1,
        pan:0,

        /**
         * Determines if the audio is currently muted.
         * @private
         */
        muted: false,

        /**
         * Determines if the audio is currently paused. If the audio has not yet started playing,
         * it will be true, unless the user pauses it.
         * @private
         */
        paused: false,

        /**
         * The callback that is fired when a sound has completed playback
         * @event onComplete
         * @private
         */
        onComplete: null,

        /**
         * The callback that is fired when a sound has completed playback, but has loops remaining.
         * @event onLoop
         * @private
         */
        onLoop: null,

        /**
         * The callback that is fired when a sound is ready to play.
         * @event onReady
         * @private
         */
        onReady: null,

        /**
         * The callback that is fired when a sound has failed to start.
         * @event onPlayFailed
         * @private
         */
        onPlayFailed: null,

        /**
         * The callback that is fired when a sound has been interrupted.
         * @event onPlayInterrupted
         * @private
         */
        onPlayInterrupted: null,

        init: function(src, externalContainer) {
            this.playerId = window.soundJsExternalRegister(src);
            this.src = src;
            this.externalPlayer = window;
        },

        initialize: function(externalContainer) {
            this.externalContainer = externalContainer;
        },

        // Public API

        interrupt: function() {
            this.playState = SoundJS.PLAY_INTERRUPTED;
            if (this.onPlayInterrupted != null) { this.onPlayInterrupted(this); }
            //TODO api od rafala
        //    this.externalContainer.interrupt(this.flashId);
            this.cleanUp();
        },

        cleanUp: function() {
            this.owner.unregisterSoundInstance(this.playerId);
            SoundJS.playFinished(this);
        },

        /**
         * Play an instance. This API is only used to play an instance after it has been stopped
         * or interrupted.
         * @private
         */
        play: function(interrupt, delay, offset, loop, volume, pan) {
            SoundJS.playInstance(this, interrupt, delay, offset, loop, volume, pan);
        },

        beginPlaying: function(offset, loop, volume, pan) {
            this.loop = loop;
            this.paused = false;
            this.externalPlayer.soundJsExternalPlay(this.playerId);
            this.playState = SoundJS.PLAY_SUCCEEDED;
            this.owner.registerSoundInstance(this.playerId, this);
            return true;
        },

        /**
         * Pause the instance.
         * @private
         */
        pause: function() {
            this.paused = true;
            this.externalPlayer.soundJsExternalPause(this.playerId);
        },

        /**
         * Resume a sound instance that has been paused.
         * @private
         */
        resume: function() {
            this.paused = false;
            this.externalPlayer.soundJsExternalResume(this.playerId);
        },

        /**
         * Stop a sound instance.
         * @private
         */
        stop: function() {
            this.playState = SoundJS.PLAY_FINISHED;
            this.paused = false;
            this.externalPlayer.soundJsExternalStop(this.playerId);
            this.cleanUp();
            return true;
        },

        /**
         * Set the volume of the sound instance.
         * @private
         */
        setVolume: function(value) {
            this.volume = value;
           //TODO
        },

        /**
         * Get the volume of the sound, not including how the master volume has affected it.
         * @private
         */
        getVolume: function() {
            return this.volume;
        },

        /**
         * Mute the sound.
         * @private
         */
        mute: function(value) {
            this.muted = value;
            //TODO
        },

        /**
         * Get the pan of a sound instance.
         * @private
         */
        getPan: function() {
            return this.pan;
        },

        /**
         * Set the pan of a sound instance.
         * @private
         */
        setPan: function(value) {
            this.pan = value;
            //TODO
        },

        /**
         * Get the position of the playhead in the sound instance.
         * @private
         */
        getPosition: function() {
            //TODO
            return 0;
        },

        /**
         * Set the position of the playhead in the sound instance.
         * @private
         */
        setPosition: function(value) {
            //TODO
        },

        /**
         * Set the position of the playhead in the sound instance.
         * @private
         */
        getDuration: function() {
            //TODO
        },

        // Flash callbacks
        handleSoundFinished: function() {
            this.playState = SoundJS.PLAY_FINISHED;
            if (this.onComplete != null) { this.onComplete(this); }
            this.cleanUp();
        },

        handleLoop: function() {
            if (this.onLoop != null) { this.onLoop(this); }
        },

        toString: function() {
            return "[ExternalPlugin SoundInstance]"
        }

    }

    function SoundLoader(src, externalContainer, owner, preloadId) {
        this.init(src, externalContainer, owner, preloadId);
    }

    SoundLoader.prototype = {

        externalContainer:null,
        src: null,
        tag: null,
        playerId: null,
        progress: 1,
        readyState: 4,
        loading: false,

        preloadId: null,

        owner: null,

        // Calbacks
        /**
         * The callback that fires when the load completes. This follows HTML tag naming.
         * @event onloaded
         * @private
         */
        onload: null,

        /**
         * The callback that fires as the load progresses. This follows HTML tag naming.
         * @event onprogress
         * @private
         */
        onprogress: null,

        /**
         * The callback that fires if the load hits an error.
         * @event onerror
         * @private
         */
        onError: null,

        // The loader has been created.
        init: function(src, externalContainer, owner, preloadId) {
            this.src = src;
            this.externalContainer = externalContainer;
            this.owner = owner;
            this.preloadId = preloadId;
            this.tag = this;
        },

        initialize: function(externalContainer) {
        },

        /**
         * Start loading.
         * @param {String} src The path to the sound.
         * @return {Boolean} If the load was started. If Flash has not been initialized, the load will fail.
         * @private
         */
        load: function(src) {
           return false;
        },

        handleProgress: function(loaded, total) {
            this.progress = loaded / total;
            if (this.onprogress == null) { return; }
            this.onprogress({loaded:loaded, total:total, progress:this.progress});
        },

        handleComplete: function() {
            this.progress = 1;
            this.readyState = 4;
            if (this.onload == null) { return; }

            this.onload();
        },

        handleError: function(error) {
            if (this.onerror == null) { return; }
            this.onerror(error);
        },

        toString: function() {
            return "[ExternalPlugin SoundLoader]";
        }


    }

}(window))