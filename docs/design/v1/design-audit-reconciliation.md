# Design Audit Reconciliation

This is the curated status record for useful findings from the downloaded historical audit note. The source markdown files `uploads/AUDIT_FIXES*.md` are intentionally excluded from `docs/design/v1/raw/` and are not active repo sources.

Statuses use only `applied`, `superseded`, or `open`.

| Audit finding | Status | Reconciliation |
| --- | --- | --- |
| Duplicate-care warning must be 60 seconds. | applied | Canonical repo docs, root strings, raw artboard labels, current duplicate-warning screenshots, and raw uploaded duplicate strings now use the 60-second contract. `scripts/design/check-design-package.mjs` rejects stale long-window markers and stale 4-minute duplicate-warning examples so implementation agents do not inherit old wording. |
| `text/tertiary` contrast should be corrected from `#76796F`. | applied | Canonical `design-tokens.json`, generated `src/design/tokens.ts`, `DESIGN.md`, and raw `tokens.css` now use `#72756A`, which measures 4.50:1 against `surface/base` and 4.70:1 against `surface/raised`. Focused tests enforce the 4.5:1 floor. |
| `status/warning` contrast should be corrected. | open | Root and raw token inputs still list `#A06A1F`. Needs token/design review before Phase 4 token generation. |
| Contrast-ratio descriptions should match measured values. | open | Root design docs and token descriptions still contain stale claimed ratios. Track with token drift/contrast work. |
| Motion `decel` easing differs between JSON and `DESIGN.md`. | open | Root `design-tokens.json` still uses `cubic-bezier(0.0, 0, 0.2, 1)` while `DESIGN.md` also describes `cubic-bezier(0.2, 0, 0, 1)`. Needs one canonical value before generating native tokens. |
| `layout.max-content-width` should be consistently documented. | open | Root docs still contain both `600pt` line-length wording and `560pt` max-content wording. Needs design-doc cleanup before token generation. |
| `elev/0` should reference the stroke token rather than a literal. | open | Root token JSON still carries a literal-like border value. Resolve in Phase 4 token pipeline. |
| CSS token coverage gaps: `primary-900`, sheet shadow token usage, snackbar action token, tabular numerals. | open | Phase 4 now includes `primary-900`, raw elevation variables, and font variables in the raw CSS drift gate. Remaining raw CSS refinements such as snackbar action token usage stay open for later design-package cleanup. |
| Core icon count and icon registry drift. | open | Current raw `icons.jsx` includes `feeding.walk` and `more.h`, but root `DESIGN.md` still says Core MVP icon token list `(30)`, and `health.jsx` still uses `med.stethoscope`. Needs registry reconciliation before native primitive work. |
| `needs-review` pill naming conflicts with `needs-vet-review`. | open | Root strings/tokens use `needs-vet-review`; current raw components and health screens still use `needs-review`. Native implementation should use canonical `needs-vet-review`. |
| CTA hierarchy fixes for Today day-7, duplicate warning, delete account, and empty-state primary buttons. | applied | Current raw canvas records the second review pass and shows the day-7 secondary action, duplicate warning text link, destructive-filled delete action, and primary empty-state CTAs. Native code must still enforce this through design primitives. |
| A11y baseline for nav actions, icon-only buttons, chips, radio rows, scrim dismissal, focus rings, and 44pt hit areas. | open | Raw web JSX remains an imperfect visual prototype; a11y semantics must be enforced later in `src/design` primitives and native render tests after `PUP-2`/`PUP-4`. |
| Missing screen/state coverage from audit pass. | open | Manifest flags missing or deferred states: onboarding age hint, Today after-accident/empty/error, Quick Log slow-saving and specific detail forms, reminder edit, notification permission denied, viewer read-only views, Dynamic Type, and multi-size phone canvases. |
| Split merged canvas sections for Trainer/Revoked and Reminders/More/Paywall. | applied | Current `raw/PuppyPlan.html` has separate sections for Trainer, Revoked/expired, Reminders, More, and Paywall. The manifest reconciles 17 sections. |
| Items the historical audit said not to draw: Trusted Sitter, Shareable Cards, Starter Guidance detail, Dynamic Type variants. | superseded | Current visual source now includes Trusted Sitter, Shareable Cards, and Starter Guidance detail artboards. Dynamic Type remains deferred and is tracked as missing/deferred in `manifest.json`. |

## Follow-Up Handling

Open items above are not authority to start Phases 4-7. Token generation, native primitives, i18n/string-budget gates, and the in-app native gallery remain blocked until `PUP-2` creates the Expo scaffold and package scripts, with required gates owned by `PUP-4`.

After Phases 1-3 are complete, use Phase 8 to split any still-open token, a11y, and missing-state work into scoped Linear issues if the foundation prerequisites are ready.
