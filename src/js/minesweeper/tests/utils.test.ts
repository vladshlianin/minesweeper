import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { create2dArray, debounce, formatTime, hasVisualAccessibilityOn, isDifficulty, getDifficulty } from '../utils';

describe('create2dArray', () => {
  it('creates square array with correct dimensions and values', () => {
    const result = create2dArray('test', 3);

    expect(result).toEqual([
      ['test', 'test', 'test'],
      ['test', 'test', 'test'],
      ['test', 'test', 'test'],
    ]);
  });

  it('handles size 1', () => {
    const result = create2dArray(42, 1);
    expect(result).toEqual([[42]]);
  });

  it('throws an error on negative size', () => {
    expect(() => create2dArray('1', -1)).toThrowError('Size must be non-negative');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays function execution', () => {
    const callback = vi.fn();
    const debouncedFn = debounce(callback, 100);

    debouncedFn();
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('cancels previous timeout on rapid calls', () => {
    const callback = vi.fn();
    const debouncedFn = debounce(callback, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(50);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('handles zero interval', () => {
    const callback = vi.fn();
    const debouncedFn = debounce(callback, 0);

    debouncedFn();
    vi.advanceTimersByTime(0);
    expect(callback).toHaveBeenCalledOnce();
  });
});

describe('formatTime', () => {
  it('formats seconds only', () => {
    expect(formatTime(30)).toBe('30 seconds');
    expect(formatTime(1)).toBe('1 second');
    expect(formatTime(0)).toBe('0 seconds');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(90)).toBe('1 minute and 30 seconds');
    expect(formatTime(61)).toBe('1 minute and 1 second');
    expect(formatTime(120)).toBe('2 minutes and 0 seconds');
    expect(formatTime(125)).toBe('2 minutes and 5 seconds');
  });

  it('handles large values', () => {
    expect(formatTime(3661)).toBe('61 minutes and 1 second');
  });
});

describe('hasVisualAccessibilityOn', () => {
  const mockMatchMedia = (matchesCb: (query: string) => boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => ({ matches: matchesCb(query) })),
    });
  };

  beforeEach(() => {
    // Reset all media queries to false
    mockMatchMedia(() => false);
  });

  it('returns true for reduced motion preference', () => {
    mockMatchMedia((query) => query === '(prefers-reduced-motion: reduce)');
    expect(hasVisualAccessibilityOn()).toBe(true);
  });

  it('returns true for high contrast preference', () => {
    mockMatchMedia((query) => query === '(prefers-contrast: high)');
    expect(hasVisualAccessibilityOn()).toBe(true);
  });

  it('returns true for more contrast preference', () => {
    mockMatchMedia((query) => query === '(prefers-contrast: more)');
    expect(hasVisualAccessibilityOn()).toBe(true);
  });

  it('returns false when no accessibility preferences are set', () => {
    mockMatchMedia(() => false);
    expect(hasVisualAccessibilityOn()).toBe(false);
  });
});

describe('isDifficulty', () => {
  it('should return true for valid difficulty values', () => {
    expect(isDifficulty('beginner')).toBe(true);
    expect(isDifficulty('intermediate')).toBe(true);
    expect(isDifficulty('expert')).toBe(true);
  });

  it('should return false for invalid difficulty values', () => {
    expect(isDifficulty('easy')).toBe(false);
    expect(isDifficulty('hard')).toBe(false);
    expect(isDifficulty('advanced')).toBe(false);
    expect(isDifficulty('')).toBe(false);
    expect(isDifficulty('BEGINNER')).toBe(false); // case sensitive
  });

  it('should handle special characters and whitespace', () => {
    expect(isDifficulty(' beginner')).toBe(false);
    expect(isDifficulty('beginner ')).toBe(false);
    expect(isDifficulty('begin-ner')).toBe(false);
    expect(isDifficulty('beginner!')).toBe(false);
  });
});

describe('getDifficulty', () => {
  // Mock localStorage
  const mockedLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: mockedLocalStorage });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return stored difficulty for all valid values', () => {
    const validDifficulties = ['beginner', 'intermediate', 'expert'];
    validDifficulties.forEach((difficulty) => {
      mockedLocalStorage.getItem.mockReturnValue(difficulty);
      expect(getDifficulty()).toBe(difficulty);
    });
  });

  it('should return default "beginner" when localStorage returns null', () => {
    mockedLocalStorage.getItem.mockReturnValue(null);
    const result = getDifficulty();
    expect(result).toBe('beginner');
  });

  it('should return default "beginner" when stored value is invalid', () => {
    mockedLocalStorage.getItem.mockReturnValue('invalidValue');
    expect(getDifficulty()).toBe('beginner');
  });
});
