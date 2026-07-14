# quick-note — Quick note capture

Route: `/(sheets)/quick-log/note`
Atlas: **no artboard exists.** This surface is a fresh owner-authored design (2026-07-14),
approved in writing before code per the Stage 0 "user-approved fresh export" branch of
`docs/agents/design-fidelity-pipeline.md`. Anatomy is derived from two already-locked
references so the surface stays inside the V2 system:

- Slab anatomy + chooser sheet: `docs/design/v2/specs/dogfood-core-loop-stage0.md`, as built in
  `src/design/primitives/CapsuleTabBar.tsx` (`nav-chooser`).
- Sheet shell, note field, and error anatomy: `docs/design/v2/specs/dogfood-quick-log-details.md`.

Device sizes: iPhone SE 3 compact portrait (primary); existing 390x844 handoff size.

Owner design directive (2026-07-14, verbatim intent): a third `+` slab named Quick note; a text
input plus a block on the left that already holds the current time; tapping the time opens a
carousel to pick another day and time; instant notes, with event logging staying a separate
button. Explicit rejection: no autoFocus — "я бы не делал автофокус на инпут текста сразу после
нажатия на +, это будет бесить и выглядеть плохо для приложения".

## Allowed deviations

- No atlas artboard (see above); this spec card is the build contract.
- The chooser grows from two slabs to three. Order is Quick Log, Quick note, Schedule: fact-first
  actions stay adjacent, and Schedule (the only plan-shaped action) stays last.
- The time control is a pill + native iOS wheel, not the numeric `HH:MM` field locked for
  `dogfood.quick-log.details`. The details form converges onto this control in Phase 2 of
  `docs/plans/active/2026-07-14-quick-note-capture.md`.
- **No autoFocus on the note field** (owner directive). The keyboard rises only on an explicit tap.

## Anatomy (top → bottom)

### `+` chooser (extends the existing `nav-chooser`)

- Drag handle — unchanged.
- Slab — Quick Log: icon `spark` @ tabBar.icon on `accent[100]` tint, title, subtitle, chevron.
- Slab — Quick note: icon `docText` @ tabBar.icon on `primary[50]` tint, title, subtitle, chevron.
- Slab — Schedule: icon `calendar` @ tabBar.icon on `status.infoTint` tint, title, subtitle, chevron.

### Quick note sheet

- `Screen` + `SheetSurface`, bottom-anchored — same shell as the details sheet.
- Header row: title (`variant="title"`) + tertiary Close action, `justify="space-between"`.
- Capture row (`direction="horizontal"`, `align="flex-start"`, gap `sm`):
  - Time pill (left block) — `Touchable`, `minTarget="thumb"`, label = localized `HH:MM` for today
    or `d MMM HH:MM` for any other day; secondary tone caption above it reading "When".
  - Note field — `TextField`, `multiline`, `maxLength={500}`, `flex: 1`, **no autoFocus**.
- Wheel — rendered only while the pill is open: `DateTimePicker` `mode="datetime"`,
  `display="spinner"`, `maximumDate` = now, `minimumDate` = now − 7d.
- Character helper — `footnote`, secondary tone, same copy contract as the details note field.
- Inline error — `footnote` on `status.danger`, `accessibilityRole="alert"`.
- Primary `Add` action; tertiary `Close`.

## Tokens

- Existing Clay V2 surfaces, typography, spacing, elevation only; no feature-local values.
- Sheet padding, radius, and drag handle inherit `tokens.component.bottomSheet`.
- Slab: `tokens.radius.lg`, `minHeight` = `tapTargetThumbZone + space[2]`, elevation 1 — unchanged.
- Time pill: `tokens.radius.full`, `surface.sunken`, minimum 44pt target.
- Note field maximum 500 characters, matching `quick-log.details.note`.

## States covered

- Chooser with three slabs — production.
- Note sheet default (pill = now, empty field, keyboard down) — production.
- Pill open (wheel visible) — production.
- Backdated pill (non-today label) — production.
- Saving (Add disabled + loading) — production.
- Persistence error (inline error, text preserved) — production.
- Post-save (field cleared, sheet open, pill reset to now) — production.
- Viewer / permission-denied — production, reusing the details permission anatomy.

## Accessibility

- Each slab is one button; label = title, hint = subtitle; ≥44pt.
- Time pill: label = "When", value = the localized timestamp; announces as a button.
- Note field has a visible label; the character helper is not the only affordance.
- Error is `accessibilityRole="alert"` and never color-only.
- Dynamic Type: capture row stacks vertically at `fontScale >= 2`; no truncation of the pill value.

## Privacy

- Note text is a private household fact. It never enters notifications, analytics, logs, share
  projections, URLs, or retained screenshot evidence. Stage 4 evidence uses synthetic text only.

## Notes / deferred

- Notes persist as Observation v2 facts through the existing durable queue — no new storage.
- Upgrading a note into a typed event, parser auto-classification, and interval capture are
  deferred in the plan and need separate owner approval.
