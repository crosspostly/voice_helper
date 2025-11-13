import { useState, useCallback } from 'react';

export interface ProxyMetric {
  timestamp: number;
  type: 'direct' | 'proxy';
  operation: 'websocket' | 'http' | 'tts';
  success: boolean;
  duration: number; // ms
  error?: string;
  responseSize?: number; // bytes
}

export interface ProxyStats {
  totalRequests: number;
  directRequests: number;
  proxyRequests: number;
  directSuccessRate: number; // %
  proxySuccessRate: number; // %
  avgDirectLatency: number; // ms
  avgProxyLatency: number; // ms
  lastDirectError?: string;
  lastProxyError?: string;
}

class ProxyMetricsCollector {
  private metrics: ProxyMetric[] = [];
  private readonly MAX_METRICS = 1000; // Хранить последние 1000 метрик

  // Записать метрику
  recordMetric(metric: ProxyMetric) {
    this.metrics.push(metric);

    // Ограничить размер массива в памяти
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Отправить на аналитику (опционально)
    this.sendToAnalytics(metric);

    // Логировать в консоль (dev mode)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `📊 [${metric.type.toUpperCase()}] ${metric.operation} - ${
          metric.success ? '✅' : '❌'
        } ${metric.duration}ms`
      );
    }
  }

  // Получить статистику
  getStats(): ProxyStats {
    const direct = this.metrics.filter((m) => m.type === 'direct');
    const proxy = this.metrics.filter((m) => m.type === 'proxy');

    const directSuccess = direct.filter((m) => m.success).length;
    const proxySuccess = proxy.filter((m) => m.success).length;

    const avgDirectLatency =
      direct.length > 0
        ? direct.reduce((sum, m) => sum + m.duration, 0) / direct.length
        : 0;

    const avgProxyLatency =
      proxy.length > 0
        ? proxy.reduce((sum, m) => sum + m.duration, 0) / proxy.length
        : 0;

    const lastDirectError = direct
      .reverse()
      .find((m) => m.error)?.error;
    const lastProxyError = proxy.reverse().find((m) => m.error)?.error;

    return {
      totalRequests: this.metrics.length,
      directRequests: direct.length,
      proxyRequests: proxy.length,
      directSuccessRate:
        direct.length > 0 ? (directSuccess / direct.length) * 100 : 0,
      proxySuccessRate:
        proxy.length > 0 ? (proxySuccess / proxy.length) * 100 : 0,
      avgDirectLatency,
      avgProxyLatency,
      lastDirectError,
      lastProxyError,
    };
  }

  // Получить все метрики (для экспорта/отправки)
  getMetrics(): ProxyMetric[] {
    return [...this.metrics];
  }

  // Очистить метрики
  clear() {
    this.metrics = [];
  }

  // Отправить на сервер аналитики
  private sendToAnalytics(metric: ProxyMetric) {
    // Batching: отправлять каждые 10 метрик или каждые 30 сек
    if (this.metrics.length % 10 === 0) {
      // Отправить батч на /api/analytics
      const batch = this.metrics.slice(-10);
      fetch('/api/analytics/proxy-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: batch,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          locale: navigator.language,
        }),
      }).catch((err) => console.error('Analytics send failed:', err));
    }
  }
}

export const metricsCollector = new ProxyMetricsCollector();

// Hook для использования в компонентах
export function useProxyMetrics() {
  const [stats, setStats] = useState<ProxyStats | null>(null);

  const recordMetric = useCallback(
    (metric: ProxyMetric) => {
      metricsCollector.recordMetric(metric);
      setStats(metricsCollector.getStats());
    },
    []
  );

  const getStats = useCallback(() => {
    const s = metricsCollector.getStats();
    setStats(s);
    return s;
  }, []);

  const getMetrics = useCallback(() => {
    return metricsCollector.getMetrics();
  }, []);

  const exportMetrics = useCallback(() => {
    const data = {
      stats: metricsCollector.getStats(),
      metrics: metricsCollector.getMetrics(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }, []);

  const clearMetrics = useCallback(() => {
    metricsCollector.clear();
    setStats(null);
  }, []);

  return {
    stats,
    recordMetric,
    getStats,
    getMetrics,
    exportMetrics,
    clearMetrics,
  };
}