import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import { formatTime } from '../../utils';

const propTypes = {
  currentTime: PropTypes.number,
  duration: PropTypes.number,
  percentage: PropTypes.string,
  className: PropTypes.string
};

// Shows play progress
export default function PlayProgressBar({
  currentTime,
  duration,
  percentage,
  className
}) {
  // Calculate percentage from currentTime and duration if not provided
  let progressPercentage = percentage;
  if (!progressPercentage && duration && duration > 0 && currentTime >= 0) {
    const percent = Math.min(currentTime / duration, 1);
    progressPercentage = `${(percent * 100).toFixed(2)}%`;
  } else if (!progressPercentage) {
    progressPercentage = '0%';
  }

  return (
    <div
      data-current-time={formatTime(currentTime, duration)}
      className={classNames(
        'video-react-play-progress video-react-slider-bar',
        className
      )}
      style={{
        width: progressPercentage
      }}
    >
      <span className="video-react-control-text">
        {`Progress: ${progressPercentage}`}
      </span>
    </div>
  );
}

PlayProgressBar.propTypes = propTypes;
PlayProgressBar.displayName = 'PlayProgressBar';
