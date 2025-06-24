import PropTypes from 'prop-types';
import React, { Component } from 'react';
import classNames from 'classnames';

import Slider from '../Slider';
import PlayProgressBar from './PlayProgressBar';
import LoadProgressBar from './LoadProgressBar';
import MouseTimeDisplay from './MouseTimeDisplay';
import { formatTime } from '../../utils';

const propTypes = {
  player: PropTypes.object,
  mouseTime: PropTypes.object,
  actions: PropTypes.object,
  className: PropTypes.string,
  video: PropTypes.object, // Video element reference
  showLogs: PropTypes.bool
};

export default class SeekBar extends Component {
  constructor(props, context) {
    super(props, context);

    this.getPercent = this.getPercent.bind(this);
    this.getNewTime = this.getNewTime.bind(this);
    this.stepForward = this.stepForward.bind(this);
    this.stepBack = this.stepBack.bind(this);

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    // Track preview time during dragging (like native video players)
    this.state = {
      isDragging: false,
      previewTime: null
    };

    // Animation frame for real-time updates during seeking
    this.animationFrame = null;
  }

  componentWillUnmount() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  /**
   * Get the actual current time from the video element or preview time
   * This ensures zero-latency updates
   */
  getCurrentTime() {
    // During dragging, show preview time
    if (this.state.isDragging && this.state.previewTime !== null) {
      return this.state.previewTime;
    }

    // Try to get real-time currentTime from video element first
    const { video } = this.props;
    if (video && Number.isFinite(video.currentTime)) {
      return video.currentTime;
    }

    // Fallback to Redux state
    return this.props.player.currentTime || 0;
  }

  /**
   * Get percentage of video played using real-time currentTime
   *
   * @return {Number} Percentage played
   * @method getPercent
   */
  getPercent() {
    const { duration } = this.props.player;

    if (!duration || duration <= 0) {
      return 0;
    }

    const currentTime = this.getCurrentTime();
    const percent = currentTime / duration;
    return percent >= 1 ? 1 : percent;
  }

  getNewTime(event) {
    const {
      player: { duration }
    } = this.props;

    this.log('SeekBar.getNewTime() - Input:', {
      duration,
      hasEvent: !!event
    });

    // Validate duration before proceeding
    if (!duration || duration <= 0 || !Number.isFinite(duration)) {
      this.warn('SeekBar.getNewTime() - Invalid duration:', duration);
      return null;
    }

    // Validate that slider exists and calculateDistance is available
    if (!this.slider || typeof this.slider.calculateDistance !== 'function') {
      this.warn(
        'SeekBar.getNewTime() - Slider or calculateDistance not available:',
        {
          hasSlider: !!this.slider,
          hasCalculateDistance: this.slider
            ? typeof this.slider.calculateDistance
            : 'N/A'
        }
      );
      return null;
    }

    const distance = this.slider.calculateDistance(event);

    this.log('SeekBar.getNewTime() - Distance calculated:', distance);

    // Validate distance is a valid number between 0 and 1
    if (!Number.isFinite(distance) || distance < 0 || distance > 1) {
      this.warn('SeekBar.getNewTime() - Invalid distance:', distance);
      return null;
    }

    const newTime = distance * duration;

    this.log(
      'SeekBar.getNewTime() - Raw newTime calculated:',
      newTime,
      '(distance:',
      distance,
      '* duration:',
      duration,
      ')'
    );

    // Don't let video end while scrubbing and ensure time is within valid bounds
    if (newTime >= duration) {
      const adjustedTime = duration - 0.1;
      this.log(
        'SeekBar.getNewTime() - Adjusted time to prevent end:',
        adjustedTime,
        'from:',
        newTime
      );
      return adjustedTime;
    }

    // Ensure the new time is not negative or invalid
    if (newTime < 0 || !Number.isFinite(newTime)) {
      this.warn(
        'SeekBar.getNewTime() - Invalid newTime (negative or not finite):',
        newTime
      );
      return null;
    }

    this.log('SeekBar.getNewTime() - Final newTime:', newTime);
    return newTime;
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

  handleMouseDown(event) {
    const { actions } = this.props;
    const newTime = this.getNewTime(event);

    this.log('SeekBar.handleMouseDown() - newTime calculated:', newTime);

    if (newTime !== null) {
      // Start dragging and show preview position
      this.setState({
        isDragging: true,
        previewTime: newTime
      });

      this.log(
        'SeekBar.handleMouseDown() - Started dragging with previewTime:',
        newTime
      );

      // Start real-time updates during dragging
      this.startRealtimeUpdates();
    }

    // Prevent any default behavior that might interfere
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
  }

  handleMouseUp(event) {
    const { actions } = this.props;

    // Use the preview time if available, otherwise calculate from event
    const finalTime =
      this.state.previewTime !== null
        ? this.state.previewTime
        : this.getNewTime(event);

    this.log(
      'SeekBar.handleMouseUp() - finalTime calculated:',
      finalTime,
      'from previewTime:',
      this.state.previewTime
    );

    // Clear dragging state
    this.setState({
      isDragging: false,
      previewTime: null
    });

    // Stop real-time updates
    this.stopRealtimeUpdates();

    // Only seek if we have a valid time - this is when the actual seek happens
    if (finalTime !== null && Number.isFinite(finalTime)) {
      this.log(
        'SeekBar.handleMouseUp() - About to call actions.seek() with:',
        finalTime
      );

      // Let the video element handle the actual seeking
      // Redux will catch up via TIME_UPDATE events
      actions.handleSeeking(this.props.player);
      actions.seek(finalTime);
      actions.handleEndSeeking(finalTime);

      this.log(
        'SeekBar.handleMouseUp() - Called actions.seek() and actions.handleEndSeeking() with:',
        finalTime
      );
    } else {
      this.warn(
        'SeekBar.handleMouseUp() - Invalid finalTime, calling handleEndSeeking(0):',
        finalTime
      );

      // Still call handleEndSeeking even if seek failed (for API consistency)
      actions.handleEndSeeking(0);
    }

    // Prevent any default behavior
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
  }

  handleMouseMove(event) {
    const newTime = this.getNewTime(event);

    // Only update preview during dragging - no actual seeking until mouse up
    if (newTime !== null && this.state.isDragging) {
      this.log('SeekBar.handleMouseMove() - Updating previewTime to:', newTime);

      this.setState({ previewTime: newTime });

      // Prevent any default behavior
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
    }
  }

  /**
   * Start real-time updates during seeking to eliminate jittering
   */
  startRealtimeUpdates() {
    const updateProgress = () => {
      if (this.state.isDragging) {
        // Force re-render to show real-time progress
        this.forceUpdate();
        this.animationFrame = requestAnimationFrame(updateProgress);
      }
    };
    this.animationFrame = requestAnimationFrame(updateProgress);
  }

  /**
   * Stop real-time updates
   */
  stopRealtimeUpdates() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  stepForward() {
    const { actions } = this.props;
    actions.forward(5);
  }

  stepBack() {
    const { actions } = this.props;
    actions.replay(5);
  }

  render() {
    const {
      player: { duration, buffered },
      mouseTime
    } = this.props;

    // Use real-time currentTime for zero-latency updates
    const displayTime = this.getCurrentTime();

    return (
      <Slider
        ref={input => {
          this.slider = input;
        }}
        label="video progress bar"
        className={classNames(
          'video-react-progress-holder',
          this.props.className
        )}
        valuenow={(this.getPercent() * 100).toFixed(2)}
        valuetext={formatTime(displayTime, duration)}
        onMouseDown={this.handleMouseDown}
        onMouseMove={this.handleMouseMove}
        onMouseUp={this.handleMouseUp}
        getPercent={this.getPercent}
        stepForward={this.stepForward}
        stepBack={this.stepBack}
      >
        <LoadProgressBar buffered={buffered} duration={duration} />
        <MouseTimeDisplay
          duration={duration}
          mouseTime={mouseTime}
          player={this.props.player}
        />
        <PlayProgressBar currentTime={displayTime} duration={duration} />
      </Slider>
    );
  }
}

SeekBar.propTypes = propTypes;
SeekBar.displayName = 'SeekBar';
