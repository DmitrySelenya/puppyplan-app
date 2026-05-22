import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../../../STRINGS.en.json';
import es from '../../../STRINGS.es.json';
import ru from '../../../STRINGS.ru.json';

export const supportedLocales = ['en', 'ru', 'es'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const i18nResources = {
  en: { translation: en },
  es: { translation: es },
  ru: { translation: ru },
} as const;

const i18n = createInstance();

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    fallbackLng: 'en',
    initImmediate: false,
    interpolation: {
      escapeValue: false,
    },
    lng: 'en',
    resources: i18nResources,
  });
}

export { i18n };
