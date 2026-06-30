# Design System And UI Contracts

## Ownership

`src/design/` is the only UI infrastructure zone.

```text
src/design/
  tokens/
  primitives/
  extended/
  a11y/
  motion/
  haptics/
```

Feature code must not import raw colors, spacing, typography, icons, `Pressable`, or haptics directly.

## Tokens

- Tokens in code are TypeScript `as const`, not runtime JSON and not Style Dictionary in MVP.
- `design-tokens.json` remains design handoff input.
- CI must detect drift between token JSON and TS token files once implementation starts.
- v1 is light mode only. Components may read through `useTokens()`, but system dark mode is not enabled.

## Primitives

Required primitives:

- `Button`
- `IconButton`
- `Card`
- `FAB`
- `BottomSheet`
- `Snackbar`
- `InlineAlert`
- `FormField`
- `Avatar`
- `TabBar` configuration wrapper
- `EmptyState`
- `SkeletonLoader`
- `StatusPill`
- `ListItem`
- `TrackerTile`
- `Touchable`

PUP-9 Phase 5 shipped the first native runtime layer: `AppText`, `Screen`, `Touchable`, `Button`, `IconButton`, `Card`, `FAB`, `SheetSurface`, `StatusPill`, `ListRow`, `TrackerTile`, and `SegmentedControl`, plus design-owned a11y, motion, haptics, and native elevation helpers. `SheetSurface` is only a static sheet/panel surface; it does not provide Android focus trapping or background focus isolation. Full `BottomSheet`/`Modal` behavior remains deferred until current dependencies support it or a scoped follow-up approves an implementation path. `Snackbar`, `InlineAlert`, `FormField`, `Avatar`, `TabBar` configuration wrapper, `EmptyState`, and `SkeletonLoader` are still required future primitives and must land through scoped follow-up work, not opportunistic feature-local copies.

Required extended components:

- `TimelineItem`
- `HealthRecordRow`
- `ReminderRow`
- `ShareScopeRow`
- `TimeRangePicker`
- `ErrorState`
- `PermissionCalmState`

## Veto Rules

- ~~No custom-rendered TabBar in MVP.~~ **Lifted 2026-06-27** (see `docs/plans/active/2026-06-27-diary-pet-nav-design-brief.md`): a custom-rendered `tabBar` IS permitted for the Oura-style split nav (floating tab capsule + a separate "+" circle). Keep routing, state, safe-area, and a11y native underneath (custom render of the bar only); the design wrapper still owns labels, icons, tokens, and a11y metadata.
- No coral for warnings or sharing risk states.
- No bright red.
- No two equal primary CTAs in one hero/screen.
- No `Alert.alert` for business errors.
- No feature-local UI primitives duplicating design primitives.

## Accessibility

- `Touchable` requires `accessibilityLabel`, `accessibilityRole`, optional hint/state at TypeScript level.
- Touch target minimum: iOS/default 44pt, Android 48dp.
- Quick Log/FAB target: 56pt+.
- Status never relies on color alone; use icon + text + tone.
- Elevation must come from generated elevation tokens, including Android `elevation`.
- Swipe actions must have overflow/menu alternatives.
- Snackbar/live updates use polite announcements.

Dynamic Type:

- `AppText` default `maxFontSizeMultiplier=3.0` so XXL/XXXL accessibility review remains possible.
- Callers may lower a specific text ceiling only with screen-specific evidence and without hiding required content.
- no fixed heights on touchable controls.

## Motion

Use the Expo SDK 55-compatible Reanimated runtime as the only animation layer. The current scaffold installs Reanimated 4.

Motion presets:

- tap;
- sheet;
- snackbar;
- fade;
- celebration.

All presets must respect Reduced Motion. Reduced Motion removes translate/scale and uses opacity/cross-fade. Celebration becomes static.
Primitive pressed transforms must use the design-owned Reduced Motion helper rather than hard-coding scale transforms.

## Haptics

Use a typed wrapper only:

```ts
haptic('tapConfirm' | 'saveSuccess' | 'celebration' | 'warning' | 'selection' | 'error')
```

Direct `Haptics.impactAsync` from feature code is forbidden.
Haptics are a best-effort enhancement; adapter failures must be contained inside `src/design/haptics` and must not block UI actions.

## Component Inventory

MVP uses a `_dev/components` route for living component inspection. Storybook is Phase 1 unless component count grows beyond 40 or design QA needs it enough to justify ADR-0014.
