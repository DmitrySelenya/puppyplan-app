# PUP-34 — Routine lifecycle menu and paused recovery

Routes: `/diary`, `/(modals)/reminders`, and `/(modals)/reminders/edit`
Atlas: `11-routine-menu`, `11b-routines-more`, `11c-pause-recovery`
Source board: `ScreenRoutineMenu`, `ScreenRoutinesList`, and
`ScreenPausedRoutineRecovery` in `docs/design/v2/reference/miro-prototype.full.html`
Source components: `docs/design/v2/reference/diary-create.screens.jsx` and
`docs/design/v2/reference/more-reminders-paywall.screens.jsx`
Device sizes: canonical 393x852 artboards; approved iPhone SE 3 compact portrait at 375x667
is the implementation and screenshot target.
Status: Stage 0 composition locked for PUP-34 on 2026-07-17. The schema-free projection repair
below is selected under the plan's no-backend/schema constraint. Stage 4 native comparison passed
on the approved iPhone SE at default and AccessibilityL content sizes; evidence is recorded in the
completed plan and `output/ux-audit/pup34-lifecycle/screenshots/`.

## Allowed deviations

- Use a platform-native React Native modal containing static PuppyPlan cards instead of building a
  draggable BottomSheet. It must provide a scrim, explicit Close/Cancel affordance, native modal
  focus isolation, and no swipe/drag contract.
- PUP-34 implements the lifecycle slab only: Edit routine, Pause/Resume, and Delete. The separate
  past-slot Mark done / Skip slab in artboard 11 is deferred; the existing Diary checkbox remains
  the only completion affordance in this task.
- Preserve the shipped Active / Off segmented routine-list information architecture rather than
  rebuilding the whole artboard-11b notification and next-scheduled composition. An Off row is the
  canonical quiet paused row and exposes a direct Resume action.
- Preserve the canonical active-row toggle while adding a distinct lifecycle overflow. A paused
  row replaces the toggle with Resume and still retains its own lifecycle overflow.
- Artboard 11c's transient Diary banner and Snackbar actions (`Undo`, `Open More`) are not part of
  PUP-34. PUP-36 later adds a confirmation-only Snackbar after a successful Pause; it has no Undo
  or `Open More` action, and Resume or a failed Pause produces no confirmation Snackbar.
- Delete confirmation is a second state of this lifecycle modal. It is not the account-deletion
  typed-word pattern shown elsewhere in the atlas, and is derived from AC-P4-MENU-3 rather than a
  dedicated routine-delete artboard.

## Anatomy

### Diary routine row

- Existing time gutter, checkbox, event icon, title, and state treatment remain unchanged.
- Independent trailing 44x44 overflow target with a localized full accessibility label.
- Checkbox and overflow are siblings: checkbox only checks/unchecks; overflow only opens lifecycle
  actions. Tapping copy never opens Edit.

### Lifecycle modal

- Warm scrim over the current screen and one raised lifecycle action card.
- Visible actions in order: Edit routine, Pause (or Resume for a paused row), Delete.
- Each action is at least 44pt. Delete uses the danger token and includes visible supporting copy:
  `Diary entries stay`.
- Delete transitions to a confirmation state with heading, the user-supplied routine title in the
  body/text face with a two-line clamp, reassurance that existing Diary entries remain, Cancel,
  and destructive Delete. A failed Pause/Resume/Delete renders a localized
  row-level error card beside the affected reminder in both Diary and the routine list (one card
  even when a routine has several Diary slots); opening any routine's lifecycle actions clears
  the retained error, and a newer failed attempt replaces it. The
  routine list's full-screen error state is reserved for load failures. Errors are never swallowed.
- Tapping the scrim dismisses the menu, equivalent to Cancel; the visible Cancel action remains
  the accessible dismissal path.
- A legacy, non-canonical routine row replaces Edit (its form cannot prefill) with a localized,
  muted, one-line explanation using the same explanatory text treatment as `Diary entries stay`,
  while keeping Pause/Resume and Delete reachable. Canonical rows show Edit and omit this caption.

### Routine list

- Active rows retain title, repeat/time subtitle, toggle, and gain a distinct overflow target.
- Paused rows are visually quiet, use the localized paused subtitle, replace the toggle with a
  44pt Resume action, and retain their overflow target.
- A paused row keeps its Resume control rendered behind the open native modal; modal focus
  isolation, rather than row re-layout, prevents a duplicate reachable target.
- An enabled canonical `repeat: 'never'` row whose timezone-correct scheduled occurrence is at or
  before the current render clock stays in Active with functional toggle and overflow controls.
  Its subtitle leads with the localized expired marker (so the two-line clamp truncates the
  schedule tail, never the marker) and its icon uses the complete paused quiet
  treatment (container and icon color); a future one-off keeps the active treatment.
- A canonical one-off with an invalid persisted IANA timezone also stays in Active with Edit,
  toggle, and overflow functional. It uses the complete paused quiet icon treatment and replaces
  the schedule subtitle with a localized, PII-safe `Schedule unavailable · edit this reminder`
  projection; the raw timezone value is never rendered. Timezone validation is separate from
  occurrence expansion so unrelated scheduler errors remain visible.
- Edit opens the existing pre-filled edit route. Pause/Resume updates the existing `enabled` field.

## Tokens

- Raised cards and modal surface: existing Clay/Sage `Card`, `ListRow`, `Button`, `AppIcon`, and
  token APIs only.
- Scrim: `tokens.color.surface.scrim`; destructive icon/text/button: danger tokens/variant.
- No raw colors, spacing, `Pressable`, or new dependency.

## States covered

- Diary upcoming, past-unmarked, and done routine menu.
- Routine-list active row; future, expired, and unavailable-schedule one-off rows; paused/off row;
  pending mutation; recoverable mutation error.
- Lifecycle menu open; delete confirmation; cancelled confirmation.
- Edit navigation; pause disappearance from Diary; Resume restoration; delete with historical Diary
  fact retained.
- Default content size and AccessibilityL, including long Russian/Spanish copy.

## Accessibility

- Overflow owns a localized label and button role, with a 44x44 target independent of the checkbox.
- Modal exposes native modal semantics, has a visible/accessible title, and can always be dismissed.
- Visible action labels are asserted with `getByText`; state changes expose disabled/busy state.
- AccessibilityL may stack row accessories/actions vertically; copy must not clip or overlap.
- Delete context and reassurance are visible text, not only an accessibility label; the
  user-supplied title uses the body/text face and clamps to two lines.
- The legacy Edit explanation is informative text, not a control, and clamps to one line.

## Pause-semantics audit

- `expandOccurrencesForDay` excludes `enabled=false`, so the Diary day model receives no future
  slot for a paused reminder.
- `computeScheduleSet` is built from the same occurrence expansion and cancels/rebuilds owned local
  notifications; disabled reminders contribute no desired notification.
- The existing toggle mutation invalidates the reminder list and Diary dashboard, so the immediate
  future behavior is correct: Pause removes future slots/reminders and Resume restores them.
- The pre-PUP-34 projection is not yet safe for durable history. `buildDiaryDayModel` drops a linked fact when its
  matching slot is absent, so pausing hides completed linked Diary records; soft deletion does the
  same because deleted reminders are excluded from the reminder query. Re-enabling also expands the
  current rule over past paused days, recreating `past-unmarked` slots because no durable pause
  interval exists. PUP-34 uses the schema-free, plan-sized repair: an unmatched linked event falls
  back to an ordinary Diary fact row, making the Pause/Delete reassurance truthful for durable
  records. AC-P4-MENU-2 is future-scoped; effective-dated reconstruction of unwritten historical
  plan slots is explicitly not claimed and remains an architecture follow-up.
  Linear `PUP-35` owns that effective-dated history design and requires separate owner/CTO approval
  before any schema work.

## Stage 4 evidence contract

- Capture Diary menu, delete confirmation, active routine row, and paused/Resume row on the approved
  iPhone SE at default size and AccessibilityL.
- Compare each complete frame against artboards 11/11b/11c and record PASS or a named deviation in
  the PUP-34 plan changelog before completion.
