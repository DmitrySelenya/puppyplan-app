# PuppyPlan Design V1 Handoff

This package preserves the Cloud Design export as a repo-native design reference for agents. Treat the raw files as source artifacts, not production React Native code.

## Source Status

| File or folder | Status | Notes |
| --- | --- | --- |
| `raw/PuppyPlan.html` | Current visual source | Use this as the implementation and manifest source until `manifest.json` proves otherwise. It loads React, ReactDOM, and Babel from `unpkg.com`, so local rendering needs network unless those assets are vendored later. |
| `raw/tokens.css` | Current support file | CSS token mirror used by the current visual canvas. Repo root `design-tokens.json` remains the canonical token document until the future token pipeline exists. |
| `raw/components.jsx`, `raw/icons.jsx`, `raw/ios-frame.jsx`, `raw/design-canvas.jsx`, `raw/screens/*.jsx` | Current support files | Source modules used by `PuppyPlan.html`. Use them for visual intent only; do not copy web JSX into native feature screens. |
| `raw/.design-canvas.state.json` | Current support metadata | Cloud Design canvas state retained with the raw export. |
| `raw/PuppyPlan - Standalone.html` | Reference only | Self-contained exported snapshot. Prefer `PuppyPlan.html` plus source modules for current inspection and future manifest extraction. |
| `raw/PuppyPlan-print.html`, `raw/design-canvas-print.jsx` | Stale/reference | Print-oriented export. Do not use for current app implementation unless a future manifest explicitly promotes it. |
| `raw/PuppyPlan.standalone.src.html` | Stale/reference | Older standalone source-style export. Do not use for current implementation unless a future manifest explicitly promotes it. |
| `raw/uploads/DESIGN*.md`, `raw/uploads/puppyplan-prd-v2.md` | Sanitized historical snapshots | Historical uploaded copies with synthetic placeholders. Canonical docs live at the repo root and under `docs/architecture/`, so these files may intentionally differ. |
| `raw/uploads/design-tokens*.json`, `raw/uploads/STRINGS.en.json` | Reference duplicates | Historical uploaded copies only. Canonical token/string files live at the repo root until the future token and i18n pipelines exist. |
| `raw/uploads/pasted-1779109067002-0.png` | Reference only | Historical audit screenshot retained because it was part of the export. It is not an active audit source. |
| `raw/scraps/` | Reference only | Exploratory Cloud Design scrap data. |
| `raw/uploads/AUDIT_FIXES*.md` | Excluded | Historical audit markdown is intentionally not copied into this raw package. Reconcile useful findings through curated docs only. |

## Agent Use

1. Open `docs/design/v1/raw/PuppyPlan.html` in a browser for the current visual canvas.
2. Use `docs/design/v1/raw/screens/*.jsx`, `components.jsx`, `icons.jsx`, and `tokens.css` only to understand visual intent.
3. Use `docs/design/v1/manifest.json` as the canonical artboard inventory for sections, routes, states, dimensions, source files, and priority tags.
4. Keep production UI native: Expo Router routes stay thin, feature screens use `src/design` primitives, and all visible strings go through typed i18n.
5. Treat stale/reference files as context only. Do not implement from them unless the manifest records why they are current.

## Generated Inventory

- `manifest.json` records 17 sections, 65 artboards, and 62 phone screens from the current `PuppyPlan.html` canvas.
- `screenshots/index.md` groups the generated PNG atlas by section and links every artboard screenshot.
- `scripts/design/extract-artboards.mjs --check` verifies the manifest is current.
- `scripts/design/export-artboard-screenshots.mjs` regenerates the atlas through a local Chrome/CDP runner. It requires network because `PuppyPlan.html` loads React, ReactDOM, and Babel from `unpkg.com`.
- The screenshot export is a local/manual tool, not a CI or `npm run check` gate, until React/ReactDOM/Babel are vendored into `docs/design/v1/raw/_vendor/` and the target CI runner has a supported Chrome/Chromium executable path.
- `scripts/design/check-design-package.mjs` verifies the manifest, `AUDIT_FIXES*.md` exclusion, repo design text policy, screenshot count, screenshot dimensions, and nonblank pixels.

## Privacy Review

Phase 1 intake reviewed and sanitized the raw package before any commit. No private user, puppy, provider, token, production credential, or real account data is intentionally stored here.

Identity-like examples use synthetic placeholders such as `Puppy A`, `Caregiver A`, `caregiver-a@example.test`, `trainer@example.test`, and `Example Vet Clinic`. `support@puppyplan.app` appears only as support-copy reference content. Native implementation must use i18n keys and runtime-safe fixtures, not hard-coded raw strings.

Rendered PNGs are not OCR-scanned. The committed atlas relies on the source text policy above plus manual visual review; if the raw design export changes, regenerate the atlas only after re-running the text policy and reviewing the rendered images for private data.

## Expected Raw File List

`find docs/design/v1/raw -maxdepth 2 -type f | sort` should return:

```text
docs/design/v1/raw/.design-canvas.state.json
docs/design/v1/raw/PuppyPlan - Standalone.html
docs/design/v1/raw/PuppyPlan-print.html
docs/design/v1/raw/PuppyPlan.html
docs/design/v1/raw/PuppyPlan.standalone.src.html
docs/design/v1/raw/components.jsx
docs/design/v1/raw/design-canvas-print.jsx
docs/design/v1/raw/design-canvas.jsx
docs/design/v1/raw/icons.jsx
docs/design/v1/raw/ios-frame.jsx
docs/design/v1/raw/scraps/sketch-2026-05-18T11-54-22-nzk0tl.napkin
docs/design/v1/raw/screens/cards.jsx
docs/design/v1/raw/screens/guidance.jsx
docs/design/v1/raw/screens/health.jsx
docs/design/v1/raw/screens/library.jsx
docs/design/v1/raw/screens/more.jsx
docs/design/v1/raw/screens/onboarding.jsx
docs/design/v1/raw/screens/profile.jsx
docs/design/v1/raw/screens/quicklog.jsx
docs/design/v1/raw/screens/settings.jsx
docs/design/v1/raw/screens/sharing.jsx
docs/design/v1/raw/screens/sitter.jsx
docs/design/v1/raw/screens/states.jsx
docs/design/v1/raw/screens/timeline.jsx
docs/design/v1/raw/screens/today.jsx
docs/design/v1/raw/tokens.css
docs/design/v1/raw/uploads/DESIGN-43511de2.md
docs/design/v1/raw/uploads/DESIGN.md
docs/design/v1/raw/uploads/STRINGS.en.json
docs/design/v1/raw/uploads/design-tokens-2a062b4e.json
docs/design/v1/raw/uploads/design-tokens.json
docs/design/v1/raw/uploads/pasted-1779109067002-0.png
docs/design/v1/raw/uploads/puppyplan-prd-v2.md
```

`find docs/design/v1/raw -name 'AUDIT_FIXES*.md'` must return no files.
