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

Required extended components:

- `TimelineItem`
- `HealthRecordRow`
- `ReminderRow`
- `ShareScopeRow`
- `TimeRangePicker`
- `ErrorState`
- `PermissionCalmState`

## Veto Rules

- No custom-rendered TabBar in MVP. Use Expo Router/native tab behavior and keep the design wrapper limited to labels, icons, tokens, and a11y metadata.
- No coral for warnings or sharing risk states.
- No bright red.
- No two equal primary CTAs in one hero/screen.
- No `Alert.alert` for business errors.
- No feature-local UI primitives duplicating design primitives.

## Accessibility

- `Touchable` requires `accessibilityLabel`, `accessibilityRole`, optional hint/state at TypeScript level.
- Touch target minimum: iOS 44pt, Android 48dp.
- Quick Log/FAB target: 56pt+.
- Status never relies on color alone; use icon + text + tone.
- Swipe actions must have overflow/menu alternatives.
- Snackbar/live updates use polite announcements.

Dynamic Type:

- display/heading `maxFontSizeMultiplier=1.6`;
- body `maxFontSizeMultiplier=2.0`;
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

## Haptics

Use a typed wrapper only:

```ts
haptic('tapConfirm' | 'saveSuccess' | 'celebration' | 'warning' | 'selection' | 'error')
```

Direct `Haptics.impactAsync` from feature code is forbidden.

## Component Inventory

MVP uses a `_dev/components` route for living component inspection. Storybook is Phase 1 unless component count grows beyond 40 or design QA needs it enough to justify ADR-0014.
