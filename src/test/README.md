# Tests

PUP-4 added the initial Expo test harness:

- Unit/render tests live under `src/test/**/*.test.ts` and `src/test/**/*.test.tsx`.
- Use Jest with the `jest-expo` preset.
- Use `@testing-library/react-native` for React Native component tests.
- Node-based guardrail tests live next to their scripts under `scripts/**/*.test.mjs`.
- Keep test fixtures synthetic. Do not use raw puppy names, notes, emails, provider names, photos, tokens, push tokens, or production data.
- Locale files use simple `{name}` interpolation. Treat single-brace identifiers as placeholders in rendered strings; `_comment` metadata may describe placeholders but is not rendered.
- Use `<br>` for intentional Markdown hard breaks. Do not use trailing two-space hard breaks because `text-hygiene` rejects trailing whitespace.
- Prefer real components/providers. Mock native boundaries only when the JavaScript test renderer cannot provide the runtime surface, and do not assert on mock internals.

Local commands:

```text
npm run test:unit
npm run test:node
npm run test:scaffold
npm run test
npm run check
```

`npm run test` composes Jest tests, Node guardrail tests, and scaffold checks in `scripts/checks`. `test:scaffold` includes navigation, shell i18n, route guardrails, obvious privacy/secret scanning, and text hygiene checks. Do not land behavior-bearing feature code with only static checks as coverage.
