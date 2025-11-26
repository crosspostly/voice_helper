// proxyConfig.ts
// Конфигурация прокси для обхода блокировок

export interface ProxyConfig {
  enabled: boolean;
  workerUrl: string;
  autoDetectRussia: boolean;
}

// URL Cloudflare Worker (без слэша в конце чтобы избежать двойных слэшей)
const CLOUDFLARE_WORKER_URL = 'https://subbot.sheepoff.workers.dev';

const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  enabled: false,
  workerUrl: CLOUDFLARE_WORKER_URL,
  autoDetectRussia: true,
};

const RUSSIAN_TIMEZONES = [
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Europe/Samara',
  'Europe/Volgograd',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
];

const safeGetLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage ?? null;
  } catch (error) {
    console.warn('Failed to access localStorage for proxy config:', error);
    return null;
  }
};

const getManualSetting = (): string | null => {
  const storage = safeGetLocalStorage();
  if (!storage) return null;
  try {
    return storage.getItem('proxyEnabled');
  } catch (error) {
    console.warn('Failed to read proxyEnabled from localStorage:', error);
    return null;
  }
};

const setManualSetting = (value: string | null): void => {
  const storage = safeGetLocalStorage();
  if (!storage) return;
  try {
    if (value === null) {
      storage.removeItem('proxyEnabled');
    } else {
      storage.setItem('proxyEnabled', value);
    }
  } catch (error) {
    console.warn('Failed to persist proxyEnabled to localStorage:', error);
  }
};

const detectRussianTimezone = (): boolean => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return Boolean(timezone && RUSSIAN_TIMEZONES.includes(timezone));
  } catch {
    return false;
  }
};

const detectRussianLanguage = (): boolean => {
  try {
    return typeof navigator !== 'undefined' &&
      typeof navigator.language === 'string' &&
      navigator.language.toLowerCase().startsWith('ru');
  } catch {
    return false;
  }
};

const isRussianUser = (): boolean => {
  return detectRussianTimezone() || detectRussianLanguage();
};

export const getProxyConfig = (): ProxyConfig => {
  const manualSetting = getManualSetting();

  if (manualSetting !== null) {
    return {
      enabled: manualSetting === 'true',
      workerUrl: CLOUDFLARE_WORKER_URL,
      autoDetectRussia: false,
    };
  }

  if (typeof window === 'undefined') {
    return { ...DEFAULT_PROXY_CONFIG };
  }

  const autoEnabled = isRussianUser();

  return {
    enabled: autoEnabled,
    workerUrl: CLOUDFLARE_WORKER_URL,
    autoDetectRussia: true,
  };
};

export const transformUrlForProxy = (originalUrl: string): string => {
  const config = getProxyConfig();

  if (!config.enabled) {
    return originalUrl;
  }

  if (originalUrl.includes('generativelanguage.googleapis.com')) {
    const sanitizedWorkerHost = config.workerUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    let transformedUrl = originalUrl.replace('generativelanguage.googleapis.com', sanitizedWorkerHost);
    
    // Fix double slashes after domain (e.g., workers.dev//ws -> workers.dev/ws)
    transformedUrl = transformedUrl.replace(/workers\.dev\/\//g, 'workers.dev/');
    
    // Fix any remaining double slashes after protocol (except after https:// or wss://)
    transformedUrl = transformedUrl.replace(/(https?:\/\/|wss?:\/\/)([^\/]+)\/\//g, '$1$2/');
    
    // Fix all other double slashes in the path (but not the protocol part)
    const protocolMatch = transformedUrl.match(/^(https?:\/\/|wss?:\/\/)/);
    if (protocolMatch) {
      const protocol = protocolMatch[1];
      const restOfUrl = transformedUrl.substring(protocol.length);
      const fixedRest = restOfUrl.replace(/\/\//g, '/');
      transformedUrl = protocol + fixedRest;
    }
    
    return transformedUrl;
  }

  return originalUrl;
};

export const setProxyEnabled = (enabled: boolean): void => {
  setManualSetting(String(enabled));
  console.log(`✅ Proxy ${enabled ? 'enabled' : 'disabled'} manually`);
};

export const resetProxyToAuto = (): void => {
  setManualSetting(null);
  console.log('✅ Proxy reset to auto-detect mode');
};
