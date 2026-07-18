# 03A - Diary Route
Route: `/diary`   Production shell: `app/(tabs)/diary/index.tsx`
Source section: `03-diary-core-states.md`
Open Design project: `2f60083d-2d0f-4fe1-8e71-c1c60951fb8c`
Device sizes: iOS 390x844, Android 412x900, local SE compact screenshot pass before Done.
Allowed deviations: implementation may reuse the existing `TodayScreen` module name internally while
the public route, tab label, shell title, and navigation contract are `Diary`. Legacy `/today` remains
a redirect alias only. Legacy atlas `today/*` and `timeline/*` are fallback references, not naming source.

## Locked Boards

| Board | Open Design screen id | State | Legacy atlas fallback |
| --- | --- | --- | --- |
| Populated Diary | `diary-populated` | default | `today/3-4.png`, `timeline/5-1.png` |
| Diary day 1 | `diary-day-1` | first value | `today/3-1.png` |
| Diary day 2 morning | `diary-day-2` | returning morning | `today/3-2.png` |
| Diary weekly rhythm | `diary-weekly-rhythm` | day 7 rhythm | `today/3-3.png` |
| History scroll | `diary-past` | history | `timeline/5-1.png` |
| True cold start | `diary-cold` | empty, no logs, no routines | none |
| Empty with history | `diary-empty` | quiet day | none |
| All done | `diary-all-done` | completion | none |
| Loading / offline / pending / error | `diary-states` | grouped states | `today/3-5.png`, `today/3-6.png`, `today/3-7.png` |
| Selected day is not today | `week-selected` | calendar state | none |
| Accident recovery | `diary-accident-recovery` | sensitive helper | none |
| After-feeding pattern | `diary-after-feeding` | contextual tip | none |
| Past unchecked reminder | `diary-missed-reminder` | overdue routine | none |
| Diary item edit / delete / undo | `diary-item-edit` | history item actions | `timeline/5-2.png`, `timeline/5-3.png` |

## Anatomy (top to bottom)

- Screen shell: `Diary` title, current date context, no `Today` user-facing title.
- Header affordance: puppy/profile shortcut routes conceptually to Pet; no separate Health tab.
- Week strip: seven day buttons, with selected day and today marker represented separately.
- Contextual tip slot: at most one soft helper card; Mauve/Info tone, no stacked guidance library.
- Primary list: mixed timeline of routine slots and logged facts, ordered by time.
- Routine slot: title, time, source/actor meta where applicable, mark-done affordance, quiet overflow.
- Logged fact: sunken or lower-emphasis surface, tracker icon, time, actor/source meta, no checkbox.
- Past unchecked routine: quiet elevated card, no red warning, no shame/missed badge.
- History rows: editable/delete-capable via overflow or explicit actions; undo snackbar after delete.
- Persistent chrome: split `Diary | Pet | More` tab bar and separate Quick Log/Add action.

## Tokens

- Content padding follows `Screen` compact mobile defaults; no feature-local raw spacing.
- Routine surfaces use raised card tokens; logged facts use sunken/quiet tokens.
- Done state uses Sage/success tint; warning/error tones are reserved for actual persistence failure.
- Primary route active tint uses `tokens.color.primary[700]`; Diary active glyph is `book`.

## States Covered

- Required for this route slice: populated, cold start, empty with history, all done, loading,
  offline-read, pending-write, failed/error, week-selected, past unchecked, item edit/delete/undo.
- Day 1, day 2, weekly rhythm, accident recovery, and after-feeding pattern remain required Diary
  variants, but may land in sub-slices if each sub-slice records its own RED/GREEN evidence.

## Accessibility

- Route title and tab label say `Diary` in EN/RU/ES.
- The large greeting inherits the system `title1` ceiling of `1.8`; greeting text remains complete
  and scalable without a screen-local override.
- Week day controls expose selected/today state without relying on color alone.
- Mark-done, overflow/edit, and Quick Log/Add are separate 44pt+ touch targets.
- Each event row label distinguishes planned routine from logged fact and includes time/source context.
- Pending and failed persistence states use polite announcements; no silent save failure.

## Structural Assertions Required

- `src/test/tab-layout.render.test.tsx`: primary route/icon contract remains `diary/book`, `pet/paw`,
  `more/more`, Quick Log is not a tab.
- `src/test/today-core.render.test.tsx` or a future `diary-core.render.test.tsx`: Diary shell title,
  week strip state, single contextual tip slot, routine-vs-fact anatomy, and no stale `tabs.today`.
- `src/test/timeline-filters.render.test.tsx`: history filters live under Diary language, not a
  standalone Timeline tab.
- `src/test/legacy-tab-route-redirects.test.tsx`: `/today` redirects to `/diary`; `/health` redirects
  to `/pet`.

## Stage 4 Requirement

Before marking the Diary route complete, capture synthetic native screenshots for at least:
populated, cold start, loading/offline/pending/error, selected non-today day, past unchecked routine,
and item edit/delete/undo. Compare each against the locked Open Design board or the listed atlas
fallback and record `PASS` or an approved named deviation in the active plan.
