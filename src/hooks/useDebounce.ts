import { useCallback, useRef } from 'react';

/**
 * A hook that returns a debounced version of the provided function.
 * The debounced function will delay invoking the callback until after
 * `delay` milliseconds have elapsed since the last time it was invoked.
 * 
 * @param fn The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the provided function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        fn(...args);
      }, delay);
    },
    [fn, delay]
  );
  
  return debouncedFn;
}

export default useDebounce; 