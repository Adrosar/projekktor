/*
 * this file is part of:
 * projekktor zwei
 * http://www.projekktor.com
 *
 * Copyright 2010, 2011, Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com
 * under GNU General Public License
 * http://www.filenew.org/projekktor/license/
 */
var playerModel = function () {};
jQuery(function ($) {
    playerModel.prototype = {

        modelId: 'player',
        iLove: [],

        // all the player states
        _currentState: null,
        _currentBufferState: null,
        _currentSeekState: null,        

        _ap: false, // autoplay
        _volume: 0, // async
        _quality: 'default',

        _displayReady: false,
        _isPlaying: false,
        _isReady: false,

        _id: null,

        // experimental
        _KbPerSec: 0,
        _bandWidthTimer: null,

        // flags
        _isPoster: false,
        _isFullscreen: false,

        hasGUI: false,
        allowRandomSeek: false,

        flashVerifyMethod: 'api_get',
        mediaElement: null,

        pp: {},

        media: {
            duration: 0,
            position: 0,
            maxpos: 0,
            offset: 0,
            file: false,
            poster: '',
            ended: false,
            loadProgress: 0,
            errorCode: 0
        },

        /*******************************
         *        CORE
         *******************************/
        _init: function (params) {
            this.pp = params.pp || null;
            this.media = $.extend(true, {}, this.media, params.media);
            this.mediaId = params.media.ID;
            this._ap = params.autoplay;
            this._isFullscreen = params.fullscreen;
            this._id = $p.utils.randomId(8);
            this._quality = params.quality || this._quality;
            this._volume = this.pp.getVolume();
            this._playbackQuality = this.pp.getPlaybackQuality();
            this.init();
        },

        init: function (params) {
            this.ready();
        },

        ready: function () {
            this.sendUpdate('modelReady');
            this._isReady = true;
            if (this._ap) {
                this.sendUpdate('autostart', true);
                this._setState('awakening');
            } else {
                this.displayItem(false);
            }
        },

        /* apply poster while sleeping or get ready for true multi media action */
        displayItem: function (showMedia) {
            // reset
            this._displayReady = false;
            this._isPoster = false;

            this.pp.removeListener('fullscreen.poster');
            this.pp.removeListener('resize.poster');

            // poster 
            if (showMedia !== true || this.getState('STOPPED')) {
                this._setState('idle');
                this.applyImage(this.getPoster(), this.pp.getMediaContainer().html(''));
                this._isPoster = true;
                this.displayReady();
                return;
            }

            // media
            $('#' + this.pp.getMediaId() + "_image").remove();
            // apply media
            this.applyMedia(this.pp.getMediaContainer());
        },

        applyMedia: function () {},

        sendUpdate: function (type, value) {
            // type = type.toLowerCase();
            this.pp._modelUpdateListener(type, value);
            if (type=='error') {
                this.removeListeners();
                this.detachMedia();                            
                this._setState('error');
            }
        },

        /* wait for the playback element to initialize */
        displayReady: function () {
            this._displayReady = true;
            this.pp._modelUpdateListener('displayReady');
        },

        start: function () {
            var ref = this;
            if (this.mediaElement == null && this.modelId != 'PLAYLIST') return;
            if (this.getState('STARTING')) return;

            this._setState('STARTING');

            if (!this.getState('STOPPED')) {
                this.addListeners();
            }

            if (this.pp.getIsMobileClient('ANDROID') && !this.getState('PLAYING')) {
                setTimeout(function () {
                   ref.setPlay();
                }, 50);
            }
            this.setPlay();
        },

        addListeners: function () {},

        removeListeners: function () {
            try {
                this.mediaElement.unbind('.projekktor' + this.pp.getId());
            } catch (e) {}
        },

        detachMedia: function () {},

        destroy: function (silent) {
            
            this.removeListeners();

            if (!this.getState('IDLE'))
                this._setState('destroying');

            this.detachMedia();

            try {
                $('#' + this.mediaElement.id).empty();
            } catch (e) {}
            if (!this.pp.getIsMobileClient()) {
                try {
                    $('#' + this.mediaElement.id).remove();
                } catch (e) {}
                try {
                    this.mediaElement.remove();
                } catch (e) {}
                this.pp.getMediaContainer().html('');
            }
            this.mediaElement = null;

            this.media.loadProgress = 0;
            this.media.playProgress = 0;
            this.media.frame = 0;
            this.media.position = 0;
            this.media.duration = 0;
        },

        /* firefox reinit-issue-workaround-helper-thingy */
        reInit: function () {
            // no FF:
            if (this.flashVersion !== false || !this._isFF() || this.getState('ERROR') || this.pp.getConfig('bypassFlashFFFix') === true) {
                return;
            }

            // elsewise nuke:
            this.sendUpdate('FFreinit');
            this.removeListeners();
            this.displayItem((!this.getState('IDLE')));
        },

        applyCommand: function (command, value) {
            switch (command) {
                case 'quality':
                    this.setQuality(value);
                    break;
                case 'error':
                    this._setState('error');
                    this.pp._modelUpdateListener('error', value);
                    break;
                case 'play':
                    if (this.getState('ERROR')) break;
                    if (this.getState('IDLE')) {
                        this._setState('awakening');
                        break;
                    }
                    this.setPlay();
                    break;
                case 'pause':
                    if (this.getState('ERROR')) break;
                    this.setPause();
                    break;
                case 'volume':
                    if (this.getState('ERROR')) break;
                    if (!this.setVolume(value)) {
                        this._volume = value;
                        this.sendUpdate('volume', value);
                    }
                    break;
                case 'stop':
                    this.setStop();
                    break;
                case 'frame':
                    this.setFrame(value);
                    break;
                case 'seek':
                    if (this.getState('ERROR')) break;
                    if (this.getSeekState('SEEKING')) break;
                    if (this.getState('IDLE')) break;
                    if (this.media.loadProgress == -1) break;                   
                    this._setSeekState('seeking', value);               
                    this.setSeek(value);
                    break;
                case 'fullscreen':
                    /* 
                    * It is vital to first tell the controller what happened in order to have an already altered DOM
                    * before processing further scaling processes.
                    * This is a break in the logic but seems to work.
                    */                    
                    if (value != this._isFullscreen) {
                        this._isFullscreen = value;                    
                        this.sendUpdate('fullscreen', this._isFullscreen);
                        this.reInit();
                        this.setFullscreen();
                    }                    
                    break;
                case 'resize':
                    this.setResize();
                    this.sendUpdate('resize', value);
                    break;
            }
        },

        /*******************************
         *   PUBLIC ELEMENT SETTERS
         *******************************/
        setFrame: function (frame) {
            var newPos = (frame / this.pp.getConfig('fps')) + 0.00001;
            this.setSeek(newPos);
        },

        setSeek: function (newpos) {},

        setPlay: function () {},

        setPause: function () {},

        setStop: function () {
            this.detachMedia();
            this._setState('stopped');
            // this._ap=false;
            this.displayItem(false);
            
        },

        setVolume: function (volume) {},

        setFullscreen: function(inFullscreen) {
            if (this.element=='audio') return;
            this._scaleVideo();
        }, 

        setResize: function() {
            if (this.element=='audio') return;
            this._scaleVideo(false);
        },

        /*
        setResize: function () {
            var destContainer = this.pp.getMediaContainer();
            this.sendUpdate('scaled', {
                realWidth: this.media.videoWidth || null,
                realHeight: this.media.videoHeight || null,
                displayWidth: destContainer.width(),
                displayHeight: destContainer.height()
            });
        },
*/
        setPosterLive: function () {},

        setQuality: function (quality) {
            if (this._quality == quality) return;
            this._quality = quality;
            
            try {this.applySrc();} catch(e){}

            this.qualityChangeListener();
        },

        /*******************************
            ELEMENT GETTERS 
        *******************************/
        getId: function() {
            return this.mediaId;    
        },
        
        getQuality: function () {
            return this._quality;
        },
        
        getVolume: function () {
            if (this.mediaElement==null) {
                return this._volume;
            }

            return (this.mediaElement.prop('muted')===true) ? 0 : this.mediaElement.prop('volume');
        },

        getLoadProgress: function () {
            return this.media.loadProgress || 0;
        },

        getLoadPlaybackProgress: function () {
            return this.media.playProgress || 0;
        },

        getPosition: function () {
            return this.media.position || 0;
        },

        getFrame: function () {
            return this.media.frame || 0;
        },

        getDuration: function () {
            return this.media.duration || this.pp.getConfig('duration') || 0;
        },

        getMaxPosition: function () {
            return this.media.maxpos || 0;
        },

        getPlaybackQuality: function () {
            return ($.inArray(this._quality, this.media.qualities) > -1) ? this._quality : 'default';
        },

        getInFullscreen: function () {
            return this.pp.getInFullscreen();
        },

        getKbPerSec: function () {
            return this._KbPerSec;
        },

        getState: function (isThis) {
            var result = (this._currentState == null) ? 'IDLE' : this._currentState;
            if (isThis != null) return (result == isThis.toUpperCase());
            return result;
        },
        
        getBufferState: function (isThis) {
            var result = (this._currentBufferState == null) ? 'NONE' : this._currentBufferState;
            if (isThis != null) return (result == isThis.toUpperCase());
            return result;
        },
        
        getSeekState: function (isThis) {
            var result = (this._currentSeekState == null) ? 'NONE' : this._currentSeekState;
            if (isThis != null) return (result == isThis.toUpperCase());
            return result;
        },          

        getSrc: function () {
            try {
                return this.mediaElement.get(0).currentSrc;
            } catch (e) {}
            try {
                return this.media.file[0].src;
            } catch (e) {}
            try {
                return this.getPoster();
            } catch (e) {}
            return null;
        },

        getModelName: function () {
            return this.modelId || null;
        },

        getHasGUI: function () {
            return (this.hasGUI && !this._isPoster);
        },

        getIsReady: function () {
            return this._isReady;
        },

        getPoster: function () {      
            var type = 'poster', 
                result = null,
                cfg = this.pp.getConfig(type),
                qual = 'default',
                quals = [];

            if (typeof cfg != 'object')
                return cfg;

            for (var i in cfg) {
                if (cfg[i].quality) {
                    quals.push(cfg[i].quality);
                }
            }

            qual = this.pp.getAppropriateQuality(quals);
          
            for (var j in cfg) {            
                if (cfg[j].src != undefined && (cfg[j].quality == qual || result == "" || qual == "default"))  {
                    result = cfg[j].src;                  
                }
            }
            return result;
        },

        getMediaElement: function () {
            return this.mediaElement || $('<video/>');
        },

        getMediaDimensions: function () {
            return {
                width: this.media.videoWidth || 0,
                height: this.media.videoHeight || 0
            };
        },

        getSource: function () {

            var resultSrc = [],
                offset = this.media.offset || this.media.position || false,
                ref = this,
                pseudoQuery = (this.pp.getConfig('streamType') == 'pseudo') ? this.pp.getConfig('startParameter') : false;

            $.each(this.media.file || [], function () {

                // set proper quality source
                if (ref._quality!=this.quality && ref._quality!==null)
                    return true;

                // nothing todo 
                if (!pseudoQuery || !offset) {
                    resultSrc.push(this);
                    return true;
                }

                // add offset_GET-parameter
                var u = $p.utils.parseUri(this.src),
                    src = u.protocol + '://' + u.host + u.path,
                    query = [];

                $.each(u.queryKey, function (key, value) {
                    if (key != pseudoQuery) {
                        query.push(key + "=" + value);
                    }
                });

                src += (query.length > 0) ? '?' + query.join('&') + "&" + pseudoQuery + "=" + offset : "?" + pseudoQuery + "=" + offset;
                this.src = src;

                resultSrc.push(this);
                return true;
            });

            if (resultSrc.length === 0)
                return this.media.file;
            else
                return resultSrc;
        },        

        /*******************************
         *      ELEMENT LISTENERS
         *******************************/
        timeListener: function (obj) {
            if (obj == null) return;            

            var position = parseFloat((obj.position || obj.currentTime || this.media.position || 0).toFixed(2)),
                duration = parseFloat((obj.duration || 0).toFixed(2));

            // bypass strange IE flash bug	
            if (isNaN(duration + position)) return;

            // duration has changed:	
            if (duration != 0 && (duration != this.media.duration && !this.isPseudoStream) || (this.isPseudoStream && this.media.duration == 0)) {

                this.media.duration = duration;
                this.sendUpdate('durationChange', duration);
            }
      
            // remember values & concider pseudo stream position offset, bypass some strange position hopping effects during pseudostream:
            if (position==this.media.position) return;
            
            if (this.isPseudoStream && Math.round(position * 100) / 100==Math.round(this.media.offset * 100) / 100) {
                this.media.position = this.media.offset;                
            } else {              
                this.media.position = this.media.offset + position;
            }
           
            this.media.maxpos = Math.max(this.media.maxpos || 0, this.media.position || 0);
            this.media.playProgress = parseFloat((this.media.position > 0 && this.media.duration > 0) ? this.media.position * 100 / this.media.duration : 0);
            this.media.frame = this.media.position * this.pp.getConfig('fps');
      
            this.sendUpdate('time', this.media.position);
            
            this.loadProgressUpdate();
        },

        loadProgressUpdate: function () {

            var me = this.mediaElement.get(0),
                progress = 0;
          
            if (this.media.duration===0) return;
            if (typeof me.buffered!=='object') return;
            if (me.buffered.length===0 &&  me.seekable.length===0) return;
            if (this.media.loadProgress==100) return;

            if (me.seekable && me.seekable.length > 0) {
                progress = Math.round(me.seekable.end(0) * 100 / this.media.duration);
            } else {
                progress = Math.round(me.buffered.end(me.buffered.length - 1) * 100) / this.media.duration;
            }

            if (this.media.loadProgress > progress) return;

            this.media.loadProgress = (this.allowRandomSeek === true) ? 100 : -1;
            this.media.loadProgress = (this.media.loadProgress < 100 || this.media.loadProgress === undefined) ? progress : 100;

            this.sendUpdate('progress', this.media.loadProgress);

        },

        progressListener: function (obj, evt) {

            // we prefer timeranges but keep catching "progress" events by default
            // for historical and compatibility reasons:	
            if (this.mediaElement instanceof jQuery) { // fix this - make sure all instances are jquery objects
                if (typeof this.mediaElement.get(0).buffered == 'object') {
                    if (this.mediaElement.get(0).buffered.length > 0) {
                        this.mediaElement.unbind('progress');
                        return;
                    }
                }
            }

            if (this._bandWidthTimer == null) {
                this._bandWidthTimer = (new Date()).getTime();
            }

            var current = 0,
                total = 0;

            try {
                if (!isNaN(evt.loaded / evt.total)) {
                    current = evt.loaded;
                    total = evt.total;
                } else if (evt.originalEvent && !isNaN(evt.originalEvent.loaded / evt.originalEvent.total)) {
                    current = evt.originalEvent.loaded;
                    total = evt.originalEvent.total;
                }
            } catch (e) {
                if (obj && !isNaN(obj.loaded / obj.total)) {
                    current = obj.loaded;
                    total = obj.total;
                }
            }

            var loadedPercent = (current > 0 && total > 0) ? current * 100 / total : 0;

            if (Math.round(loadedPercent) > Math.round(this.media.loadProgress)) {
                this._KbPerSec = ((current / 1024) / (((new Date()).getTime() - this._bandWidthTimer) / 1000));
            }

            loadedPercent = (this.media.loadProgress !== 100) ? loadedPercent : 100;
            loadedPercent = (this.allowRandomSeek === true) ? 100 : 5 * Math.round(loadedPercent / 5);

            if (this.media.loadProgress != loadedPercent) {
                this.media.loadProgress = loadedPercent;
                this.sendUpdate('progress', loadedPercent);
            }

            // Mac flash fix:
            if (this.media.loadProgress >= 100 && this.allowRandomSeek === false) {
                this._setBufferState('full');
            }
        },

        qualityChangeListener: function () {
            this.sendUpdate('qualityChange', this._quality);
        },

        endedListener: function (obj) {
            if (this.mediaElement === null) return;
            if (this.media.maxpos <= 0) return;
            if (this.getState() == 'STARTING') return;
            this._setState('completed');
        },

        waitingListener: function (event) {
            this._setBufferState('empty');
        },

        canplayListener: function (obj) {
            this._setBufferState('full');
        },

        canplaythroughListener: function (obj) {
            this._setBufferState('full');
        },

        suspendListener: function (obj) {
            this._setBufferState('full'); // hmmmm...
        },

        playingListener: function (obj) {
            this._setState('playing');
        },

        startListener: function (obj) {
            this.applyCommand('volume', this.pp.getConfig('volume'));
            if (!this.isPseudoStream) {
                this.setSeek(this.media.position || 0);
            }

            this._setState('playing');
        },

        pauseListener: function (obj) {
            this._setState('paused');
        },

        seekedListener: function (value) {          
            this._setSeekState('SEEKED', value || this.media.position);
        },

        volumeListener: function (obj) {
            this.sendUpdate('volume', this.getVolume());
        },

        flashReadyListener: function () {
            this._displayReady = true;
        },

        errorListener: function (event, obj) {},

        metaDataListener: function (obj) {
            try {
                this.media.videoWidth = obj.videoWidth;
                this.media.videoHeight = obj.videoHeight;
            } catch (e) {}
            this._scaleVideo();
        },

        applySrc: function () {},
        
        applyImage: function (url, destObj) {

            var imageObj = $('<img/>').hide(),
                currentImageObj = $("." + this.pp.getMediaId() + "_image"); // select by class to workaround timing issues causing multiple <img> of the same ID being present in the DOM
                ref = this;

            $p.utils.blockSelection(imageObj);
                       
            // empty URL... apply placeholder
            if (url == null || url === false) {
                currentImageObj.remove();
                return $('<img/>').attr({
                    "id": this.pp.getMediaId() + "_image",
                    "src": $p.utils.imageDummy()
                }).appendTo(destObj);
            }

            // no changes
            if ($(currentImageObj[0]).attr('src')==url) {
                if ($p.utils.stretch(ref.pp.getConfig('imageScaling'), $(currentImageObj[0]), destObj.width(), destObj.height())) {
                    try {
                        ref.sendUpdate('scaled', {
                            realWidth: currentImageObj._originalDimensions.width,
                            realHeight: currentImageObj._originalDimensions.height,
                            displayWidth: ref.mediaElement.width(),
                            displayHeight: ref.mediaElement.height()
                        });
                    } catch (e) {}
                }
                return $(currentImageObj[0]);
            }

            imageObj.load(function (event) {
                var target = $(event.currentTarget);

                if (!imageObj.attr("data-od-width")) imageObj.attr("data-od-width", target.naturalWidth);
                if (!imageObj.attr("data-od-height")) imageObj.attr("data-od-height", target.naturalHeight);
                
                currentImageObj.remove();
                
                imageObj.attr('id', ref.pp.getMediaId() + "_image");
                imageObj.show();

                if ($p.utils.stretch(ref.pp.getConfig('imageScaling'), target, destObj.width(), destObj.height())) {
                    try {
                        ref.sendUpdate('scaled', {
                            realWidth: imgObj._originalDimensions.width,
                            realHeight: imgObj._originalDimensions.height,
                            displayWidth: ref.mediaElement.width(),
                            displayHeight: ref.mediaElement.height()
                        });
                    } catch (e) {}
                }
            });

            imageObj.removeData('od');
            
            this.pp.removeListener('fullscreen.poster');
            this.pp.removeListener('resize.poster');

            this.pp.addListener('fullscreen.poster', function () {
                ref.applyImage(ref.getPoster(), destObj);  
            });
            
            this.pp.addListener('resize.poster', function () {
                ref.applyImage(ref.getPoster(), destObj);  
            });            
            
            imageObj.appendTo(destObj).attr({
                "alt": this.pp.getConfig('title') || ''
            }).css({
                position: 'absolute'
            }).addClass(this.pp.getMediaId() + "_image");            
            
            // IE<9 trap:
            imageObj.attr('src', url);

            imageObj.error(function (event) {
                $(this).remove();
                currentImageObj.show();
            });
            
            return imageObj;
        },



        /* X-Browser flash embedd mess */
        createFlash: function (domOptions, destObj, shield) {
            this.mediaElement = $p.utils.embeddFlash(destObj.html(''), domOptions, shield, true);
            this._waitforPlayer();
        },

        /* we have to wait for the flash components to load and initialize */
        _waitforPlayer: function () {
            var ref = this,
                counter = 0;
                
            if (this._displayReady === true) {
                return;
            }

            this._setBufferState('empty');

            (function () {

                // this is the most fucked up FF bug sh*t ever:
                if (counter > 6 && ref._isFF()) {
                    counter = 0;
                    var dest = $(ref.mediaElement).parent(),
                        clone = $(ref.mediaElement).clone();
                    dest.html('').append(clone);
                    ref.mediaElement = clone;
                }

                dest = ref.mediaElement;
    
                if (ref.getState('ERROR')) {
                    return;
                }

                counter++;
                try {

                    if (dest === undefined) {
                        setTimeout(arguments.callee, 200);
                    } else if (dest.get(0)[ref.flashVerifyMethod] === undefined) {
                        setTimeout(arguments.callee, 200);
                    } else {
                        ref._setBufferState('full');
                        ref.flashReadyListener();
                        $('#' + $(ref.mediaElement).attr('id') + "_cc").css({
                            width: '100%',
                            height: '100%'
                        });
                    }

                } catch (e) {
                    setTimeout(arguments.callee, 200);
                }

            })();
        },

        _setState: function (state) {
            var ref = this;
                state = state.toUpperCase(),
                old = this._currentState;

            this._currentState = state.toUpperCase();                

            if (old != state && old != 'ERROR') {
                if (old == 'PAUSED' && state == 'PLAYING') {
                    this.sendUpdate('resume', this.media);
                    this._isPlaying = true;
                }

                if ((old== 'IDLE' || old == 'STARTING') && state == 'PLAYING') {                
                    this.sendUpdate('start', this.media);
                    this._isPlaying = true;
                }

                if (state == 'PAUSED')
                    this._isPlaying = false;

                if (state == 'ERROR') {
                    this.setPlay = this.setPause = function () {
                        ref.sendUpdate('start');
                    };
                }

                this.sendUpdate('state', this._currentState);
            }
        },

        _setBufferState: function (state) {
            if (this._currentBufferState != state.toUpperCase()) {
                this._currentBufferState = state.toUpperCase();
                this.sendUpdate('buffer', this._currentBufferState);
            }
        },
        
        _setSeekState: function (state, value) {
            if (this._currentSeekState != state.toUpperCase()) {
                this._currentSeekState = state.toUpperCase();
                this.sendUpdate('seek', this._currentSeekState, value);
            }
        },        

        _scaleVideo: function (promote) {
            var destContainer = this.pp.getMediaContainer();

            if (this.pp.getIsMobileClient()) return;
        
            try {
                var wid = destContainer.width(),
                    hei = destContainer.height(),
                    tw = this.media.videoWidth,
                    th = this.media.videoHeight;

                if (!this.mediaElement.attr("data-od-width")) this.mediaElement.attr("data-od-width", this.media.videoWidth);
    		if (!this.mediaElement.attr("data-od-height")) this.mediaElement.attr("data-od-height", this.media.videoHeight);                    

                // if ($p.utils.stretch(ref.pp.getConfig('imageScaling'), imageObj, destObj.width(), destObj.height())) {
                if ($p.utils.stretch(this.pp.getConfig('videoScaling'), this.mediaElement, wid, hei)) {
                    this.sendUpdate('scaled', {
                        realWidth: tw,
                        realHeight: th,
                        displayWidth: wid,
                        displayHeight: hei
                    });
                }
            } catch (e) {}
        },

        _isFF: function () {
            return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        }
    };
});