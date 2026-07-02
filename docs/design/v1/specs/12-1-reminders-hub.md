# 12.1 — Reminders Hub
Route: `/reminders`   Atlas: `docs/design/v1/screenshots/reminders/12-1.png`
Device sizes: SE compact primary, atlas 393x852
Allowed deviations: production rows may show durable reminder titles from `public.reminder.reminder_type`; real toggle mutation, swipe edit/delete, occurrence generation, and local notification scheduling are deferred.

## Anatomy (top -> bottom)
- `ScreenHeader` — back label `more.screen-title`, centered title `reminders.screen-title`, trailing add icon button.
- H1 title — `reminders.screen-title`, large page heading below the navigation header.
- `SegmentedControl` — two tabs, `reminders.segments.0` active and `reminders.segments.1` off.
- Loading/error/empty state card — only when the connected query is loading, failed, or returns no active/off reminders.
- Active list sections — `SectionHeader` + `ListGroup` rows grouped into Feeding, Health, Trusted sitter, and Other.
- Reminder row — left icon, title, schedule subtitle, and enabled/disabled `Toggle`.
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

## Accessibility
- Back and add controls are buttons with localized labels.
- Segmented control exposes tablist/tab roles and selected state.
- Row toggles are switches with localized title-derived labels.
- State cards use alert/polite semantics where applicable and do not rely on color alone.

## Notes / deferred
- Toggle mutation, optimistic pending dot, swipe edit/delete, occurrence rows, missed-today rows, local notification scheduling, and native screenshot Stage 4 are separate plan-owned follow-ups.
