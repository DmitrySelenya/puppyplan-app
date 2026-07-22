# Design Runtime

`src/design` is the only UI infrastructure zone. Runtime UI must import generated tokens through `src/design/tokens.ts` and compose shared controls from `src/design/primitives`, `src/design/a11y`, `src/design/motion`, and `src/design/haptics`.

## Agent Discovery

Before adding or choosing UI infrastructure, search by intent instead of guessing a primitive name:

```bash
npm run design:search -- "settings row with chevron"
npm run design:component -- ListRow --dense
npm run --silent design:manifest -- --json
npm run design:doctor
```

- `design:search` ranks semantic matches and supports `--json` and `--limit`.
- `design:component` accepts the canonical name or a documented alias and supports `--brief`, `--dense`, `--full`, and `--json`.
- `design:manifest` exposes the versioned component and command inventory for tools.
- `design:doctor` checks schema, references, relationships, public export coverage, and this inventory marker. `FAIL` exits 1; optional coverage gaps remain actionable `WARN` results with exit 0.

The catalog lives in `src/design/catalog/catalog.json`. It documents intent, when-to-use, avoid guidance, states, accessibility, relationships, and evidence paths. It deliberately does not copy prop names or defaults: the TypeScript source path and `propsType` reported by `design:component` point to the canonical syntax.

<!-- DESIGN-CATALOG:START -->
Catalog version 1.0.0. Cataloged runtime components (37): `AppIcon`, `AppText`, `Avatar`, `Button`, `Card`, `CheckCircle`, `DayDivider`, `EmptyIllustration`, `EmptyState`, `FAB`, `FactCard`, `IconButton`, `IconChip`, `InfoHero`, `ListGroup`, `ListRow`, `PendingDot`, `PuppyHeader`, `RoutineCard`, `RoutineLifecycleMenu`, `Screen`, `ScreenHeader`, `SectionHeader`, `SegmentedControl`, `SheetHeader`, `SheetSurface`, `SnackbarProvider`, `Stack`, `StatusPill`, `SwipeToDelete`, `TextField`, `TimeGutter`, `Toggle`, `Touchable`, `TrackerTile`, `WeekStrip`, `WhenPicker`
<!-- DESIGN-CATALOG:END -->

The catalog follows the real public barrel in `src/design/primitives/index.ts`; it is not a substitute for the design gallery or render tests. Full focus-trapping `BottomSheet`/`Modal`, `InlineAlert`, and `SkeletonLoader` behavior remains deferred until a scoped follow-up approves the native implementation path.

`Screen` remains scroll-first for placeholder shell content, defaults safe-area handling to the top edge only, and has a design-owned non-scrolling variant for future fixed-height flows. Do not bypass `src/design` to import raw `Pressable`, raw colors, raw spacing, direct haptics, or business-error alerts from feature code.

`AppText` owns the documented per-variant Dynamic Type ceilings: display/title/headline variants
use `1.8`, body/callout variants use `2.0`, and footnote/caption/label/code variants use `1.5`.
Explicit fixed-chrome ceilings require component evidence and must never disable scaling or hide
meaning. Layout primitives may switch to their tested accessibility anatomy at `fontScale >= 2`.

`Touchable` enforces platform touch targets through the design boundary: iOS/default 44pt, Android 48dp, and Quick Log/thumb actions 56pt+. Use `blockPresses` for transient busy/loading states that must ignore taps while remaining `busy`, not `disabled`, for assistive tech.

Elevation must use the generated elevation tokens and shared primitive helper so Android receives `elevation` while iOS receives the matching shadow color, offset, opacity, and radius.

`ListRow` interactive rows are exposed as one button-like accessibility node. Static rows preserve child text nodes unless callers provide an `accessibilityLabel` to intentionally expose a single summarized row.

`SheetSurface` is a static sheet/panel surface, not a modal or focus-trapping bottom sheet. It exposes iOS modal semantics and Android accessibility importance for the surface itself, but background focus isolation belongs to a future `BottomSheet`/`Modal` primitive.

`motion` owns Reduced Motion behavior. Primitives must route pressed transform effects through the shared reduced-motion-aware helper so scale/translate effects disappear when the OS setting is enabled. `haptic` is best-effort: adapter failures are contained inside the design boundary and must not block UI actions.
