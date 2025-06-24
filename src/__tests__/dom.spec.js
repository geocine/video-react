import { getPointerPosition, findElPosition } from '../utils/dom';

describe('DOM utilities', () => {
  describe('getPointerPosition', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        offsetWidth: 100,
        offsetHeight: 50,
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 10,
          top: 20,
          width: 100,
          height: 50
        }),
        parentNode: document.body
      };

      // Mock document properties
      Object.defineProperty(document, 'body', {
        value: {
          clientLeft: 0,
          clientTop: 0,
          scrollLeft: 0,
          scrollTop: 0
        },
        writable: true
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          clientLeft: 0,
          clientTop: 0
        },
        writable: true
      });

      Object.defineProperty(window, 'pageXOffset', {
        value: 0,
        writable: true
      });

      Object.defineProperty(window, 'pageYOffset', {
        value: 0,
        writable: true
      });
    });

    it('should return {x: 0, y: 0} when element width is 0', () => {
      mockElement.offsetWidth = 0;

      const event = { pageX: 50, pageY: 30 };
      const result = getPointerPosition(mockElement, event);

      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should return {x: 0, y: 0} when element height is 0', () => {
      mockElement.offsetHeight = 0;

      const event = { pageX: 50, pageY: 30 };
      const result = getPointerPosition(mockElement, event);

      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should return {x: 0, y: 0} when element width is negative', () => {
      mockElement.offsetWidth = -10;

      const event = { pageX: 50, pageY: 30 };
      const result = getPointerPosition(mockElement, event);

      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should return {x: 0, y: 0} when event coordinates are invalid', () => {
      const event = { pageX: NaN, pageY: 30 };
      const result = getPointerPosition(mockElement, event);

      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should return {x: 0, y: 0} when event pageY is Infinity', () => {
      const event = { pageX: 50, pageY: Infinity };
      const result = getPointerPosition(mockElement, event);

      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should handle touch events', () => {
      const event = {
        changedTouches: [{ pageX: 60, pageY: 45 }]
      };

      const result = getPointerPosition(mockElement, event);

      // Should return valid position
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.x).toBeLessThanOrEqual(1);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeLessThanOrEqual(1);
    });

    it('should return {x: 0, y: 0} when touch coordinates are invalid', () => {
      const event = {
        changedTouches: [{ pageX: NaN, pageY: 45 }]
      };

      const result = getPointerPosition(mockElement, event);

      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should calculate correct position for valid mouse event', () => {
      const event = { pageX: 60, pageY: 45 }; // 50 pixels right, 25 pixels down from element

      const result = getPointerPosition(mockElement, event);

      // Position should be normalized to 0-1 range
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.x).toBeLessThanOrEqual(1);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeLessThanOrEqual(1);
    });

    it('should clamp position to 0-1 range', () => {
      // Event way outside element bounds
      const event = { pageX: -100, pageY: -100 };

      const result = getPointerPosition(mockElement, event);

      expect(result.x).toBe(0);
      expect(result.y).toBe(1); // Y is inverted in the calculation
    });

    it('should handle element with no getBoundingClientRect', () => {
      mockElement.getBoundingClientRect = undefined;

      const event = { pageX: 50, pageY: 30 };
      const result = getPointerPosition(mockElement, event);

      // Should still return a valid result
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.x).toBeLessThanOrEqual(1);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeLessThanOrEqual(1);
    });
  });

  describe('findElPosition', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 100,
          top: 200
        }),
        parentNode: document.body
      };

      Object.defineProperty(document, 'body', {
        value: {
          clientLeft: 0,
          clientTop: 0,
          scrollLeft: 0,
          scrollTop: 0
        },
        writable: true
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          clientLeft: 0,
          clientTop: 0
        },
        writable: true
      });

      Object.defineProperty(window, 'pageXOffset', {
        value: 0,
        writable: true
      });

      Object.defineProperty(window, 'pageYOffset', {
        value: 0,
        writable: true
      });
    });

    it('should return {left: 0, top: 0} when getBoundingClientRect is not available', () => {
      mockElement.getBoundingClientRect = undefined;

      const result = findElPosition(mockElement);

      expect(result).toEqual({ left: 0, top: 0 });
    });

    it('should return {left: 0, top: 0} when element has no parent', () => {
      mockElement.parentNode = null;

      const result = findElPosition(mockElement);

      expect(result).toEqual({ left: 0, top: 0 });
    });

    it('should calculate correct position for valid element', () => {
      const result = findElPosition(mockElement);

      expect(result.left).toBe(100);
      expect(result.top).toBe(200);
    });

    it('should round decimal values', () => {
      mockElement.getBoundingClientRect.mockReturnValue({
        left: 100.7,
        top: 200.3
      });

      const result = findElPosition(mockElement);

      expect(result.left).toBe(101);
      expect(result.top).toBe(200);
    });
  });
});
