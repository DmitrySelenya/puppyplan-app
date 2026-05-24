import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import en from '../../../STRINGS.en.json';
import es from '../../../STRINGS.es.json';
import ru from '../../../STRINGS.ru.json';

type JoinKey<Prefix extends string, Key extends string> = Prefix extends '' ? Key : `${Prefix}.${Key}`;
type UserFacingSegment<Prefix extends string, Key extends string> = Key extends `_${string}`
  ? never
  : Prefix extends ''
    ? Key extends '$meta' | 'voice'
      ? never
      : Key
    : Key;

type StringLeafPaths<Value, Prefix extends string = ''> = Value extends string
  ? Prefix
  : Value extends readonly (infer Item)[]
    ? StringLeafPaths<Item, JoinKey<Prefix, `${number}`>>
    : Value extends object
      ? {
          [Key in keyof Value & string]: UserFacingSegment<Prefix, Key> extends never
            ? never
            : StringLeafPaths<Value[Key], JoinKey<Prefix, Key>>;
        }[keyof Value & string]
      : never;

export const supportedLocales = ['en', 'ru', 'es'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export type I18nKey = StringLeafPaths<typeof en>;
export type I18nTOptions = Record<string, string | number | boolean>;
export type AppTranslate = (key: I18nKey, options?: I18nTOptions) => string;

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
      prefix: '{',
      suffix: '}',
    },
    lng: 'en',
    resources: i18nResources,
  });
}

export const t: AppTranslate = (key, options) => i18n.t(key, options ?? {});

export function useAppTranslation() {
  const translation = useTranslation();
  const translate = translation.t as AppTranslate;

  return {
    t: translate,
    ready: translation.ready,
  };
}

export { i18n };
