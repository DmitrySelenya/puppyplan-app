# 12.1 — Reminders Hub
Route: `/reminders`   Atlas: `docs/design/v1/screenshots/reminders/12-1.png`
Device sizes: SE compact primary, atlas 393x852
Allowed deviations: production rows may show durable reminder titles from `public.reminder.reminder_type`; swipe edit/delete, occurrence generation, missed-today rows, and local notification scheduling are deferred.

## Anatomy (top -> bottom)
- `ScreenHeader` — back label `more.screen-title`, centered title `reminders.screen-title`, trailing add icon button.
- H1 title — `reminders.screen-title`, large page heading below the navigation header.
- `SegmentedControl` — two tabs, `reminders.segments.0` active and `reminders.segments.1` off.
- Loading/error/empty state card — only when the connected query is loading, failed, or returns no active/off reminders.
- Active list sections — `SectionHeader` + `ListGroup` rows grouped into Feeding, Health, Trusted sitter, and Other.
- Reminder row — left icon, title, schedule subtitle, enabled/disabled `Toggle`, and a pending status pill while that row's enabled toggle mutation is saving.
- Footer copy — `reminders.footer-quiet-hours`.

## Tokens
- content padding: screen default + `tokens.space[4]` bottom gap.
- list rows: `ListRow` settings variant, 64pt+ min height through primitive token.
- enabled toggle: design `Toggle` primary/600 track.
- trusted sitter active rail: deferred for production rows unless durable sitter metadata is available.

## States covered
- default — production query rows grouped by durable reminder data.
- loading — calm card with status pill and no fake rows.
- empty — calm empty card, no fake rows.
- error — alert card, no silent fallback.
- off segment — shows disabled rows from the same durable data.
- row pending — affected row shows a non-color-only pending status pill and disabled switch while its enabled toggle mutation is saving.

## Accessibility
- Back and add controls are buttons with localized labels.
- Segmented control exposes tablist/tab roles and selected state.
- Row toggles are switches with localized title-derived labels.
- State cards and row pending status use icon + text and do not rely on color alone.

## Notes / deferred
- Enabled/off toggle persistence and row-level pending feedback are implemented through the typed reminder mutation path. Swipe edit/delete, occurrence rows, missed-today rows, local notification scheduling, and native screenshot Stage 4 are separate plan-owned follow-ups.
