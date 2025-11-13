import { useEffect, useState, useCallback } from 'react';
import { PROXY_CONFIG } from '../proxy';

interface GeoBlockDetectionState {
  isBlocked: boolean | null; // null = проверяется, true = блокировка, false = нормально
  detectionError: string | null;
  lastCheckTime: number;
  proxyRequired: boolean;
}

export function useGeoProxyDetection() {
  const [state, setState] = useState<GeoBlockDetectionState>({
    isBlocked: null,
    detectionError: null,
    lastCheckTime: 0,
    proxyRequired: false,
  });

  // Проверка доступности прямого подключения к Google AI
  const checkDirectConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      // Попытка напрямую подключиться к Google AI (без прокси)
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models?key=test',
        {
          method: 'GET',
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // 401 Unauthorized = нормально, сервер доступен
      // 403 Forbidden может быть гео-блокировка или auth ошибка
      if (response.status === 401) {
        return true; // Сервер доступен
      }

      if (response.status === 403) {
        const text = await response.text();
        if (text.includes('User location is not supported')) {
          return false; // Это точно гео-блокировка
        }
        return true; // Другая 403, возможно auth
      }

      return true; // Другие коды = сервер доступен
    } catch (error: any) {
      // Timeout, network error, CORS = предположительно блокировка или сеть
      if (error.name === 'AbortError') {
        console.warn('🌐 Direct connection timeout - likely geo-blocked');
        return false;
      }

      // CORS error также может быть признаком блокировки на уровне провайдера
      console.warn('🌐 Direct connection failed:', error.message);
      return false;
    }
  }, []);

  // Проверка доступности прокси
  const checkProxyConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${PROXY_CONFIG.HEALTH_ENDPOINT}`, // Используем health endpoint из конфига
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('🌐 Proxy connection check failed:', error);
      return false;
    }
  }, []);

  // Автодетект блокировки
  const detectGeoBlocking = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isBlocked: null,
      detectionError: null,
    }));

    try {
      // Сначала проверяем прямое подключение
      const directWorks = await checkDirectConnection();

      if (directWorks) {
        console.log('✅ Direct connection works - no proxy needed');
        setState({
          isBlocked: false,
          detectionError: null,
          lastCheckTime: Date.now(),
          proxyRequired: false,
        });
        return;
      }

      // Прямое не работает, проверяем прокси
      const proxyWorks = await checkProxyConnection();

      if (proxyWorks) {
        console.log('⚠️ Direct connection blocked - using proxy');
        setState({
          isBlocked: true,
          detectionError: null,
          lastCheckTime: Date.now(),
          proxyRequired: true,
        });
      } else {
        // Ни прямое, ни прокси не работают
        console.error('❌ Both direct and proxy connections failed');
        setState({
          isBlocked: true,
          detectionError: 'Neither direct nor proxy connection available',
          lastCheckTime: Date.now(),
          proxyRequired: true, // Всё равно включаем прокси на случай
        });
      }
    } catch (error: any) {
      console.error('Detection error:', error);
      setState({
        isBlocked: null,
        detectionError: error.message,
        lastCheckTime: Date.now(),
        proxyRequired: false,
      });
    }
  }, [checkDirectConnection, checkProxyConnection]);

  // Автоматический детект при загрузке
  useEffect(() => {
    detectGeoBlocking();

    // Переопроверять каждые 5 минут (в случае если подключение восстановилось)
    const interval = setInterval(detectGeoBlocking, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...state,
    detectGeoBlocking,
    manualCheck: detectGeoBlocking,
  };
}