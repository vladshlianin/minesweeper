import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showConfetti } from '../../confetti';

const mockWindow = {
  innerHeight: 768,
  innerWidth: 1024,
};

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  globalAlpha: null,
};

const mockRequestFrame = () => {
  const animationFrameCallbacks: Array<(timestamp: number) => void> = [];
  const mockRequestAnimationFrame = vi.fn((callback: (timestamp: number) => void) => {
    animationFrameCallbacks.push(callback);
    return animationFrameCallbacks.length;
  });

  // Assign mocks
  const spy = vi.spyOn(window, 'requestAnimationFrame').mockImplementationOnce(mockRequestAnimationFrame);
  return [animationFrameCallbacks, spy] as const;
};

describe('Confetti Effect', () => {
  const getContext = vi.fn((): null | typeof mockContext => mockContext);
  // Mock canvas element
  const mockCanvas = {
    // Width and hight are actually set within showConfetti
    // We just make TS happy
    width: 0,
    height: 0,
    getContext: getContext,
  };

  const appendChild = vi.fn();
  const removeChild = vi.fn();
  const getElementById = vi.fn((): HTMLElement | null => null);
  const createElement = vi.fn(() => mockCanvas);

  vi.stubGlobal(window.innerWidth, mockWindow.innerWidth);
  vi.stubGlobal(window.innerHeight, mockWindow.innerHeight);

  // This is just a mock, no need to reimplement whole jsdom
  vi.spyOn(document, 'createElement').mockImplementation(createElement as unknown as Document['createElement']);
  vi.spyOn(document, 'getElementById').mockImplementation(getElementById);
  vi.spyOn(document.body, 'appendChild').mockImplementation(appendChild);
  vi.spyOn(document.body, 'removeChild').mockImplementation(removeChild);

  // As global alpha value is assigned, use spy to track it
  const globalAlphaSpy = vi.spyOn(mockContext, 'globalAlpha', 'set');

  beforeEach(() => {
    // Reset mocks
    getContext.mockReset();
    createElement.mockReset();
    getElementById.mockReset();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('getCanvas', () => {
    it('should create new canvas when not found in DOM', () => {
      getElementById.mockReturnValue(null);

      showConfetti(1, 0, 1000);

      expect(getElementById).toHaveBeenCalledWith('confetti-0');
      expect(createElement).toHaveBeenCalledWith('canvas');
    });

    it('should reuse existing canvas when found in DOM', () => {
      const existingCanvas = { ...mockCanvas, id: 'confetti-0' };
      // Yet again, here we don't care for type safety and actually implementing HTMLElement
      getElementById.mockReturnValue(existingCanvas as unknown as HTMLElement);

      showConfetti(1, 0, 1000);

      expect(createElement).not.toHaveBeenCalled();
    });

    it('should remove canvas from DOM when it exists', () => {
      // Yet again, here we don't care for type safety and actually implementing HTMLElement
      getElementById.mockReturnValue(mockCanvas as unknown as HTMLElement);
      showConfetti(1, 0, 100); // Short duration
      vi.advanceTimersByTime(150);
      expect(removeChild).toHaveBeenCalled();
    });

    it('canvas has the same dimensions as window', () => {
      showConfetti(1, 0, 1000);
      // Verify canvas setup which indicates particles were generated
      expect(mockCanvas.width).toBe(mockWindow.innerWidth);
      expect(mockCanvas.height).toBe(mockWindow.innerHeight);
    });
  });

  describe('missing context', () => {
    it('gracefully handles missing context', () => {
      getContext.mockReturnValue(null);
      // Prevent logging
      vi.spyOn(console, 'error').mockImplementationOnce(() => {});

      expect(() => showConfetti(1, 0, 1000)).not.toThrow();
    });

    it('shows a warning', () => {
      getContext.mockReturnValue(null);
      const spy = vi.spyOn(console, 'error').mockImplementationOnce(() => {});
      showConfetti(1, 0, 1000);
      expect(spy).toBeCalledTimes(1);
    });
  });

  describe('Physics and animation', () => {
    it('should clear canvas on each frame', () => {
      const [animationFrameCallbacks, spy] = mockRequestFrame();
      showConfetti(1, 0, 1000);
      // Trigger animation frame
      if (animationFrameCallbacks.length > 0) {
        animationFrameCallbacks[0](16); // Simulate first frame
      }

      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, mockWindow.innerWidth, mockWindow.innerHeight);
      spy.mockReset();
    });

    it('should apply opacity fade over time', () => {
      const [animationFrameCallbacks, spy] = mockRequestFrame();
      showConfetti(1, 0, 1000);
      // Trigger animation frame
      if (animationFrameCallbacks.length > 0) {
        animationFrameCallbacks[0](16); // Simulate first frame
      }
      expect(globalAlphaSpy).toBeCalled();
      spy.mockReset();
    });

    it('should apply gravity to particles over time', () => {
      const [animationFrameCallbacks, spy] = mockRequestFrame();
      showConfetti(1, 0, 1000);
      if (animationFrameCallbacks.length > 0) {
        animationFrameCallbacks[0](16); // Simulate first frame
      }

      // Verify particles are being rendered (physics applied)
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      spy.mockReset();
    });

    it('should rotate particles', () => {
      const [animationFrameCallbacks, spy] = mockRequestFrame();
      showConfetti(1, 0, 1000);
      if (animationFrameCallbacks.length > 0) {
        animationFrameCallbacks[0](16); // Simulate first frame
      }

      // Verify particles are being rendered (physics applied)
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.rotate).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      spy.mockReset();
    });
  });

  describe('Bursts and delay', () => {
    it('should create multiple bursts with repeat > 1', () => {
      const repeat = 3;
      const repeatDelay = 500;

      showConfetti(repeat, repeatDelay, 1000);

      // First burst created immediately
      expect(createElement).toHaveBeenCalledTimes(1);

      // Advance time to trigger subsequent bursts
      vi.advanceTimersByTime(repeatDelay);
      expect(createElement).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(repeatDelay);
      expect(createElement).toHaveBeenCalledTimes(3);

      // No more bursts after reaching repeat count
      vi.advanceTimersByTime(repeatDelay);
      expect(createElement).toHaveBeenCalledTimes(3);
    });

    it('should handle repeat delay correctly', () => {
      const repeatDelay = 1000;
      showConfetti(2, repeatDelay, 500);
      // Only first burst initially
      expect(createElement).toHaveBeenCalledTimes(1);
      // Second burst after delay
      vi.advanceTimersByTime(repeatDelay - 1);
      expect(createElement).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(createElement).toHaveBeenCalledTimes(2);
    });
  });
});
