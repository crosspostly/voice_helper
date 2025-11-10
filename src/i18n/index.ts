import { en } from './en';
import { ru } from './ru';

export type SupportedLocale = 'en' | 'ru';

export type LocaleStrings = typeof en;

const locales = {
  en,
  ru,
} as const;

export function getLocaleStrings(locale: SupportedLocale): LocaleStrings {
  return locales[locale];
}

export { en, ru };