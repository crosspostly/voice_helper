import { useState, useEffect, useRef, useCallback } from 'react';

export const SESSION_MAX_DURATION = 4.5 * 60 * 1000; // 4.5 minutes in milliseconds

interface UseAutoReconnectTimerOptions {
  maxDuration?: number;
  warningThreshold?: number; // Time before session ends to show warning (ms)
}

interface UseAutoReconnectTimerReturn {
  sessionStartTime: number;
  sessionTimeLeft: number;
  isActive: boolean;
  shouldReconnect: () => boolean;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  getElapsed: () => number;
}

/**
 * Hook for managing session duration and auto-reconnect timing
 */
export function useAutoReconnectTimer(options: UseAutoReconnectTimerOptions = {}): UseAutoReconnectTimerReturn {
  const { 
    maxDuration = SESSION_MAX_DURATION,
    warningThreshold = 30000 // 30 seconds before timeout
  } = options;

  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  
  const intervalRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const updateSessionTime = useCallback(() => {
    const now = Date.now();
    const elapsed = now - sessionStartTime;
    const left = Math.max(0, maxDuration - elapsed);
    
    setSessionTimeLeft(Math.floor(left / 1000)); // Convert to seconds
    
    // Check if session should reconnect
    if (elapsed >= maxDuration && isActive) {
      // Auto-reconnect should be triggered by the consumer
      setIsActive(false);
      clearTimer();
    }
  }, [sessionStartTime, maxDuration, isActive, clearTimer]);

  const startTimer = useCallback(() => {
    const startTime = Date.now();
    setSessionStartTime(startTime);
    setIsActive(true);
    
    clearTimer();
    
    // Update time every second
    intervalRef.current = window.setInterval(updateSessionTime, 1000);
    
    // Initial update
    updateSessionTime();
  }, [clearTimer, updateSessionTime]);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    clearTimer();
    setSessionTimeLeft(0);
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    stopTimer();
    startTimer();
  }, [stopTimer, startTimer]);

  const shouldReconnect = useCallback(() => {
    if (sessionStartTime === 0) return false;
    const elapsed = Date.now() - sessionStartTime;
    return elapsed >= maxDuration;
  }, [sessionStartTime, maxDuration]);

  const getElapsed = useCallback(() => {
    if (sessionStartTime === 0) return 0;
    return Date.now() - sessionStartTime;
  }, [sessionStartTime]);

  // Cleanup on unmount
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  // Auto-stop when time runs out
  useEffect(() => {
    if (isActive && sessionTimeLeft <= 0) {
      setIsActive(false);
      clearTimer();
    }
  }, [isActive, sessionTimeLeft, clearTimer]);

  return {
    sessionStartTime,
    sessionTimeLeft,
    isActive,
    shouldReconnect,
    startTimer,
    stopTimer,
    resetTimer,
    getElapsed,
  };
}