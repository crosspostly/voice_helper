import { useState, useCallback } from 'react';
import { usePersistentState } from './usePersistentState';

export type LogLevel = 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  message: string;
  level: LogLevel;
}

interface UseLoggerOptions {
  maxLogEntries?: number;
  enablePersistence?: boolean;
  minLevel?: LogLevel;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Hook for application logging with configurable retention and filtering
 */
export function useLogger(options: UseLoggerOptions = {}) {
  const {
    maxLogEntries = 100,
    enablePersistence = process.env.NODE_ENV === 'development',
    minLevel = 'DEBUG'
  } = options;

  const [logs, setLogs] = usePersistentState<LogEntry[]>(
    enablePersistence ? 'app-logs' : 'temp-logs',
    []
  );

  const log = useCallback((message: string, level: LogLevel = 'INFO') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry: LogEntry = { timestamp, message, level };
    
    // Console output
    const fullMessage = `[${timestamp}] ${message}`;
    switch (level) {
      case 'ERROR':
        console.error(fullMessage);
        break;
      case 'WARN':
        console.warn(fullMessage);
        break;
      case 'DEBUG':
        console.debug(fullMessage);
        break;
      default:
        console.log(fullMessage);
    }

    // Only store if level meets minimum threshold
    if (LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel]) {
      setLogs(prevLogs => {
        const newLogs = [...prevLogs, logEntry];
        // Trim to max entries
        return newLogs.slice(-maxLogEntries);
      });
    }
  }, [maxLogEntries, minLevel, setLogs]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, [setLogs]);

  const getFilteredLogs = useCallback((filterLevel?: LogLevel) => {
    const level = filterLevel || minLevel;
    return logs.filter(log => LEVEL_PRIORITY[log.level] >= LEVEL_PRIORITY[level]);
  }, [logs, minLevel]);

  return {
    logs,
    log,
    clearLogs,
    getFilteredLogs,
    logCount: logs.length,
  };
}