# Diary vs Telegram — current-run UX audit

**Date:** 2026-07-13

**Issue / plan:** PUP-33 / `docs/plans/active/2026-07-13-diary-telegram-parity.md`

**Device:** `Grith iPhone SE 3 iOS 26.3` simulator, current local development build

**Verdict:** **NO-GO as a Telegram replacement.** PuppyPlan can currently supplement the chat for
simple events that happen now, but it is not yet a safe or efficient replacement for the household's
real logging workflow.

This report uses a synthetic replay derived from the shape of the supplied Telegram workflow. It
does not retain the real puppy name, household messages, or private notes.

## 1. Goal and success criteria

The target user is holding a puppy, distracted, and often logging after the fact. The successful
product must support one-handed capture, fast correction, immediate readback, and a shared day view
without making the user remember app-specific gestures.

PuppyPlan beats Telegram only when all of these are true:

1. A common event is logged in at most two taps and remains visible immediately after save.
2. Six mixed, backdated events can be entered consecutively without reopening a sheet each time.
3. Every title and note can be read back, opened, edited, and deleted from the Diary.
4. Sleep can be recorded as a start/end interval rather than two unrelated facts.
5. A 20+ event physical-device burst, offline replay, and cross-device routine check-off lose zero
   events and create zero duplicates.
6. The household can coexist with Telegram during migration through at least a readable day export.

The current build does not meet criteria 2–6, and meets criterion 1 only for the four fast-lane
trackers at the current time.

## 2. Synthetic replay matrix

The audit scenario intentionally stresses the patterns visible in the supplied chat without copying
its private text:

| Pattern | Synthetic load | What the app must preserve |
| --- | ---: | --- |
| Common facts | 25 events in one day | Type, exact occurred time, author, stable order |
| Backdating | More than half entered later | Direct `HH:MM` entry and easy correction |
| Batch capture | 4–6 events in one sitting | Continuous input without sheet churn |
| Context notes | Several short and long notes | Glanceable preview plus full details |
| Sleep | Multiple sleep/wake pairs | One comprehensible interval per nap |
| Collaboration | Two carers | Correct attribution and fast convergence |
| Corrections | Repeated edits and one deletion | Discoverable Edit/Delete plus undo |

## 3. Numbered flow audit

| Step | Health | Current-run result |
| --- | --- | --- |
| 1. Open Diary | **FAIL** | Morning/old entries are at the top; the newest event is outside the viewport at the bottom. The large header also consumes valuable SE-height space. |
| 2. Open Add | **PASS** | The central Add action is obvious and the choice between Quick Log and Schedule is understandable. |
| 3. Log a common event now | **PASS with limits** | Potty → subtype → save is fast, uses large targets, and the created fact survived an app relaunch. Only four fast-lane categories are available. |
| 4. Add details/backdate | **FAIL** | A second sheet is stacked over the still-visible Quick Log sheet. The long form and picker-first time entry are much slower than typing one line in chat. |
| 5. Read the saved day | **FAIL** | New facts sink to the bottom. Note/title content is not projected into the Diary; multiple rich entries become identical `Observation` cards. Two-digit hours render as `10:…`. |
| 6. Open/edit a fact | **FAIL** | A Diary fact has no tap-to-details behavior. The route does not provide `onEdit`, so the existing conditional action is unreachable. |
| 7. Delete a fact | **MIXED** | Left-swipe revealed an icon-only destructive action; deletion succeeded and remained deleted after relaunch. The gesture is not taught or visually discoverable. Planned routines are managed elsewhere, which makes “why can I delete this row but not that row?” unclear. |
| 8. Mark a routine done | **MIXED / OPEN** | A completed routine was rendered correctly in the simulator. The previously diagnosed cross-device convergence bug is fixed locally and covered by tests, but the fixed build still needs the owner-device fresh check-off and 20+ event verification. |
| 9. Relaunch and verify | **MIXED** | One newly created fast fact persisted; one deleted fact remained absent. This is positive evidence, not proof that all write paths are safe. |
| 10. Replace Telegram | **FAIL** | There is no batch entry, chat-like quick-entry line, import, day export, or coexistence bridge. Moving now would create double logging and make the app the slower source. |

## 4. What is already good

- The `Diary | Pet | More` navigation and persistent Add action are understandable.
- The four Quick Log tiles are calm, legible, and comfortably sized for one-handed use.
- Potty subtype selection is explicit instead of hiding data quality behind a generic category.
- The local queue, retry, failure, undo, and synced-delete architecture is a stronger foundation than
  a purely optimistic form.
- Fact cards expose a screen-reader delete action even while the visual swipe action is closed.
- The visual language is not the primary problem. Reworking colors or typography before fixing the
  operational flow would not make the product competitive with chat.

## 5. Highest-risk findings

### P0 — trust is still conditional

The current run proved one create/relaunch and one delete/relaunch path. It did **not** prove that
everything saves. The owner-device failure was previously root-caused as a cross-device duplicate
routine check-off that was misclassified as a permanent payload failure; the scoped local fix is
green, but the physical-device acceptance step remains open. Until a fresh 20+ event burst and
cross-device check-off pass, the answer to “will nothing be lost?” is **not yet guaranteed**.

There is also a product-level form of information loss: notes may be stored in the payload but are
invisible in the day view. From the user's perspective, saved context has disappeared.

### P1 — chronology contradicts the job

`buildDiaryDayModel` sorts `displayAt` ascending. A newly saved event therefore goes to the bottom
while the user remains at the top. The audit created a new evening Potty fact; the top still showed
morning items, and scrolling to the end found the new fact at the bottom.

Required direction: newest facts first, with future planned routines separated into a small
“upcoming” area rather than mixing two incompatible ordering needs in one list.

### P1 — Diary is an index of labels, not a readable record

The event view only exposes translated type, time, status, and a generic actor label. `FactCard`
has no note/title-preview field. Rich observations collapse to repeated identical cards, and row
tap does nothing. The data may exist, but it cannot be inspected or corrected.

Required direction: 1–2 line preview, tap-to-details, full note and metadata, visible Edit/Delete,
and an update path that pre-fills the original values before saving.

### P1 — the detailed flow is slower than chat

The app requires sheet navigation, tracker selection, form scrolling, and picker interaction for
each event. The household workflow is frequently a batch of backdated one-line updates. No amount
of card polish closes that interaction-cost gap.

Required direction: `Now / −15m / −30m / −1h` chips plus direct numeric `HH:MM`, followed by a
persistent quick-entry line that can parse time + category + free note and stay focused for the next
entry.

### P2 — semantic rendering is incomplete

- Two-digit times are visibly truncated at ordinary text size.
- Detailed tracker payloads need schema round-trip coverage so subtype and icon never disagree.
- Sleep start/wake exists in the contract but is not exposed as a simple interval workflow.
- Attribution currently collapses to “You”; this does not yet replace chat-level household context.

## 6. Accessibility risks and limits

This is not a full accessibility certification. The audit checked visible hierarchy, target size,
labels exposed to the automation hierarchy, and the supplied screen-reader action in code.

- Quick Log tiles and major actions appear to meet the 44 pt minimum target expectation.
- The `10:…` time gutter is a baseline legibility failure before Dynamic Type stress testing.
- Icon-only swipe delete is visually undiscoverable even though an accessibility action exists.
- Repeated generic `Observation` labels give both visual and screen-reader users too little context.
- Nested sheets and a long detail form increase navigation burden and loss of place.
- Dynamic Type, VoiceOver rotor order, Switch Control, Reduce Motion, and Android TalkBack still need
  dedicated verification after the anatomy changes.

## 7. Telegram transition scorecard

| Need | Telegram today | PuppyPlan now | Verdict |
| --- | --- | --- | --- |
| Capture one simple event now | One short line | 2–3 taps | Competitive for four categories |
| Capture a mixed batch | One edited message | One sheet cycle per event | App loses badly |
| Backdate | Type the time | Picker/form flow | App loses badly |
| Preserve nuance | Free text is the record | Note is not readable in Diary | App loses |
| Correct mistakes | Edit message | No reachable Diary edit | App loses |
| Read latest state | Latest chat context is visible | New fact sinks to bottom | App loses |
| Coordinate carers | Shared thread and reactions | Shared model exists; attribution/readback incomplete | Not ready |
| Transition gradually | Existing chat remains usable | No export/import bridge | No migration path |

**Migration answer:** do not move the household from Telegram yet. The app can be dogfooded in
parallel for simple Quick Logs, but it is not the authoritative daily record until the trust and
readback gates pass.

## 8. Recommended correction sequence

1. **Close P0 trust on the owner's fixed build:** discard the legacy stuck row, fresh cross-device
   check-off, 20+ mixed-event burst, offline/reconnect, zero loss/duplicates.
2. **Make the day readable:** newest facts first, separate upcoming plan, note preview, full details,
   visible edit/delete, and content-safe time gutter.
3. **Make correction safe:** pre-filled edit, explicit destructive confirmation/undo behavior, and
   clear distinction between deleting a fact and managing a scheduled routine.
4. **Make backdating fast:** time chips + direct `HH:MM`; retain the picker only as a fallback.
5. **Beat chat cadence:** persistent one-line quick entry with batch mode and graceful free-text
   fallback.
6. **Finish semantics:** canonical subtype payloads and a two-tap sleep interval.
7. **Support migration:** start with a readable day text export; decide separately whether Telegram
   history import is worth the complexity.

Do not start with a broad visual redesign. Keep the existing tokens and successful Quick Log tiles;
change the information architecture and interaction anatomy first.

## 9. Current-run evidence

All accepted screenshots below were captured in this audit session on the required SE simulator.
They use synthetic app data.

### Add chooser — healthy

![Add chooser](../../output/ux-audit/pup33/02-add-menu.png)

### Quick Log fast lane — healthy but narrow

![Quick Log](../../output/ux-audit/pup33/03-quick-log.png)

### Detailed entry — stacked-sheet and long-form cost

![Detailed entry start](../../output/ux-audit/pup33/04-details-start.png)

### After save — old morning item still at the top

![Diary after fast save](../../output/ux-audit/pup33/08-after-fast-save.png)

### Bottom of the day — newest fact, truncated time, repeated generic notes

![Newest fact at bottom](../../output/ux-audit/pup33/09-newest-at-bottom.png)

### Delete — hidden icon-only action, then successful removal

![Swipe delete revealed](../../output/ux-audit/pup33/10-delete-reveal.png)

![Fact removed](../../output/ux-audit/pup33/11-delete-confirmed.png)

## 10. Evidence boundaries

- The current native build itself timed out during the Xcode rebuild step; the already-installed
  current development build was launched against the current Metro bundle. This is an environment
  limitation, not counted as a product defect.
- Maestro could not reliably focus and populate every detailed text field, so this audit does not
  use that failed automation attempt as evidence of note-save loss. Note invisibility is supported
  by the current-run repeated generic rows plus the event-view/card code path.
- The physical owner-device 20+ event burst and fixed cross-device routine check-off remain open.
- No production, release, remote repository, or private-data action was performed.
