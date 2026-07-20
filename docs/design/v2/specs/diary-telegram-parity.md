# PUP-33 — Diary Telegram Parity

Route: `/diary`
Primary references: `dogfood.diary.01`, `diary-item-edit`, `dogfood.quick-log.details.01`,
`dogfood.stage0.variants.01`
Device sizes: iPhone SE compact portrait (primary); existing 390x844 and 412x900 handoff sizes
Allowed deviations:

- The 2026-07-13 owner directive to make the Diary usable for the supplied chat-shaped workflow
  supersedes the 2026-07-11 indicator-only note treatment: logged facts show a private two-line
  preview inside the authenticated household Diary. Notes still never enter notifications,
  analytics, logs, sharing projections, URLs, or retained evidence.
- The activity feed is newest-first. Planned rows use the same descending day order so the next
  or latest relevant item stays near the top and old morning rows move down.
- RETIRED 2026-07-13 by owner directive: no in-Diary quick-entry composer. The central "+" is the
  only add-record entry point; the diary is a feed, not a chat. The line parser is retained UI-less
  for possible future import scope.
- Fact tap opens a calm details/edit surface derived from the existing detailed-capture reference.
  Swipe-to-delete remains available, but the visible actions affordance provides Edit and Delete so
  destructive behavior is not gesture-only.
- Time entry is chips plus numeric `HH:MM`; the native picker remains a fallback rather than the
  primary control.
- Day export uses the native share sheet and chat-readable text. Import is not part of this lock.
- Owner decision (2026-07-14): retain the three-choice Add chooser. A common one-step fact uses
  `Add → Quick Log → tracker` (three taps); Potty/Sleep may require one additional explicit choice.

## Anatomy (top to bottom)

- Existing Diary header and week strip.
- Existing single contextual tip slot when applicable.
- Mixed Diary list in descending display-time order.
- Logged fact: content-safe time gutter, tracker icon, canonical title, actor/sync caption, optional
  two-line private note preview, and a visible 44pt actions button.
- Owner directive (2026-07-14): an Observation whose payload carries a note but no explicit title
  renders the note as the row title instead of the generic tracker label; no duplicate preview line
  is shown. Day export then emits the note alone as the fact description.
- Planned routine: existing `RoutineCard`; planned/actual semantics are unchanged.
- Fact details: canonical type/subtype, exact time, full private note, actor, created/edited stamps,
  then Edit and Delete actions for writers; viewer mode is read-only.
- Edit composer: prefilled tracker-specific values, note, and time; save keeps the same client event
  id and uses the existing versioned update path.
- Day share action: native share sheet containing one line per fact in `HH:MM description` form,
  newest/oldest output order selected for chat readability (oldest-to-newest in exported text).

## Tokens

- Existing Clay V2 surfaces, typography, event accents, spacing, and elevation only.
- Touch targets are at least 44pt; primary Add remains 56pt-capable.
- Fact-note copy uses primary text on the sunken surface for AA contrast.
- Time gutter is 62pt at all supported font scales; no valid localized time may truncate. The
  time is left-aligned within that column (owner decision 2026-07-20, PUP-37): short times sit on
  the screen-edge side instead of leaving a large dead zone there. Width stays 62pt so the
  no-truncation guarantee is unchanged; only the alignment moved from right to left.

## States covered

- Populated mixed day — production.
- Noted and unnoted fact — production.
- Pending and failed fact — production.
- Viewer fact details — production read-only.
- Writer details/edit/delete — production.
- Sleep start, wake, and retrospective interval — production.
- Export success/cancel/failure — production/native share behavior.

## Accessibility

- Each fact remains one readable VoiceOver element; its label includes note presence/content only on
  the authenticated screen and never relies on color.
- Row tap and visible actions have separate labels; Delete is also an accessibility action.
- Dynamic Type uses existing ceilings; previews wrap to two lines and details show the full value.
- At Accessibility XXXL on the SE, the header and fact anatomy may stack and the week strip may
  scroll horizontally; time, title, caption, actions, Share day, and Review history remain complete.
- Reduced Motion behavior remains owned by existing primitives.

## Locked quick-entry grammar (parser retained without UI; owner directive 2026-07-13)

- Optional time prefix: `HH:MM` (24-hour) or locale-accepted `H:MM`; absent time means now.
- Russian owner-supplied vocabulary: `попис/пописал/пописали` -> potty outside by default,
  `авария/в клетку/на пеленку` -> potty inside, `покакал/покакали` -> poop,
  `поел/поели/корм` -> feeding, `уснул/заснул` -> sleep start, `проснулся/встал` -> sleep wake,
  `гулять/прогулка/вышли` -> walk, `зумис/бегает/бесится` -> zoomies.
- English map: `pee/peed` -> potty outside, `accident/inside` -> potty inside,
  `poop/pooped` -> poop, `ate/fed/meal` -> feeding, `asleep/slept` -> sleep start,
  `woke/awake` -> sleep wake, `walk/outside` -> walk, `zoomies/running` -> zoomies.
- Ambiguous or unmatched text becomes an Observation with the original trimmed text as its private
  note. Parser never drops raw input silently.
- Multiple newline-separated entries are parsed independently and saved in source order.

## Deferred

- Telegram history import and reactions/social parity require separate product and privacy scope.
- Physical owner-device 20+ burst verification remains required before Telegram replacement GO.
