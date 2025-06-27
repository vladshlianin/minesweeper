import type { Difficulty } from './types';

/**
 * Creates a 2D square array filled with the specified initial value.
 * @param value - The initial value to fill each cell with
 * @param size - The size of the square array (both width and height)
 * @throws Throws an error if size is negative
 * @returns A 2D array of size × size filled with the given value
 * @example
 * // Create a 3x3 grid filled with 'E' string
 * const grid = create2dArray(0, true);
 * // Returns: [['E', 'E', 'E'], ['E', 'E', 'E'], ['E', 'E", 'E']]
 */
export const create2dArray = <T>(value: T, size: number): T[][] => {
  if (size < 0) throw new Error('Size must be non-negative');
  return Array.from(Array(size), () => Array(size).fill(value));
};

/**
 * Creates a debounced version of a function that delays execution until after
 * the specified interval has passed since the last time it was called.
 * @param interval - The delay in ms
 * @param callback - Callback function
 * @returns A debounced version of the callback function
 * @example
 * const debouncedSearch = debounce(() => {
 *   console.log('Resize');
 * }, 300);
 *
 * // Call multiple times quickly - only the last call will execute after 300ms
 * debouncedSearch();
 * debouncedSearch();
 * debouncedSearch();
 */
export const debounce = (cb: () => void, interval: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return () => {
    // Check for null specifically, since in vitest / node environment it's NodeJS.Timeout
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(cb, interval);
  };
};

/**
 * Formats a duration in seconds into a human-readable string.
 * @param seconds - Duration in seconds
 * @returns Formatted string
 *
 * @note Game session is not intended to run for a long time,
 * so the largest time unit is a minute
 *
 * @example
 * formatTime(1); // Returns: "1 second"
 * formatTime(45); // Returns: "45 seconds"
 * formatTime(90); // Returns: "1 minute and 30 seconds"
 * formatTime(120); // Returns: "2 minutes and 0 seconds"
 */
export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins} minute${mins !== 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''}`;
  }
  return `${secs} second${secs !== 1 ? 's' : ''}`;
};

/**
 * Checks if the user has visual accessibility preferences enabled.
 * This includes reduced motion, high contrast, or increased contrast settings.
 * @returns Boolean indicating whether any of
 * the visual accessibility preferences above is enabled
 */
export const hasVisualAccessibilityOn = (): boolean => {
  return (
    // Either reduced motion
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    // Or high contrast on
    window.matchMedia('(prefers-contrast: high)').matches ||
    window.matchMedia('(prefers-contrast: more)').matches
  );
};

const DIFFICULTIES = new Set<Difficulty | string>(['beginner', 'intermediate', 'expert']);

/**
 * Type guard function that checks if a given string is a valid Difficulty value.
 * @returns Boolean indicating whether input is of Difficulty type
 */
export const isDifficulty = (data: string): data is Difficulty => {
  return typeof data === 'string' && DIFFICULTIES.has(data);
};

/**
 * Retrieves the current difficulty setting from localStorage with fallback to default.
 * @returns The current difficulty setting, guaranteed to be a valid Difficulty value
 */
export const getDifficulty = (): Difficulty => {
  const fromStorage = localStorage.getItem('difficulty');
  if (typeof fromStorage === 'string' && isDifficulty(fromStorage)) {
    return fromStorage;
  }
  return 'beginner';
};
