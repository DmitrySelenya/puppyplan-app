# i18n And Content

## Library

Use `react-i18next` with typed keys generated from `STRINGS.en.json`.

Rejected:

- inline user-facing strings;
- manual pluralization;
- untyped `t()` keys;
- silent missing-key fallback in development.

## Locale Files

Existing source inputs:

- `STRINGS.en.json`
- `STRINGS.ru.json`

CI must check:

- key parity with English master;
- missing keys;
- plural forms;
- string budgets for marked UI keys.

## Plurals

Use ICU plural support through i18next. Russian requires:

- `one`;
- `few`;
- `many`;
- `other`.

## Dates And Numbers

Use `Intl.DateTimeFormat` and `Intl.NumberFormat`. Relative time may use a small date utility with locale support. Do not add Moment.js.

## String Budgets

Enforce budgets for:

- tab labels;
- primary CTA labels;
- pills;
- tracker tile labels;
- notification action labels.

Dynamic Type XXL/XXXL screenshots must include RU and EN for core flows.

## RTL

RTL is not enabled in MVP, but components must use logical start/end layout conventions and directional icons must support `flipForRTL`.

## Server-Backed Content

Guidance and health template content use:

- `content_version(content_key, version, category, published_at)`;
- `content_item(content_version_id, locale, title, body jsonb)`;
- `UNIQUE (content_version_id, locale)`.

Fallback locale: English.

