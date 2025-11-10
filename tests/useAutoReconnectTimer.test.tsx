import { renderHook, act } from '@testing-library/react';
import { useAutoReconnectTimer, SESSION_MAX_DURATION } from '../hooks/useAutoReconnectTimer';

describe('useAutoReconnectTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with timer stopped', () => {
    const { result } = renderHook(() => useAutoReconnectTimer());
    
    expect(result.current.sessionStartTime).toBe(0);
    expect(result.current.sessionTimeLeft).toBe(0);
    expect(result.current.isActive).toBe(false);
    expect(result.current.shouldReconnect()).toBe(false);
  });

  it('should start timer and update time left', () => {
    const { result } = renderHook(() => useAutoReconnectTimer());
    
    act(() => {
      result.current.startTimer();
    });
    
    expect(result.current.isActive).toBe(true);
    expect(result.current.sessionStartTime).toBeGreaterThan(0);
    expect(result.current.sessionTimeLeft).toBeGreaterThan(0);
    
    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Time should decrease by 1 second
    expect(result.current.sessionTimeLeft).toBeLessThan(Math.floor(SESSION_MAX_DURATION / 1000));
  });

  it('should stop timer', () => {
    const { result } = renderHook(() => useAutoReconnectTimer());
    
    act(() => {
      result.current.startTimer();
      result.current.stopTimer();
    });
    
    expect(result.current.isActive).toBe(false);
    expect(result.current.sessionTimeLeft).toBe(0);
  });

  it('should reset timer', () => {
    const { result } = renderHook(() => useAutoReconnectTimer());
    
    act(() => {
      result.current.startTimer();
      jest.advanceTimersByTime(5000);
      result.current.resetTimer();
    });
    
    expect(result.current.isActive).toBe(true);
    expect(result.current.sessionStartTime).toBeGreaterThan(Date.now() - 100);
  });

  it('should return correct elapsed time', () => {
    const { result } = renderHook(() => useAutoReconnectTimer());
    
    act(() => {
      result.current.startTimer();
    });
    
    const initialElapsed = result.current.getElapsed();
    expect(initialElapsed).toBeGreaterThanOrEqual(0);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    const newElapsed = result.current.getElapsed();
    expect(newElapsed).toBe(initialElapsed + 1000);
  });

  it('should trigger reconnect when time is up', () => {
    const { result } = renderHook(() => useAutoReconnectTimer());
    
    act(() => {
      result.current.startTimer();
    });
    
    // Fast forward beyond max duration
    act(() => {
      jest.advanceTimersByTime(SESSION_MAX_DURATION + 1000);
    });
    
    expect(result.current.shouldReconnect()).toBe(true);
    expect(result.current.isActive).toBe(false);
    expect(result.current.sessionTimeLeft).toBe(0);
  });

  it('should use custom max duration', () => {
    const customDuration = 60000; // 1 minute
    const { result } = renderHook(() => useAutoReconnectTimer({
      maxDuration: customDuration,
    }));
    
    act(() => {
      result.current.startTimer();
    });
    
    expect(result.current.sessionTimeLeft).toBe(Math.floor(customDuration / 1000));
    
    act(() => {
      jest.advanceTimersByTime(customDuration + 1000);
    });
    
    expect(result.current.shouldReconnect()).toBe(true);
  });

  it('should not reconnect if timer never started', () => {
    const { result } = renderHook(() => useAutoReconnectTimer());
    
    expect(result.current.shouldReconnect()).toBe(false);
    expect(result.current.getElapsed()).toBe(0);
  });

  it('should handle multiple start/stop cycles', () => {
    const { result } = renderHook(() => useAutoReconnectTimer());
    
    // First cycle
    act(() => {
      result.current.startTimer();
    });
    expect(result.current.isActive).toBe(true);
    
    act(() => {
      jest.advanceTimersByTime(2000);
      result.current.stopTimer();
    });
    expect(result.current.isActive).toBe(false);
    
    // Second cycle
    const startTime = Date.now();
    act(() => {
      result.current.startTimer();
    });
    expect(result.current.isActive).toBe(true);
    expect(result.current.sessionStartTime).toBeGreaterThanOrEqual(startTime);
  });

  it('should auto-stop when time reaches zero', () => {
    const { result } = renderHook(() => useAutoReconnectTimer());
    
    act(() => {
      result.current.startTimer();
    });
    
    expect(result.current.isActive).toBe(true);
    
    // Fast forward to exactly max duration
    act(() => {
      jest.advanceTimersByTime(SESSION_MAX_DURATION);
    });
    
    expect(result.current.sessionTimeLeft).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('should cleanup timer on unmount', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    
    const { unmount } = renderHook(() => useAutoReconnectTimer());
    
    act(() => {
      result.current.startTimer();
    });
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    
    clearIntervalSpy.mockRestore();
  });
});