import { useState, useEffect } from 'react';

/**
 * Safely parse a value from localStorage
 * Handles both JSON-stringified values and plain strings
 */
function safelyParseJSON<T>(value: string, fallback: T): T {
  // First, try to parse as JSON
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    // If JSON parsing fails, check if it's a plain string that matches our expected type
    // For string types, return the value as-is
    if (typeof fallback === 'string') {
      return value as unknown as T;
    }
    
    // For other types, throw the error to be caught by the caller
    throw error;
  }
}

/**
 * A hook that provides state persistence to localStorage
 * @param key The localStorage key to use
 * @param initialValue The initial value to use if no stored value exists
 * @returns [value, setValue] tuple like useState
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Get stored value from localStorage or use initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? safelyParseJSON(item, initialValue) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(safelyParseJSON(e.newValue, initialValue));
        } catch (error) {
          console.error(`Error parsing stored value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue];
}