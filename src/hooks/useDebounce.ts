import { useState, useEffect } from "react";

/**
 * Standard debounce hook that delays updating the returned value
 * until after the specified delay has elapsed since the last change.
 * Ensures fluid, 60fps typing without dropped keystrokes or UI lag.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

