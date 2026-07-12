# 00 — Foundation & Contracts
Route: shared design system / primitives   Atlas: `docs/design/v1/screenshots/foundation/library.png` + Open Design V2 boards 01-04
Device sizes: iOS 390x844, Android 412x900, SE compact for native verification
Allowed deviations: section is a contract/reference board, not a production route.

## Anatomy

- Clay token board: base `#F6EFE3`, raised `#FFFCF6`, sunken `#ECE3D4`, primary `#C96442`, filled primary `#A94F2F`, Honey only for rare celebration, Sage for done/success, Mauve for calm info.
- Typography: Lora display, Nunito body; Dynamic Type must be supported.
- Component contracts: split nav, Add button, status pill, list row, tracker tile, native time picker, snackbar, form state, permission calm state.
- Native picker contract: iOS wheel picker in sheet; Android Material time dialog.
- State matrix: loading, empty, offline-read, pending-write, error, permission-denied, revoked/expired.

## Tokens

- Primary CTA: `primary/600 #A94F2F` with white text.
- Focus ring: `#A94F2F`.
- Touch targets: 44pt minimum; Quick Log/Add 56pt+.

## States Covered

- Foundation reference, shared contract notes, native time picker, global screen states.

## Accessibility

- Status is never color-only.
- Icon-only controls require labels.
- Dynamic Type fallback for bottom nav labels: icon-only after AX threshold with full accessibility labels.
- Large Diary display greetings use a screen-specific `maxFontSizeMultiplier` ceiling of `1.8` so
  the week strip and first Diary content remain reachable on the SE at accessibility XXXL.

## Notes / Deferred

- Do not copy Open Design HTML/CSS into native code. Build through `src/design` primitives.
