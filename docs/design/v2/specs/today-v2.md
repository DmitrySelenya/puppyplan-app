# Today V2 Design Lock

> **⚠️ SUPERSEDED (2026-07-01) — do not build from this file.** Its anatomy (large-title
> "Today" + hero card, `ScreenTodayDay1…`) came from the retired Open-Design export and is
> the diverged design the V2 redesign is correcting. The canonical Diary lock is
> `docs/design/v2/specs/diary-v2.md`, built against the Miro design-freeze
> (`docs/design/v2/reference/`). Kept for history only.

Route: `/today`
Atlas: `docs/design/v2/screenshots/08-states.png` (`v2.states.01`), plus `docs/design/v2/screenshots/standalone-overview.png` (`v2.overview.01`)
Device sizes: iPhone SE 3 compact simulator, portrait
Allowed deviations: no dedicated single-screen Today PNG exists in the V2 atlas; production comparison uses `raw/screens/today.jsx` as the anatomy source and `v2.states.01` for shared state templates.

## Raw Sources

- `docs/design/v2/raw/screens/today.jsx`
- `ScreenTodayDay1`
- `ScreenTodayDay2`
- `ScreenTodayDay7`
- `ScreenTodayWithActivity`
- `ScreenTodayLoading`
- `ScreenTodayOffline`
- `ScreenTodayPending`
- `docs/design/v2/raw/screens/states.jsx`
- `docs/design/v2/raw/CHANGELOG-pass3.md`

## Anatomy

- Puppy header: avatar, puppy name, age, optional household/member affordance.
- Large title: `Today`, followed by localized date copy.
- Activity strip: optional compact household/status strip above the hero when activity exists.
- Hero card: exactly one `Card` with `hero` variant, eyebrow, title, optional body, and one primary action.
- Daily cards: at most five production daily cards; first-day starter cards render as a list with chevrons.
- Guidance card: at most one starter guidance card after daily cards when applicable.
- State cards: loading, empty, error, offline-read, permission, unavailable, and pending-write use shared V2 state anatomy with an icon/status, title, calm body, and accessible label.
- Recent Quick Log: section header and real Timeline button, followed by synced/pending/failed event rows with text status pills.
- Failed banner: persistent after retry threshold, accessible alert, no color-only status.
- Shell: route-aware Quick Log FAB is visible on Today unless shell snackbar policy hides it; scroll content reserves `tokens.layout.bottomInsetFab`.

## Tokens

- content padding: `tokens.layout.screenPaddingPhone`
- vertical screen gap: `tokens.space[3]`
- hero padding: `tokens.space[5]`
- bottom inset: `tokens.layout.bottomInsetFab`
- state status icon size: 22
- card radius and surface colors come only from `src/design` primitives/tokens

## States Covered

- default/day 1: `ScreenTodayDay1`
- day 2: `ScreenTodayDay2`
- day 7: `ScreenTodayDay7`
- activity populated: `ScreenTodayWithActivity`
- loading: `ScreenTodayLoading` and `v2.states.01`
- offline-read: `ScreenTodayOffline` and `v2.states.01`
- pending-write: `ScreenTodayPending` and `v2.states.01`
- empty, error, unavailable, permission-denied: `v2.states.01` shared templates adapted to Today copy

## Accessibility

- Large title exposes header semantics through `AppText`.
- Timeline entry is a real button with localized label.
- Statuses use text labels and icons, not color alone.
- Error and failed states use polite alert/live-region semantics.
- Pending/offline/error state cards expose explicit localized accessibility labels.
- Buttons keep the shared primitive touch target and Dynamic Type handling.

## Evidence

- Native comparison output root: `output/design-fidelity/v2-phase3/today/`
- Synthetic data only; no real puppy names, notes, emails, provider names, photos, tokens, or production rows.
