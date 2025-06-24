import React from 'react';
import { shallow } from 'enzyme';
import Video from '../components/Video';

describe('Video', () => {
  it('should render with "video" tag', () => {
    const wrapper = shallow(<Video actions={{}} player={{}} />);

    expect(wrapper.type()).toBe('video');
  });

  it('should render with "video-react-video" class', () => {
    const wrapper = shallow(<Video actions={{}} player={{}} />);
    expect(wrapper.hasClass('video-react-video')).toBe(true);
  });

  describe('seek method', () => {
    let wrapper;
    let instance;
    let mockVideoElement;

    beforeEach(() => {
      mockVideoElement = {
        duration: 100,
        currentTime: 0
      };

      wrapper = shallow(<Video actions={{}} player={{}} />);
      instance = wrapper.instance();
      instance.video = mockVideoElement;
    });

    it('should not seek when time is negative', () => {
      const initialTime = mockVideoElement.currentTime;

      instance.seek(-10);

      expect(mockVideoElement.currentTime).toBe(initialTime);
    });

    it('should not seek when time is NaN', () => {
      const initialTime = mockVideoElement.currentTime;

      instance.seek(NaN);

      expect(mockVideoElement.currentTime).toBe(initialTime);
    });

    it('should not seek when time is Infinity', () => {
      const initialTime = mockVideoElement.currentTime;

      instance.seek(Infinity);

      expect(mockVideoElement.currentTime).toBe(initialTime);
    });

    it('should not seek when video element is not available', () => {
      instance.video = null;

      // Should not throw error
      expect(() => instance.seek(50)).not.toThrow();
    });

    it('should not seek when video duration is invalid', () => {
      mockVideoElement.duration = NaN;
      const initialTime = mockVideoElement.currentTime;

      instance.seek(50);

      expect(mockVideoElement.currentTime).toBe(initialTime);
    });

    it('should not seek when video duration is 0', () => {
      mockVideoElement.duration = 0;
      const initialTime = mockVideoElement.currentTime;

      instance.seek(50);

      expect(mockVideoElement.currentTime).toBe(initialTime);
    });

    it('should clamp seek time to valid range', () => {
      instance.seek(150); // Beyond duration

      expect(mockVideoElement.currentTime).toBe(100); // Should be clamped to duration
    });

    it('should seek to valid time', () => {
      instance.seek(50);

      expect(mockVideoElement.currentTime).toBe(50);
    });

    it('should clamp negative time to 0', () => {
      // This tests the Math.max(0, ...) part
      mockVideoElement.duration = 100;

      instance.seek(-5);

      // Should not have changed currentTime due to validation
      expect(mockVideoElement.currentTime).toBe(0);
    });

    it('should handle seek at exact duration boundary', () => {
      instance.seek(100); // Exact duration

      expect(mockVideoElement.currentTime).toBe(100);
    });
  });
});
