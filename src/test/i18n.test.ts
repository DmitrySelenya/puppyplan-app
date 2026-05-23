import { shellI18nKeys } from '@/contracts/navigation';
import { i18n, i18nResources, supportedLocales, type SupportedLocale } from '@/lib/i18n';

type FlattenedStrings = Record<string, string>;

function resolveKey(source: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((value, segment) => {
    if (value && typeof value === 'object' && segment in value) {
      return (value as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

function flattenStrings(source: unknown, prefix = ''): FlattenedStrings {
  if (typeof source === 'string') {
    return {
      [prefix]: source,
    };
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }

  return Object.entries(source).reduce<FlattenedStrings>((strings, [key, value]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;

    return {
      ...strings,
      ...flattenStrings(value, nextPrefix),
    };
  }, {});
}

function placeholderNames(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_-]*)\}/g)]
    .map((match) => match[1])
    .sort();
}

function flattenedLocale(locale: SupportedLocale): FlattenedStrings {
  return flattenStrings(i18nResources[locale].translation);
}

function userFacingStringEntries(locale: SupportedLocale): [string, string][] {
  return Object.entries(flattenedLocale(locale)).filter(([key]) => !key.includes('._comment'));
}

describe('i18n scaffold resources', () => {
  it('keeps the MVP startup locales in the expected order', () => {
    expect(supportedLocales).toEqual(['en', 'ru', 'es']);
    expect(Object.keys(i18nResources).sort()).toEqual(['en', 'es', 'ru']);
  });

  it.each(supportedLocales)('resolves every shell key for %s', async (locale) => {
    await i18n.changeLanguage(locale);

    for (const key of shellI18nKeys) {
      const rawValue = resolveKey(i18nResources[locale].translation, key);
      expect(typeof rawValue).toBe('string');
      expect((rawValue as string).trim()).not.toBe('');
      expect(i18n.t(key)).toBe(rawValue);
      expect(i18n.t(key)).not.toBe(key);
    }
  });

  it('keeps placeholder parity for every EN/RU/ES string', () => {
    const englishStrings = Object.fromEntries(userFacingStringEntries('en'));

    for (const key of Object.keys(englishStrings)) {
      const englishPlaceholders = placeholderNames(englishStrings[key] ?? '');

      for (const locale of supportedLocales) {
        const localizedValue = flattenedLocale(locale)[key];

        expect(localizedValue).toBeDefined();
        expect(placeholderNames(localizedValue ?? '')).toEqual(englishPlaceholders);
      }
    }
  });

  it('tracks every count-bearing string in the startup locales', async () => {
    const englishCountKeys = userFacingStringEntries('en')
      .filter(([, value]) => value.includes('{n}'))
      .map(([key]) => key)
      .sort();

    expect(englishCountKeys).toEqual([
      'more.quick-trackers.screen-title-template',
      'onboarding.tracker-picker.counter',
      'quick-log.duplicate-warning.more-matches',
      'reminders.sitter-card.subtitle-template',
      'sharing.card-management.row-status-expiring',
      'sharing.common.expires-in-days',
      'sharing.common.expires-soon',
      'sharing.trainer.accepted-view.summary-feedings',
      'sharing.trainer.accepted-view.summary-potty',
      'sharing.trainer.accepted-view.summary-walks',
      'timeline.time.minutes-ago',
      'today.activity-strip.multiple',
      'today.weekly-example.feedings-line',
      'today.weekly-example.walks-line',
    ]);

    for (const locale of supportedLocales) {
      await i18n.changeLanguage(locale);

      const countKeys = userFacingStringEntries(locale)
        .filter(([, value]) => value.includes('{n}'))
        .map(([key]) => key)
        .sort();

      expect(countKeys).toEqual(englishCountKeys);

      for (const key of countKeys) {
        const rendered = i18n.t(key, {
          actorName: 'Caregiver A',
          name: 'Caregiver A',
          n: 2,
          perDay: 1,
        });

        expect(rendered).not.toContain('{n}');
      }
    }
  });
});
