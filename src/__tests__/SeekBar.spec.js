import React from 'react';
import { shallow, mount } from 'enzyme';
import SeekBar from '../components/control-bar/SeekBar';

describe('SeekBar', () => {
  it('should render with "div" tag', () => {
    const wrapper = mount(
      <SeekBar
        actions={{}}
        player={{
          duration: 200,
          currentTime: 50
        }}
        mouseTime={{
          time: 100,
          position: 0
        }}
      />
    );

    expect(wrapper.find('div.video-react-slider').length).toBe(1);
  });

  it('should render with "video-react-progress-holder" class', () => {
    const wrapper = shallow(
      <SeekBar
        actions={{}}
        player={{
          duration: 200,
          currentTime: 50
        }}
        mouseTime={{
          time: 100,
          position: 0
        }}
      />
    );
    expect(wrapper.hasClass('video-react-progress-holder')).toBe(true);
  });

  describe('getNewTime', () => {
    let wrapper;
    let instance;
    let mockSlider;

    beforeEach(() => {
      mockSlider = {
        calculateDistance: jest.fn()
      };

      wrapper = shallow(
        <SeekBar
          actions={{}}
          player={{
            duration: 100,
            currentTime: 50
          }}
          mouseTime={{
            time: 10,
            position: 0
          }}
        />
      );

      instance = wrapper.instance();
      instance.slider = mockSlider;
    });

    it('should return null when duration is invalid', () => {
      wrapper.setProps({
        player: {
          duration: 0,
          currentTime: 50
        }
      });

      const result = instance.getNewTime({});
      expect(result).toBe(null);
    });

    it('should return null when duration is NaN', () => {
      wrapper.setProps({
        player: {
          duration: NaN,
          currentTime: 50
        }
      });

      const result = instance.getNewTime({});
      expect(result).toBe(null);
    });

    it('should return null when duration is Infinity', () => {
      wrapper.setProps({
        player: {
          duration: Infinity,
          currentTime: 50
        }
      });

      const result = instance.getNewTime({});
      expect(result).toBe(null);
    });

    it('should return null when slider is not available', () => {
      instance.slider = null;

      const result = instance.getNewTime({});
      expect(result).toBe(null);
    });

    it('should return null when calculateDistance returns invalid value', () => {
      mockSlider.calculateDistance.mockReturnValue(NaN);

      const result = instance.getNewTime({});
      expect(result).toBe(null);
    });

    it('should return null when calculateDistance returns negative value', () => {
      mockSlider.calculateDistance.mockReturnValue(-0.5);

      const result = instance.getNewTime({});
      expect(result).toBe(null);
    });

    it('should return null when calculateDistance returns value > 1', () => {
      mockSlider.calculateDistance.mockReturnValue(1.5);

      const result = instance.getNewTime({});
      expect(result).toBe(null);
    });

    it('should return correct time for valid distance', () => {
      mockSlider.calculateDistance.mockReturnValue(0.5);

      const result = instance.getNewTime({});
      expect(result).toBe(50); // 0.5 * 100 duration
    });

    it('should prevent seeking to exact end time', () => {
      mockSlider.calculateDistance.mockReturnValue(1.0);

      const result = instance.getNewTime({});
      expect(result).toBe(99.9); // duration - 0.1
    });

    it('should handle edge case near end of video', () => {
      mockSlider.calculateDistance.mockReturnValue(0.999);

      const result = instance.getNewTime({});
      expect(result).toBe(99.9); // Should clamp to duration - 0.1
    });
  });

  describe('handleMouseUp', () => {
    let wrapper;
    let instance;
    let mockActions;
    let mockSlider;

    beforeEach(() => {
      mockActions = {
        seek: jest.fn(),
        handleEndSeeking: jest.fn(),
        handleSeeking: jest.fn()
      };

      mockSlider = {
        calculateDistance: jest.fn().mockReturnValue(0.5)
      };

      wrapper = shallow(
        <SeekBar
          actions={mockActions}
          player={{
            duration: 100,
            currentTime: 50
          }}
          mouseTime={{
            time: 10,
            position: 0
          }}
        />
      );

      instance = wrapper.instance();
      instance.slider = mockSlider;
    });

    it('should call seek and handleEndSeeking with valid time', () => {
      instance.handleMouseUp({});

      expect(mockActions.handleSeeking).toHaveBeenCalledWith({
        duration: 100,
        currentTime: 50
      });
      expect(mockActions.seek).toHaveBeenCalledWith(50);
      expect(mockActions.handleEndSeeking).toHaveBeenCalledWith(50);
    });

    it('should only call handleEndSeeking with 0 when time is invalid', () => {
      mockSlider.calculateDistance.mockReturnValue(NaN);

      instance.handleMouseUp({});

      expect(mockActions.seek).not.toHaveBeenCalled();
      expect(mockActions.handleEndSeeking).toHaveBeenCalledWith(0);
    });

    it('should handle invalid duration gracefully', () => {
      wrapper.setProps({
        player: {
          duration: 0,
          currentTime: 50
        }
      });

      instance.handleMouseUp({});

      expect(mockActions.seek).not.toHaveBeenCalled();
      expect(mockActions.handleEndSeeking).toHaveBeenCalledWith(0);
    });

    it('should seek to time 0 when distance is 0', () => {
      mockSlider.calculateDistance.mockReturnValue(0);

      instance.handleMouseUp({});

      expect(mockActions.handleSeeking).toHaveBeenCalledWith({
        duration: 100,
        currentTime: 50
      });
      expect(mockActions.seek).toHaveBeenCalledWith(0);
      expect(mockActions.handleEndSeeking).toHaveBeenCalledWith(0);
    });
  });
});
