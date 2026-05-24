export function extractStaticTranslationKeys(
  source,
  { dynamicKeyMessage = 'i18n keys must be static literals' } = {},
) {
  return [...source.matchAll(/\bt\s*\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map((match) => {
    if (match[2].includes('${')) {
      throw new Error(`${dynamicKeyMessage}: ${match[2]}`);
    }

    return match[2];
  });
}

export function sourceUsesRawUseTranslation(source) {
  return (
    /\buseTranslation\b/.test(source) &&
    /from\s+['"]react-i18next['"]/.test(source)
  );
}
