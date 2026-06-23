# PuppyPlan Design V2 Handoff

This package preserves the delivered `Puppy app_V2` export as a repo-native design reference for the redesign intake. Treat raw files as source artifacts, not production React Native code.

## Current Source Of Truth

For V2 intake work, the repo-native design source is `docs/design/v2/raw/PuppyPlan.html`, its support files, `manifest.json`, and the screenshot atlas under `docs/design/v2/screenshots/`.

V2 supersedes the V1 atlas for redesign intake acceptance. V1 remains historical evidence and a useful comparison baseline, but new V2 foundation, taxonomy, and per-screen design-fidelity work should lock against this directory unless a plan explicitly says otherwise.

## Token And Font Intent

The canonical V2 token/font intent is:

- `raw/tokens.css`
- `raw/puppy-tokens-patch.css`

`raw/export/src/tokens.css` is retained as a system-font portability fallback, not as the canonical V2 intent. The patch is the source for the Lora display / Nunito body direction and warm mauve `info` token refinement.

## Source Status

| File or folder | Status | Notes |
| --- | --- | --- |
| `raw/PuppyPlan.html` | Current visual source | Use with `manifest.json` and screenshots for V2 intake. It may require network for browser rendering, like the V1 handoff. |
| `raw/tokens.css` | Canonical intent | Inner working token file from the V2 package. |
| `raw/puppy-tokens-patch.css` | Canonical intent | Patch CSS that refines display font and warm mauve tokens. |
| `raw/export/src/tokens.css` | Fallback | System-font export retained for comparison only. |
| `raw/components.jsx`, `raw/icons.jsx`, `raw/screens/*.jsx` | Visual intent | Source modules used by the design canvas. Do not copy web JSX into native feature screens. |
| `raw/foundation_library_warm_light_v2.html` | Foundation reference | Reference for the warm-light foundation library and font/token checks. |
| `raw/CHANGELOG-pass3.md` | Review diff | V2 review-pass delta used by the intake plan. |
| `raw/uploads/*` | Historical uploaded context | Reference only. Canonical product, architecture, token, and i18n docs live in the repo root and `docs/`. |

## Agent Use

1. Resolve affected V2 atlas IDs from `manifest.json` and `screenshots/index.md` before UI work.
2. Use raw JSX, HTML, and CSS only to understand visual intent.
3. Implement through Expo native UI and `src/design` primitives; never copy web JSX into app screens.
4. Use `design-tokens.json` and `npm run tokens:generate` for production tokens. Do not hand-edit generated `src/design/tokens.ts`.
5. Retain screenshots only with synthetic/redacted data. Never store raw puppy names, notes, emails, provider names, photos, tokens, or production data.

## Generated Inventory

- `manifest.json` records 10 sections and 14 V2 screenshot references from the delivered package.
- `screenshots/index.md` groups the V2 screenshot atlas.
- Every screenshot referenced by the manifest exists under `docs/design/v2/screenshots/`.

## Privacy Review

The raw V2 package was sanitized during intake before being used as a repo-native atlas. Private-looking design examples, legacy persona names, provider-like placeholders, and non-example email domains were replaced with synthetic placeholders such as `Puppy A`, `Caregiver A`, `Example Vet Clinic`, and `example.test` addresses. The source package remains untrusted design data; native implementation must use typed i18n keys and safe fixtures.

## Expected Raw File Anchors

At minimum, the V2 raw package must contain:

```text
docs/design/v2/raw/CHANGELOG-pass3.md
docs/design/v2/raw/components.jsx
docs/design/v2/raw/icons.jsx
docs/design/v2/raw/screens/library.jsx
docs/design/v2/raw/screens/onboarding.jsx
docs/design/v2/raw/screens/quicklog.jsx
docs/design/v2/raw/screens/health.jsx
docs/design/v2/raw/screens/timeline.jsx
docs/design/v2/raw/screens/today.jsx
docs/design/v2/raw/tokens.css
docs/design/v2/raw/export/src/tokens.css
docs/design/v2/raw/puppy-tokens-patch.css
docs/design/v2/raw/foundation_library_warm_light_v2.html
```
