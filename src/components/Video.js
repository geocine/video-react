import PropTypes from 'prop-types';
import React, { Component } from 'react';
import classNames from 'classnames';

import { isVideoChild, mediaProperties, throttle } from '../utils';

const propTypes = {
  actions: PropTypes.object,
  player: PropTypes.object,
  children: PropTypes.any,
  startTime: PropTypes.number,
  loop: PropTypes.bool,
  muted: PropTypes.bool,
  autoPlay: PropTypes.bool,
  playsInline: PropTypes.bool,
  src: PropTypes.string,
  poster: PropTypes.string,
  className: PropTypes.string,
  preload: PropTypes.oneOf(['auto', 'metadata', 'none']),
  crossOrigin: PropTypes.string,
  createBlob: PropTypes.bool,
  showLogs: PropTypes.bool,

  onLoadStart: PropTypes.func,
  onWaiting: PropTypes.func,
  onCanPlay: PropTypes.func,
  onCanPlayThrough: PropTypes.func,
  onPlaying: PropTypes.func,
  onEnded: PropTypes.func,
  onSeeking: PropTypes.func,
  onSeeked: PropTypes.func,
  onPlay: PropTypes.func,
  onPause: PropTypes.func,
  onProgress: PropTypes.func,
  onDurationChange: PropTypes.func,
  onError: PropTypes.func,
  onSuspend: PropTypes.func,
  onAbort: PropTypes.func,
  onEmptied: PropTypes.func,
  onStalled: PropTypes.func,
  onLoadedMetadata: PropTypes.func,
  onLoadedData: PropTypes.func,
  onTimeUpdate: PropTypes.func,
  onRateChange: PropTypes.func,
  onVolumeChange: PropTypes.func,
  onResize: PropTypes.func
};

export default class Video extends Component {
  constructor(props) {
    super(props);

    this.video = null; // the html5 video
    this.originalSrc = null; // track original source URL
    this.blobUrl = null; // track blob URL if created
    this.processedSrc = null; // track the processed source URL that should be used by video element

    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);
    this.seek = this.seek.bind(this);
    this.forward = this.forward.bind(this);
    this.replay = this.replay.bind(this);
    this.toggleFullscreen = this.toggleFullscreen.bind(this);
    this.getProperties = this.getProperties.bind(this);
    this.renderChildren = this.renderChildren.bind(this);
    this.handleLoadStart = this.handleLoadStart.bind(this);
    this.handleCanPlay = this.handleCanPlay.bind(this);
    this.handleCanPlayThrough = this.handleCanPlayThrough.bind(this);
    this.handlePlay = this.handlePlay.bind(this);
    this.handlePlaying = this.handlePlaying.bind(this);
    this.handlePause = this.handlePause.bind(this);
    this.handleEnded = this.handleEnded.bind(this);
    this.handleWaiting = this.handleWaiting.bind(this);
    this.handleSeeking = this.handleSeeking.bind(this);
    this.handleSeeked = this.handleSeeked.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleSuspend = this.handleSuspend.bind(this);
    this.handleAbort = this.handleAbort.bind(this);
    this.handleEmptied = this.handleEmptied.bind(this);
    this.handleStalled = this.handleStalled.bind(this);
    this.handleLoadedMetaData = this.handleLoadedMetaData.bind(this);
    this.handleLoadedData = this.handleLoadedData.bind(this);
    this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
    this.handleRateChange = this.handleRateChange.bind(this);
    this.handleVolumeChange = this.handleVolumeChange.bind(this);
    this.handleDurationChange = this.handleDurationChange.bind(this);
    this.handleProgress = throttle(this.handleProgress.bind(this), 250);
    this.handleKeypress = this.handleKeypress.bind(this);
    this.handleTextTrackChange = this.handleTextTrackChange.bind(this);
  }

  componentDidMount() {
    this.forceUpdate(); // make sure the children can get the video property
    if (this.video && this.video.textTracks) {
      this.video.textTracks.onaddtrack = this.handleTextTrackChange;
      this.video.textTracks.onremovetrack = this.handleTextTrackChange;
    }

    // Only process source URL if createBlob is enabled
    if (this.props.src && this.props.createBlob) {
      this.originalSrc = this.props.src;
      // Process the source URL through blob creation
      this.processSourceUrl(this.props.src);
    } else if (this.props.src && this.props.autoPlay) {
      // If createBlob is false but autoplay is enabled, try to play after a short delay
      this.log(
        'Video.componentDidMount() - createBlob disabled, autoplay enabled, attempting to play'
      );
      setTimeout(() => {
        this.play();
      }, 100);
    }
  }

  componentDidUpdate(prevProps) {
    // Only clean up blob and create new one if src prop actually changes and createBlob is enabled
    if (
      this.props.src !== prevProps.src &&
      this.props.src &&
      this.props.createBlob
    ) {
      this.log(
        'Video.componentDidUpdate() - Source changed, cleaning up old blob'
      );
      this.originalSrc = this.props.src;
      // Clean up any existing blob since we have a new source
      this.cleanupBlob();
      // Process the new source URL through blob creation
      this.processSourceUrl(this.props.src);
    } else if (
      this.props.src !== prevProps.src &&
      this.props.src &&
      this.props.autoPlay &&
      !this.props.createBlob
    ) {
      // If createBlob is false but autoplay is enabled and src changed, try to play after a short delay
      this.log(
        'Video.componentDidUpdate() - createBlob disabled, autoplay enabled, src changed, attempting to play'
      );
      setTimeout(() => {
        this.play();
      }, 100);
    }
  }

  componentWillUnmount() {
    // Clean up blob when component unmounts
    this.cleanupBlob();
  }

  // get all video properties
  getProperties() {
    if (!this.video) {
      return null;
    }

    return mediaProperties.reduce((properties, key) => {
      properties[key] = this.video[key];
      return properties;
    }, {});
  }

  // get playback rate
  get playbackRate() {
    return this.video.playbackRate;
  }

  // set playback rate
  // speed of video
  set playbackRate(rate) {
    this.video.playbackRate = rate;
  }

  get muted() {
    return this.video.muted;
  }

  set muted(val) {
    this.video.muted = val;
  }

  get volume() {
    return this.video.volume;
  }

  set volume(val) {
    if (val > 1) {
      val = 1;
    }
    if (val < 0) {
      val = 0;
    }
    this.video.volume = val;
  }

  // video width
  get videoWidth() {
    return this.video.videoWidth;
  }

  // video height
  get videoHeight() {
    return this.video.videoHeight;
  }

  // Helper methods for conditional logging
  log(...args) {
    if (this.props.showLogs) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  }

  warn(...args) {
    if (this.props.showLogs) {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  }

  error(...args) {
    if (this.props.showLogs) {
      // eslint-disable-next-line no-console
      console.error(...args);
    }
  }

  handleTextTrackChange() {
    const { actions, player } = this.props;
    if (this.video && this.video.textTracks) {
      const activeTextTrack = Array.from(this.video.textTracks).find(
        textTrack => textTrack.mode === 'showing'
      );
      if (activeTextTrack !== player.activeTextTrack) {
        actions.activateTextTrack(activeTextTrack);
      }
    }
  }

  // play the video
  play() {
    // Since we now process URLs through blob creation before they reach the video element,
    // we can play directly without worrying about blob state
    this.log('Video.play() - Playing video');
    const promise = this.video.play();
    if (promise !== undefined) {
      promise.catch(() => {}).then(() => {});
    }
  }

  // pause the video
  pause() {
    const promise = this.video.pause();
    if (promise !== undefined) {
      promise.catch(() => {}).then(() => {});
    }
  }

  // Change the video source and re-load the video:
  load() {
    this.video.load();
  }

  // Add a new text track to the video
  addTextTrack(...args) {
    this.video.addTextTrack(...args);
  }

  // Check if your browser can play different types of video:
  canPlayType(...args) {
    this.video.canPlayType(...args);
  }

  // toggle play
  togglePlay() {
    if (this.video.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  // seek video by time
  seek(time) {
    this.log('Video.seek() called with time:', time, 'type:', typeof time);

    try {
      // Validate time parameter
      if (!Number.isFinite(time) || time < 0) {
        this.warn(
          'Video.seek() - Invalid time parameter:',
          time,
          'Aborting seek.'
        );
        return;
      }

      // Ensure video element exists and has valid duration
      if (
        !this.video ||
        !Number.isFinite(this.video.duration) ||
        this.video.duration <= 0
      ) {
        this.warn('Video.seek() - Video element or duration invalid:', {
          hasVideo: !!this.video,
          duration: this.video ? this.video.duration : 'N/A',
          durationIsFinite: this.video
            ? Number.isFinite(this.video.duration)
            : false
        });
        return;
      }

      // Clamp time to valid range
      const clampedTime = Math.max(0, Math.min(time, this.video.duration));

      // Since we now process URLs through blob creation before they reach the video element,
      // we can seek directly without worrying about blob state
      this.log('Video.seek() - Seeking directly to:', clampedTime);
      this.video.currentTime = clampedTime;
    } catch (e) {
      this.error('Video seek error:', e, {
        requestedTime: time,
        videoDuration: this.video && this.video.duration,
        videoCurrentTime: this.video && this.video.currentTime
      });
    }
  }

  // jump forward x seconds
  forward(seconds) {
    this.seek(this.video.currentTime + seconds);
  }

  // jump back x seconds
  replay(seconds) {
    this.forward(-seconds);
  }

  // enter or exist full screen
  toggleFullscreen() {
    const { player, actions } = this.props;
    actions.toggleFullscreen(player);
  }

  // Fired when the user agent
  // begins looking for media data
  handleLoadStart(...args) {
    const { actions, onLoadStart } = this.props;
    actions.handleLoadStart(this.getProperties());
    if (onLoadStart) {
      onLoadStart(...args);
    }
  }

  // A handler for events that
  // signal that waiting has ended
  handleCanPlay(...args) {
    const { actions, onCanPlay } = this.props;

    actions.handleCanPlay(this.getProperties());

    if (onCanPlay) {
      onCanPlay(...args);
    }
  }

  // A handler for events that
  // signal that waiting has ended
  handleCanPlayThrough(...args) {
    const { actions, onCanPlayThrough } = this.props;
    actions.handleCanPlayThrough(this.getProperties());

    if (onCanPlayThrough) {
      onCanPlayThrough(...args);
    }
  }

  // A handler for events that
  // signal that waiting has ended
  handlePlaying(...args) {
    const { actions, onPlaying } = this.props;
    actions.handlePlaying(this.getProperties());

    if (onPlaying) {
      onPlaying(...args);
    }
  }

  // Fired whenever the media has been started
  handlePlay(...args) {
    const { actions, onPlay } = this.props;
    actions.handlePlay(this.getProperties());

    if (onPlay) {
      onPlay(...args);
    }
  }

  // Fired whenever the media has been paused
  handlePause(...args) {
    const { actions, onPause } = this.props;
    actions.handlePause(this.getProperties());

    if (onPause) {
      onPause(...args);
    }
  }

  // Fired when the duration of
  // the media resource is first known or changed
  handleDurationChange(...args) {
    const { actions, onDurationChange } = this.props;
    actions.handleDurationChange(this.getProperties());

    if (onDurationChange) {
      onDurationChange(...args);
    }
  }

  // Fired while the user agent
  // is downloading media data
  handleProgress(...args) {
    const { actions, onProgress } = this.props;
    if (this.video) {
      actions.handleProgressChange(this.getProperties());
    }

    if (onProgress) {
      onProgress(...args);
    }
  }

  // Fired when the end of the media resource
  // is reached (currentTime == duration)
  handleEnded(...args) {
    const { loop, player, actions, onEnded } = this.props;

    // Don't clean up blob URL here - keep it in memory for reuse
    // Only clean up when the source actually changes

    if (loop) {
      this.seek(0);
      this.play();
    } else if (!player.paused) {
      this.pause();
    }
    actions.handleEnd(this.getProperties());

    if (onEnded) {
      onEnded(...args);
    }
  }

  // Fired whenever the media begins waiting
  handleWaiting(...args) {
    const { actions, onWaiting } = this.props;
    actions.handleWaiting(this.getProperties());

    if (onWaiting) {
      onWaiting(...args);
    }
  }

  // Fired whenever the player
  // is jumping to a new time
  handleSeeking(...args) {
    const { actions, onSeeking } = this.props;
    actions.handleSeeking(this.getProperties());

    if (onSeeking) {
      onSeeking(...args);
    }
  }

  // Fired when the player has
  // finished jumping to a new time
  handleSeeked(...args) {
    const { actions, onSeeked } = this.props;
    actions.handleSeeked(this.getProperties());

    if (onSeeked) {
      onSeeked(...args);
    }
  }

  // Handle Fullscreen Change
  handleFullscreenChange() {}

  // Fires when the browser is
  // intentionally not getting media data
  handleSuspend(...args) {
    const { actions, onSuspend } = this.props;
    actions.handleSuspend(this.getProperties());
    if (onSuspend) {
      onSuspend(...args);
    }
  }

  // Fires when the loading of an audio/video is aborted
  handleAbort(...args) {
    const { actions, onAbort } = this.props;
    actions.handleAbort(this.getProperties());
    if (onAbort) {
      onAbort(...args);
    }
  }

  // Fires when the current playlist is empty
  handleEmptied(...args) {
    const { actions, onEmptied } = this.props;
    actions.handleEmptied(this.getProperties());
    if (onEmptied) {
      onEmptied(...args);
    }
  }

  // Fires when the browser is trying to
  // get media data, but data is not available
  handleStalled(...args) {
    const { actions, onStalled } = this.props;
    actions.handleStalled(this.getProperties());

    if (onStalled) {
      onStalled(...args);
    }
  }

  // Fires when the browser has loaded
  // meta data for the audio/video
  handleLoadedMetaData(...args) {
    const { actions, onLoadedMetadata, startTime } = this.props;

    if (startTime && startTime > 0) {
      this.video.currentTime = startTime;
    }

    actions.handleLoadedMetaData(this.getProperties());

    // Call resize handler when video metadata is loaded (dimensions are available)
    this.handleResize();

    if (onLoadedMetadata) {
      onLoadedMetadata(...args);
    }
  }

  // Fires when the browser has loaded
  // the current frame of the audio/video
  handleLoadedData(...args) {
    const { actions, onLoadedData } = this.props;
    actions.handleLoadedData(this.getProperties());

    if (onLoadedData) {
      onLoadedData(...args);
    }
  }

  // Fires when the current
  // playback position has changed
  handleTimeUpdate(...args) {
    const { actions, onTimeUpdate } = this.props;
    actions.handleTimeUpdate(this.getProperties());

    if (onTimeUpdate) {
      onTimeUpdate(...args);
    }
  }

  /**
   * Fires when the playing speed of the audio/video is changed
   */
  handleRateChange(...args) {
    const { actions, onRateChange } = this.props;
    actions.handleRateChange(this.getProperties());

    if (onRateChange) {
      onRateChange(...args);
    }
  }

  // Fires when the volume has been changed
  handleVolumeChange(...args) {
    const { actions, onVolumeChange } = this.props;
    actions.handleVolumeChange(this.getProperties());

    if (onVolumeChange) {
      onVolumeChange(...args);
    }
  }

  // Fires when an error occurred
  // during the loading of an audio/video
  handleError(...args) {
    const { actions, onError } = this.props;
    actions.handleError(this.getProperties());
    if (onError) {
      onError(...args);
    }
  }

  handleResize(...args) {
    const { actions, onResize } = this.props;
    actions.handleResize(this.getProperties());
    if (onResize) {
      onResize(...args);
    }
  }

  handleKeypress() {}

  renderChildren() {
    const props = {
      ...this.props,
      video: this.video
    };

    // to make sure the children can get video property
    if (!this.video) {
      return null;
    }

    // only keep <source />, <track />, <MyComponent isVideoChild /> elements
    return React.Children.toArray(this.props.children)
      .filter(isVideoChild)
      .map(c => {
        let cprops;
        if (typeof c.type === 'string') {
          // add onError to <source />
          if (c.type === 'source') {
            cprops = { ...c.props };
            const preOnError = cprops.onError;
            cprops.onError = (...args) => {
              if (preOnError) {
                preOnError(...args);
              }
              this.handleError(...args);
            };
          }
        } else {
          cprops = props;
        }
        return React.cloneElement(c, cprops);
      });
  }

  render() {
    const {
      loop,
      poster,
      preload,
      src,
      autoPlay,
      playsInline,
      muted,
      crossOrigin,
      videoId
    } = this.props;

    // Use processed source URL only if createBlob is enabled and we have a processed URL
    // Otherwise use original src directly (no processing, no re-renders)
    const videoSrc =
      this.props.createBlob && this.processedSrc !== null
        ? this.processedSrc
        : src;

    return (
      <video
        className={classNames('video-react-video', this.props.className)}
        id={videoId}
        crossOrigin={crossOrigin}
        ref={c => {
          this.video = c;
        }}
        muted={muted}
        preload={preload}
        loop={loop}
        playsInline={playsInline}
        autoPlay={autoPlay}
        poster={poster}
        src={videoSrc}
        onLoadStart={this.handleLoadStart}
        onWaiting={this.handleWaiting}
        onCanPlay={this.handleCanPlay}
        onCanPlayThrough={this.handleCanPlayThrough}
        onPlaying={this.handlePlaying}
        onEnded={this.handleEnded}
        onSeeking={this.handleSeeking}
        onSeeked={this.handleSeeked}
        onPlay={this.handlePlay}
        onPause={this.handlePause}
        onProgress={this.handleProgress}
        onDurationChange={this.handleDurationChange}
        onError={this.handleError}
        onSuspend={this.handleSuspend}
        onAbort={this.handleAbort}
        onEmptied={this.handleEmptied}
        onStalled={this.handleStalled}
        onLoadedMetadata={this.handleLoadedMetaData}
        onLoadedData={this.handleLoadedData}
        onTimeUpdate={this.handleTimeUpdate}
        onRateChange={this.handleRateChange}
        onVolumeChange={this.handleVolumeChange}
        tabIndex="-1"
      >
        {this.renderChildren()}
      </video>
    );
  }

  // Process source URL through blob creation if enabled
  async processSourceUrl(src) {
    if (!src) {
      this.processedSrc = null;
      return;
    }

    this.log(
      'Video.processSourceUrl() - Processing source URL through blob creation:',
      src
    );

    try {
      // First test if the server supports range requests
      const supportsRangeRequests = await this.testRangeRequests(src);

      if (supportsRangeRequests) {
        this.log(
          'Video.processSourceUrl() - Server supports range requests, using original URL'
        );
        this.processedSrc = src;
        this.forceUpdate();

        // If autoplay is enabled, try to play immediately
        if (this.props.autoPlay) {
          this.log(
            'Video.processSourceUrl() - Autoplay enabled, attempting to play'
          );
          setTimeout(() => {
            this.play();
          }, 50);
        }
        return;
      }

      // Server doesn't support range requests, create blob
      this.log(
        'Video.processSourceUrl() - Server does not support range requests, creating blob'
      );
      const blobUrl = await this.createBlobUrl(src);
      this.blobUrl = blobUrl;
      this.processedSrc = blobUrl;
      this.log('Video.processSourceUrl() - Created blob URL:', blobUrl);
      this.forceUpdate(); // Trigger re-render with processed URL
    } catch (error) {
      this.error(
        'Video.processSourceUrl() - Failed to create blob URL:',
        error
      );
      this.processedSrc = src; // Fallback to original URL
      this.forceUpdate(); // Trigger re-render with fallback URL
    }
  }

  // Test if the server supports range requests by making a mini-seek
  async testRangeRequests(url) {
    this.log(
      'Video.testRangeRequests() - Testing range request support for:',
      url
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Range: 'bytes=0-1023', // Request first 1KB
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0'
        }
      });

      this.log('Video.testRangeRequests() - Response status:', response.status);
      this.log('Video.testRangeRequests() - Response headers:', {
        'content-range': response.headers.get('content-range'),
        'accept-ranges': response.headers.get('accept-ranges'),
        'content-length': response.headers.get('content-length')
      });

      // 206 = Partial Content (supports range requests)
      // 200 = OK (doesn't support range requests, returns full content)
      // Also check if we got a Content-Range header which indicates proper range support
      const hasContentRange = response.headers.get('content-range');
      const supportsRanges = response.headers.get('accept-ranges');

      const isRangeSupported =
        response.status === 206 ||
        (response.status === 200 && hasContentRange) ||
        supportsRanges === 'bytes';

      this.log(
        'Video.testRangeRequests() - Range support detected:',
        isRangeSupported
      );
      return isRangeSupported;
    } catch (error) {
      this.log(
        'Video.testRangeRequests() - Error testing range requests:',
        error
      );
      // If there's an error, assume no range support and create blob
      return false;
    }
  }

  // Create blob URL from source URL
  async createBlobUrl(url) {
    this.log('Video.createBlobUrl() - Creating blob URL for:', url);

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    this.log('Video.createBlobUrl() - Blob created, size:', blob.size);

    const blobUrl = URL.createObjectURL(blob);
    this.log('Video.createBlobUrl() - Blob URL created:', blobUrl);

    return blobUrl;
  }

  // Clean up blob when component unmounts or source changes
  cleanupBlob() {
    if (this.blobUrl) {
      this.log('Video.cleanupBlob() - Revoking blob URL:', this.blobUrl);
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
    this.processedSrc = null;
  }
}

Video.propTypes = propTypes;
Video.displayName = 'Video';
