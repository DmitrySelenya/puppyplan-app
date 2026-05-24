# Design Runtime

`src/design` is the only UI infrastructure zone.

PUP-9 implements the Phase 5 native primitive layer on top of the PUP-8 generated token pipeline. Runtime UI must import generated tokens through `src/design/tokens.ts` and compose shared controls from `src/design/primitives`, `src/design/a11y`, `src/design/motion`, and `src/design/haptics`.

Current primitive coverage includes text, scroll/fixed screens, touchable wrappers, buttons, icon buttons, cards, list rows, segmented controls, tracker tiles, status pills, static sheet surfaces, and the Quick Log FAB. These are intentionally UI infrastructure only; product flows, Quick Log behavior, Supabase/RLS, i18n Phase 6, bottom-sheet behavior, snackbars, inline alerts, form fields, avatars, tab-bar wrappers, empty states, skeleton loaders, and the design gallery remain separate scoped work.

`Screen` remains scroll-first for placeholder shell content, defaults safe-area handling to the top edge only, and has a design-owned non-scrolling variant for future fixed-height flows. Do not bypass `src/design` to import raw `Pressable`, raw colors, raw spacing, direct haptics, or business-error alerts from feature code.

`AppText` defaults `maxFontSizeMultiplier` to `3.0` for all variants so XXL/XXXL Dynamic Type review remains possible. Use a lower per-call ceiling only with screen-specific evidence and without fixed-height touchable controls.

`Touchable` enforces platform touch targets through the design boundary: iOS/default 44pt, Android 48dp, and Quick Log/thumb actions 56pt+. Use `blockPresses` for transient busy/loading states that must ignore taps while remaining `busy`, not `disabled`, for assistive tech.

Elevation must use the generated elevation tokens and shared primitive helper so Android receives `elevation` while iOS receives the matching shadow color, offset, opacity, and radius.

`ListRow` interactive rows are exposed as one button-like accessibility node. Static rows preserve child text nodes unless callers provide an `accessibilityLabel` to intentionally expose a single summarized row.

`SheetSurface` is a static sheet/panel surface, not a modal or focus-trapping bottom sheet. It exposes iOS modal semantics and Android accessibility importance for the surface itself, but background focus isolation belongs to a future `BottomSheet`/`Modal` primitive.

`motion` owns Reduced Motion behavior. Primitives must route pressed transform effects through the shared reduced-motion-aware helper so scale/translate effects disappear when the OS setting is enabled. `haptic` is best-effort: adapter failures are contained inside the design boundary and must not block UI actions.
