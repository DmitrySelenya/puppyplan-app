import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  extractStaticTranslationKeys,
  sourceUsesRawUseTranslation,
} from './i18n-source-utils.mjs';
import { repoPath } from './load-navigation-contract.mjs';

export { extractStaticTranslationKeys, sourceUsesRawUseTranslation } from './i18n-source-utils.mjs';

const localeFiles = {
  en: 'STRINGS.en.json',
  ru: 'STRINGS.ru.json',
  es: 'STRINGS.es.json',
};

const defaultDuplicateWarningKeys = [
  'quick-log.duplicate-warning.more-matches',
  'errors.duplicate-soft',
];

const lastSixtySecondMatchers = {
  en: /\blast 60 seconds\b/i,
  ru: /последн\p{L}*\s+60\s+секунд/ui,
  es: /[úu]ltimos\s+60\s+segundos/i,
};

export const compactStringBudgets = [
  {
    category: 'tabs',
    limit: 10,
    keyPattern: /^tabs\.(diary|pet|more)$/,
  },
  {
    category: 'fab-labels',
    limit: 16,
    keyPattern: /^tabs\.quick-log-fab-label$/,
  },
  {
    category: 'fab-cta-labels',
    limit: 34,
    keyPattern:
      /(^|\.)[a-z0-9-]*cta$|(^|\.)[a-z0-9-]*primary(?:-alt)?$|(\.(action|secondary|tertiary|destructive|cancel|close|save|refresh|hide|add|stop|edit-action|delete-action)$)/,
  },
  {
    category: 'pills-status-labels',
    limit: 32,
    keyPattern:
      /(\.pill$|\.pills\.|\.chip$|\.filter-chips\.\d+$|\.segments\.\d+$|\.status-segments\.\d+$|\.status-transitions\.stages\.\d+$|\.row-status-(active|expiring|revoked)$)/,
  },
  {
    category: 'tracker-tile-labels',
    limit: 18,
    keyPattern: /^(quick-log\.trackers\.|more\.quick-trackers\.items\.\d+$)/,
  },
  {
    category: 'notification-actions',
    limit: 18,
    keyPattern:
      /(^reminders\.(card|sitter-card|missed)\.actions\.\d+$|^timeline\.(swipe-actions|overflow-actions|pending-overflow-actions)\.\d+$|\.missed-reminder-card\.actions\.\d+$|\.push-notification\.actions\.\d+$|\.push-actions\.\d+$|^guidance\.actions\.\d+$)/,
  },
  {
    category: 'compact-row-status',
    limit: 40,
    keyPattern:
      /(\.row-status-(active|expiring|revoked)$|\.sync-error-row$|\.done-snackbar$|\.stop-snackbar$|\.delete-undo-toast$|\.save-toast$|\.field-status$|\.scope-label$)/,
  },
];

const sourceRoots = ['app', 'src'];
const allowedRawUseTranslationFiles = new Set([
  'src/lib/i18n/index.ts',
  'src/lib/providers/AppProviders.tsx',
]);

function isI18nModuleSpecifier(moduleSpecifier) {
  return /(?:^@\/lib\/i18n(?:\/index)?$|(?:^|\/)lib\/i18n(?:\/index)?$)/.test(moduleSpecifier);
}

function namedImportIncludes(importClause, importName) {
  const namedImports = importClause.match(/\{([\s\S]*?)\}/);

  if (!namedImports) {
    return false;
  }

  return namedImports[1].split(',').some((specifier) => {
    const importedName = specifier.trim().split(/\s+as\s+/)[0]?.trim();

    return importedName === importName;
  });
}

function sourceUsesRawI18nRuntime(source) {
  const importDeclarations = source.matchAll(
    /\bimport\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g,
  );

  for (const [, typeKeyword, importClause, moduleSpecifier] of importDeclarations) {
    if (typeKeyword || !isI18nModuleSpecifier(moduleSpecifier)) {
      continue;
    }

    if (/\*\s+as\s+\w+/.test(importClause) || namedImportIncludes(importClause, 'i18n')) {
      return true;
    }
  }

  return false;
}

function isUserFacingKey(key) {
  const segments = key.split('.');

  return (
    !key.startsWith('$meta.') &&
    !key.startsWith('voice.') &&
    !segments.some((segment) => segment === '_comment' || segment.startsWith('_comment-'))
  );
}

function isProductionTypeScriptSource(filePath) {
  return (
    /\.(ts|tsx)$/.test(filePath) &&
    !filePath.endsWith('.test.ts') &&
    !filePath.endsWith('.test.tsx') &&
    !filePath.includes('/test/') &&
    !filePath.includes('/__tests__/')
  );
}

function listSourceFiles(directory) {
  const entries = readdirSync(repoPath(directory), { withFileTypes: true });
  const sourceFiles = [];

  for (const entry of entries) {
    const childPath = `${directory}/${entry.name}`;

    if (entry.isDirectory()) {
      sourceFiles.push(...listSourceFiles(childPath));
      continue;
    }

    if (entry.isFile() && isProductionTypeScriptSource(childPath)) {
      sourceFiles.push(childPath);
    }
  }

  return sourceFiles;
}

function productionSourceEntries() {
  return sourceRoots.flatMap((root) =>
    listSourceFiles(root).map((sourceFile) => [
      sourceFile,
      readFileSync(repoPath(sourceFile), 'utf8'),
    ]),
  );
}

export function countGraphemes(value) {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return [...segmenter.segment(value)].length;
  }

  return [...value].length;
}

export function flattenUserFacingStrings(source, prefix = '') {
  if (typeof source === 'string') {
    return isUserFacingKey(prefix) ? new Map([[prefix, source]]) : new Map();
  }

  if (!source || typeof source !== 'object') {
    return new Map();
  }

  if (Array.isArray(source)) {
    return source.reduce((strings, value, index) => {
      for (const [key, stringValue] of flattenUserFacingStrings(
        value,
        prefix ? `${prefix}.${index}` : `${index}`,
      )) {
        strings.set(key, stringValue);
      }

      return strings;
    }, new Map());
  }

  return Object.entries(source).reduce((strings, [key, value]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;

    for (const [stringKey, stringValue] of flattenUserFacingStrings(value, nextPrefix)) {
      strings.set(stringKey, stringValue);
    }

    return strings;
  }, new Map());
}

function placeholderNames(value) {
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_-]*)\}/g)]
    .map((match) => match[1])
    .sort();
}

function sameList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function collectParityIssues(localeMaps) {
  const issues = [];
  const englishKeys = new Set(localeMaps.en.keys());

  for (const [locale, strings] of Object.entries(localeMaps)) {
    if (locale === 'en') {
      continue;
    }

    for (const key of englishKeys) {
      if (!strings.has(key)) {
        issues.push({ type: 'parity', locale, key, issue: 'missing' });
      }
    }

    for (const key of strings.keys()) {
      if (!englishKeys.has(key)) {
        issues.push({ type: 'parity', locale, key, issue: 'extra' });
      }
    }
  }

  for (const [locale, strings] of Object.entries(localeMaps)) {
    for (const [key, value] of strings) {
      if (value.trim() === '') {
        issues.push({ type: 'parity', locale, key, issue: 'empty' });
      }
    }
  }

  return issues;
}

function collectPlaceholderIssues(localeMaps) {
  const issues = [];

  for (const [key, englishValue] of localeMaps.en) {
    const expectedPlaceholders = placeholderNames(englishValue);

    for (const [locale, strings] of Object.entries(localeMaps)) {
      const localizedValue = strings.get(key);

      if (localizedValue === undefined) {
        continue;
      }

      const actualPlaceholders = placeholderNames(localizedValue);
      if (!sameList(actualPlaceholders, expectedPlaceholders)) {
        issues.push({
          type: 'placeholder',
          locale,
          key,
          expected: expectedPlaceholders,
          actual: actualPlaceholders,
        });
      }
    }
  }

  return issues;
}

function collectCountIssues(localeMaps) {
  const issues = [];
  const englishCountKeys = new Set(
    [...localeMaps.en].filter(([, value]) => placeholderNames(value).includes('n')).map(([key]) => key),
  );

  for (const [locale, strings] of Object.entries(localeMaps)) {
    for (const key of englishCountKeys) {
      const localizedValue = strings.get(key);

      if (localizedValue !== undefined && !placeholderNames(localizedValue).includes('n')) {
        issues.push({
          type: 'count',
          locale,
          key,
          expected: 'count-bearing',
          actual: 'missing-count',
        });
      }
    }

    for (const [key, value] of strings) {
      if (!englishCountKeys.has(key) && placeholderNames(value).includes('n')) {
        issues.push({
          type: 'count',
          locale,
          key,
          expected: 'not-count-bearing',
          actual: 'unexpected-count',
        });
      }
    }
  }

  return issues;
}

function collectBudgetIssues(localeMaps, budgetDefinitions) {
  const issues = [];

  for (const [locale, strings] of Object.entries(localeMaps)) {
    for (const [key, value] of strings) {
      for (const budget of budgetDefinitions) {
        if (!budget.keyPattern.test(key)) {
          continue;
        }

        const actual = countGraphemes(value);

        if (actual > budget.limit) {
          issues.push({
            type: 'budget',
            locale,
            key,
            category: budget.category,
            actual,
            limit: budget.limit,
          });
        }
      }
    }
  }

  return issues;
}

function collectDuplicateWarningIssues(localeMaps, duplicateWarningKeys) {
  const issues = [];

  for (const [locale, strings] of Object.entries(localeMaps)) {
    const matcher = lastSixtySecondMatchers[locale];

    assert.ok(matcher, `missing duplicate-warning matcher for locale ${locale}`);

    for (const key of duplicateWarningKeys) {
      const value = strings.get(key);

      if (value === undefined || !matcher.test(value)) {
        issues.push({
          type: 'duplicate-warning',
          locale,
          key,
          issue: 'missing-last-60-seconds',
        });
      }
    }
  }

  return issues;
}

export function collectI18nIssues(
  locales,
  {
    budgetDefinitions = compactStringBudgets,
    duplicateWarningKeys = defaultDuplicateWarningKeys,
  } = {},
) {
  const localeMaps = Object.fromEntries(
    Object.entries(locales).map(([locale, strings]) => [
      locale,
      flattenUserFacingStrings(strings),
    ]),
  );

  return [
    ...collectParityIssues(localeMaps),
    ...collectPlaceholderIssues(localeMaps),
    ...collectCountIssues(localeMaps),
    ...collectBudgetIssues(localeMaps, budgetDefinitions),
    ...collectDuplicateWarningIssues(localeMaps, duplicateWarningKeys),
  ];
}

export function formatI18nIssue(issue) {
  switch (issue.type) {
    case 'parity':
      return `i18n parity: locale=${issue.locale} key=${issue.key} issue=${issue.issue}`;
    case 'placeholder':
      return `i18n placeholder parity: locale=${issue.locale} key=${issue.key} expected={${issue.expected.join(',')}} actual=${issue.actual.map((name) => `{${name}}`).join(',')}`;
    case 'count':
      return `i18n count parity: locale=${issue.locale} key=${issue.key} expected=${issue.expected} actual=${issue.actual}`;
    case 'budget':
      return `i18n string budget: locale=${issue.locale} key=${issue.key} category=${issue.category} actual=${issue.actual} limit=${issue.limit}`;
    case 'duplicate-warning':
      return `i18n duplicate-warning copy: locale=${issue.locale} key=${issue.key} issue=${issue.issue}`;
    default:
      throw new Error(`unknown i18n issue type: ${issue.type}`);
  }
}

function readLocaleFiles() {
  return Object.fromEntries(
    Object.entries(localeFiles).map(([locale, fileName]) => [
      locale,
      JSON.parse(readFileSync(repoPath(fileName), 'utf8')),
    ]),
  );
}

export function collectSourceI18nIssues(
  sourceEntries,
  {
    allowedRawUseTranslationFiles: rawUseTranslationAllowList = allowedRawUseTranslationFiles,
    validTranslationKeys,
  } = {},
) {
  const issues = [];

  for (const [sourceFile, source] of sourceEntries) {
    if (!rawUseTranslationAllowList.has(sourceFile) && sourceUsesRawUseTranslation(source)) {
      issues.push(`${sourceFile} imports raw react-i18next useTranslation; use useAppTranslation`);
    }

    if (!rawUseTranslationAllowList.has(sourceFile) && sourceUsesRawI18nRuntime(source)) {
      issues.push(`${sourceFile} imports raw i18n runtime; use typed t or useAppTranslation`);
    }

    let staticTranslationKeys = [];

    try {
      staticTranslationKeys = extractStaticTranslationKeys(source);
    } catch (error) {
      issues.push(`${sourceFile} ${error.message}`);
    }

    if (validTranslationKeys) {
      for (const key of staticTranslationKeys) {
        if (!validTranslationKeys.has(key)) {
          issues.push(`${sourceFile} uses unknown i18n key: ${key}`);
        }
      }
    }
  }

  return issues;
}

function runCli() {
  const locales = readLocaleFiles();
  const i18nIssues = collectI18nIssues(locales).map(formatI18nIssue);
  const sourceIssues = collectSourceI18nIssues(productionSourceEntries(), {
    validTranslationKeys: new Set(flattenUserFacingStrings(locales.en).keys()),
  });
  const issues = [...i18nIssues, ...sourceIssues];

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(issue);
    }

    process.exitCode = 1;
    return;
  }

  console.log('i18n parity, typed helper usage, and string budgets ok');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
