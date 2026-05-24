import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectI18nIssues,
  collectSourceI18nIssues,
  compactStringBudgets,
  countGraphemes,
  extractStaticTranslationKeys,
  flattenUserFacingStrings,
  formatI18nIssue,
  sourceUsesRawUseTranslation,
} from './check-i18n.mjs';

const baseLocales = {
  en: {
    tabs: {
      today: 'Today',
    },
    quick: {
      action: 'Save {n}',
      actions: ['Done', 'Skip'],
      duplicate: 'Looks like a duplicate from the last 60 seconds.',
    },
    voice: {
      forbidden: ['do not translate this policy list'],
    },
    $meta: {
      language: 'en',
    },
  },
  ru: {
    tabs: {
      today: 'Сегодня',
    },
    quick: {
      action: 'Сохранить {n}',
      actions: ['Готово', 'Пропустить'],
      duplicate: 'Похоже, это дубликат за последние 60 секунд.',
    },
    voice: {
      forbidden: [],
    },
    $meta: {
      language: 'ru',
      translatedFrom: 'STRINGS.en.json',
    },
  },
  es: {
    tabs: {
      today: 'Hoy',
    },
    quick: {
      action: 'Guardar {n}',
      actions: ['Hecho', 'Saltar'],
      duplicate: 'Parece un duplicado de los últimos 60 segundos.',
    },
    voice: {
      forbidden: ['lista de política, no UI'],
    },
    $meta: {
      language: 'es',
      translatedFrom: 'STRINGS.en.json',
    },
  },
};

test('flattens every user-facing string leaf including arrays while excluding metadata and voice policy', () => {
  assert.deepEqual([...flattenUserFacingStrings(baseLocales.en).keys()].sort(), [
    'quick.action',
    'quick.actions.0',
    'quick.actions.1',
    'quick.duplicate',
    'tabs.today',
  ]);
});

test('reports full EN/RU/ES leaf parity issues for arrays, not only shell object keys', () => {
  const locales = structuredClone(baseLocales);
  locales.ru.quick.actions.pop();

  const issues = collectI18nIssues(locales, {
    budgetDefinitions: [],
    duplicateWarningKeys: [],
  });

  assert.deepEqual(
    issues.map(formatI18nIssue),
    [
      'i18n parity: locale=ru key=quick.actions.1 issue=missing',
    ],
  );
});

test('reports extra locale keys that are missing from the English master', () => {
  const locales = structuredClone(baseLocales);
  locales.es.quick.extra = 'No está en inglés';

  const issues = collectI18nIssues(locales, {
    budgetDefinitions: [],
    duplicateWarningKeys: [],
  });

  assert.deepEqual(
    issues.map(formatI18nIssue),
    [
      'i18n parity: locale=es key=quick.extra issue=extra',
    ],
  );
});

test('keeps placeholder parity and count-bearing key parity tied to the English master', () => {
  const locales = structuredClone(baseLocales);
  locales.es.quick.action = 'Guardar';

  const issues = collectI18nIssues(locales, {
    budgetDefinitions: [],
    duplicateWarningKeys: [],
  });

  assert.deepEqual(
    issues.map(formatI18nIssue),
    [
      'i18n placeholder parity: locale=es key=quick.action expected={n} actual=',
      'i18n count parity: locale=es key=quick.action expected=count-bearing actual=missing-count',
    ],
  );
});

test('reports string-budget failures with locale, key, category, actual length, and limit', () => {
  const locales = structuredClone(baseLocales);
  locales.es.tabs.today = 'Etiqueta demasiado larga';

  const issues = collectI18nIssues(locales, {
    budgetDefinitions: [
      {
        category: 'tabs',
        limit: 10,
        keyPattern: /^tabs\./,
      },
    ],
    duplicateWarningKeys: [],
  });

  assert.deepEqual(
    issues.map(formatI18nIssue),
    [
      'i18n string budget: locale=es key=tabs.today category=tabs actual=24 limit=10',
    ],
  );
});

test('reports every matching string-budget category for a single key', () => {
  const locales = structuredClone(baseLocales);
  locales.en.quick.action = 'Save this very long count-bearing action {n}';

  const issues = collectI18nIssues(locales, {
    budgetDefinitions: [
      {
        category: 'primary-actions',
        limit: 40,
        keyPattern: /^quick\.action$/,
      },
      {
        category: 'compact-actions',
        limit: 43,
        keyPattern: /\.action$/,
      },
    ],
    duplicateWarningKeys: [],
  });

  assert.deepEqual(
    issues.map(formatI18nIssue),
    [
      'i18n string budget: locale=en key=quick.action category=primary-actions actual=44 limit=40',
      'i18n string budget: locale=en key=quick.action category=compact-actions actual=44 limit=43',
    ],
  );
});

test('requires duplicate-warning copy to say last 60 seconds in every startup locale', () => {
  const locales = structuredClone(baseLocales);
  locales.en.quick.duplicate = 'Looks like a duplicate from the last minute.';

  const issues = collectI18nIssues(locales, {
    budgetDefinitions: [],
    duplicateWarningKeys: ['quick.duplicate'],
  });

  assert.deepEqual(
    issues.map(formatI18nIssue),
    [
      'i18n duplicate-warning copy: locale=en key=quick.duplicate issue=missing-last-60-seconds',
    ],
  );
});

test('accepts representative Russian and Spanish last-60-second duplicate-warning copy', () => {
  const issues = collectI18nIssues(baseLocales, {
    budgetDefinitions: [],
    duplicateWarningKeys: ['quick.duplicate'],
  });

  assert.deepEqual(issues.map(formatI18nIssue), []);
});

test('compact budget categories cover the required Phase 6A surfaces', () => {
  assert.deepEqual(
    compactStringBudgets.map((budget) => budget.category),
    [
      'tabs',
      'fab-labels',
      'fab-cta-labels',
      'pills-status-labels',
      'tracker-tile-labels',
      'notification-actions',
      'compact-row-status',
    ],
  );
});

test('compact budgets include current CTA and compact action surfaces', () => {
  const expectedBudgetedKeys = new Map([
    ['states.empty-first-run.action', 'fab-cta-labels'],
    ['today.hero.day1-cta', 'fab-cta-labels'],
    ['today.hero.potty-time-primary', 'fab-cta-labels'],
    ['quick-log.duplicate-warning.primary-alt', 'fab-cta-labels'],
    ['reminders.card.actions.1', 'notification-actions'],
    ['reminders.sitter-card.actions.0', 'notification-actions'],
    ['reminders.missed.actions.0', 'notification-actions'],
    ['timeline.swipe-actions.0', 'notification-actions'],
    ['timeline.overflow-actions.0', 'notification-actions'],
    ['timeline.pending-overflow-actions.0', 'notification-actions'],
  ]);

  for (const [key, expectedCategory] of expectedBudgetedKeys) {
    assert.ok(
      compactStringBudgets.some(
        (budget) => budget.category === expectedCategory && budget.keyPattern.test(key),
      ),
      `${key} must be covered by ${expectedCategory}`,
    );
  }
});

test('extracts static typed translation keys and rejects dynamic template keys', () => {
  assert.deepEqual(
    extractStaticTranslationKeys("t('tabs.today'); t(\"tabs.health\"); t(`tabs.more`);"),
    ['tabs.today', 'tabs.health', 'tabs.more'],
  );

  assert.throws(
    () => extractStaticTranslationKeys('t(`tabs.${id}`);'),
    /i18n keys must be static literals/,
  );
});

test('detects raw react-i18next useTranslation usage in shell UI sources', () => {
  assert.equal(
    sourceUsesRawUseTranslation("import { useTranslation } from 'react-i18next';"),
    true,
  );
  assert.equal(sourceUsesRawUseTranslation("import { useAppTranslation } from '@/lib/i18n';"), false);
});

test('reports raw react-i18next imports outside allowed i18n boundaries', () => {
  const issues = collectSourceI18nIssues(
    [
      [
        'src/features/foo/screens/FooScreen.tsx',
        "import { useTranslation } from 'react-i18next';",
      ],
      [
        'src/lib/i18n/index.ts',
        "import { useTranslation } from 'react-i18next';",
      ],
    ],
    {
      allowedRawUseTranslationFiles: new Set(['src/lib/i18n/index.ts']),
    },
  );

  assert.deepEqual(issues, [
    'src/features/foo/screens/FooScreen.tsx imports raw react-i18next useTranslation; use useAppTranslation',
  ]);
});

test('reports raw i18n runtime imports outside allowed i18n boundaries', () => {
  const issues = collectSourceI18nIssues([
    [
      'src/features/foo/screens/FooScreen.tsx',
      "import { i18n } from '@/lib/i18n'; export function Foo(){ return i18n.t('tabs.typo'); }",
    ],
  ]);

  assert.deepEqual(issues, [
    'src/features/foo/screens/FooScreen.tsx imports raw i18n runtime; use typed t or useAppTranslation',
  ]);
});

test('reports raw i18n namespace imports outside allowed i18n boundaries', () => {
  const issues = collectSourceI18nIssues([
    [
      'src/features/foo/screens/FooScreen.tsx',
      "import * as AppI18n from '@/lib/i18n'; export function Foo(){ return AppI18n.i18n.t('tabs.today'); }",
    ],
  ]);

  assert.deepEqual(issues, [
    'src/features/foo/screens/FooScreen.tsx imports raw i18n runtime; use typed t or useAppTranslation',
  ]);
});

test('reports static translation keys missing from the English master', () => {
  const validTranslationKeys = new Set(flattenUserFacingStrings(baseLocales.en).keys());
  const issues = collectSourceI18nIssues(
    [
      [
        'src/features/foo/screens/FooScreen.tsx',
        "const action = t('quick.actions.999');",
      ],
    ],
    {
      validTranslationKeys,
    },
  );

  assert.deepEqual(issues, [
    'src/features/foo/screens/FooScreen.tsx uses unknown i18n key: quick.actions.999',
  ]);
});

test('reports dynamic typed translation keys through the issue pipeline', () => {
  const issues = collectSourceI18nIssues([
    ['src/features/foo/screens/FooScreen.tsx', 'const label = t(`tabs.${id}`);'],
  ]);

  assert.deepEqual(issues, [
    'src/features/foo/screens/FooScreen.tsx i18n keys must be static literals: tabs.${id}',
  ]);
});

test('counts graphemes without splitting accents or emoji-style code points', () => {
  assert.equal(countGraphemes('Más'), 3);
  assert.equal(countGraphemes('cachorro 🐶'), 10);
});
