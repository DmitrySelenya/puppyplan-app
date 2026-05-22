import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadNavigationContract, repoPath } from './load-navigation-contract.mjs';

const { shellI18nKeys } = await loadNavigationContract();
const shellI18nKeySet = new Set(shellI18nKeys);

const shellSourceFiles = [
  'app/(tabs)/_layout.tsx',
  'src/features/today/screens/TodayScreen.tsx',
  'src/features/health/screens/HealthScreen.tsx',
  'src/features/more/screens/MoreScreen.tsx',
  'src/features/quick-log/screens/QuickLogShell.tsx',
  'src/features/linking/screens/AccessUnavailableScreen.tsx',
];

const localeFiles = {
  en: 'STRINGS.en.json',
  es: 'STRINGS.es.json',
  ru: 'STRINGS.ru.json',
};

function readLocale(fileName) {
  return JSON.parse(readFileSync(repoPath(fileName), 'utf8'));
}

function getValue(source, key) {
  return key.split('.').reduce((value, part) => value?.[part], source);
}

function extractStaticTranslationKeys(source) {
  return [...source.matchAll(/\bt\s*\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map((match) => {
    assert.equal(
      match[2].includes('${'),
      false,
      `shell i18n keys must be static literals: ${match[0]}`,
    );
    return match[2];
  });
}

assert.deepEqual(
  extractStaticTranslationKeys("t('tabs.today'); t(\"tabs.health\"); t(`tabs.more`);"),
  ['tabs.today', 'tabs.health', 'tabs.more'],
  'shell i18n extractor must cover single quotes, double quotes, and static template literals',
);
assert.throws(
  () => extractStaticTranslationKeys('t(`tabs.${id}`);'),
  /shell i18n keys must be static literals/,
  'shell i18n extractor must reject dynamic template literals',
);

for (const sourceFile of shellSourceFiles) {
  const source = readFileSync(repoPath(sourceFile), 'utf8');
  for (const key of extractStaticTranslationKeys(source)) {
    assert.equal(
      shellI18nKeySet.has(key),
      true,
      `${sourceFile} uses shell i18n key outside shellI18nKeys: ${key}`,
    );
  }
}

for (const [locale, fileName] of Object.entries(localeFiles)) {
  const strings = readLocale(fileName);
  for (const key of shellI18nKeys) {
    const value = getValue(strings, key);
    assert.equal(typeof value, 'string', `${locale} is missing shell i18n key: ${key}`);
    assert.notEqual(value.trim(), '', `${locale} shell i18n key is empty: ${key}`);
  }
}

console.log('shell i18n ok');
