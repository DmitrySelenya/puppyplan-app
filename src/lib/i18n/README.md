# i18n

English `STRINGS.en.json` is the typed-key master for startup UI copy.
`STRINGS.ru.json` and `STRINGS.es.json` must keep user-facing leaf parity with
English before app code can ship.

Runtime stays on `react-i18next`; app shell and native UI code should import
`useAppTranslation()` or the `t()` helper from `src/lib/i18n` instead of calling
raw `useTranslation().t(...)` or importing the raw `i18n` runtime. `I18nKey` is
derived from the English JSON shape and includes object string leaves plus array
string leaves such as notification actions. Root `$meta`, root `voice.*` policy
lists, and `_comment*` fields at any depth are excluded from typed UI keys and
executable parity. The app hook returns only typed `t` plus `ready`; feature code
should not receive the raw `react-i18next` tuple/object surface.

The executable i18n gate is `node scripts/checks/check-i18n.mjs`, wired through
`npm run check` via `test:scaffold`. It checks:

- EN/RU/ES parity for all user-facing string leaves, including arrays.
- placeholder parity and `{n}` count-bearing key parity.
- compact string budgets for tabs, FAB/CTA labels, pills/status labels, tracker
  tile labels, notification actions, and compact row/status strings.
- duplicate-warning copy that must explicitly refer to the last 60 seconds.
- shell/native UI sources do not import raw `react-i18next` `useTranslation` or
  the raw `i18n` runtime, including namespace imports.
- static translation keys in production `app/` and `src/` files exist in the
  English master, so stale array indices such as notification action gaps fail
  the local gate.

String-budget errors include `locale`, `key`, `category`, actual grapheme length,
and the limit so the failing compact surface is actionable.

Locale detection and persisted user choice are still future runtime work. The
current bootstrap keeps English as the startup locale.
