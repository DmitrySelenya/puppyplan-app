# Design Fidelity UX Audit - Subagent Pass

**Date:** 2026-06-13
**Status:** Completed (2026-07-07) as historical V1 evidence. H1-H7 findings were triaged against V2; re-validation happens against the V2 atlas via the gaps coverage doc, not this plan.
**Plan type:** Active follow-up audit.
**Current phase:** H1-H7 triaged against V2 intake; continue from `2026-06-22-redesign-v2-intake.md`.
**Related plan:** `docs/plans/active/2026-06-13-design-fidelity-recovery.md`
**Design source:** V2 intake uses `docs/design/v2/manifest.json`, `docs/design/v2/screenshots/index.md`, and `docs/design/v2/raw/**`. The V1 audit source (`docs/design/v1/raw/PuppyPlan.html`, `docs/design/v1/raw/screens/*.jsx`, and `docs/design/v1/screenshots/`) remains historical comparison evidence only.

## V2 Intake Triage

| Finding | V2 status | Follow-up |
| --- | --- | --- |
| H1 - Health `11.1` claimed covered but current code renders empty-only | Re-scoped | V2 Health work is Phase 4 taxonomy/foundation propagation only in this Supergoal run; durable Health CRUD and full screen re-skin remain outside this branch. |
| H2 - Quick Log duplicate warning not production-reachable / wrong anatomy | Kept as regression guard | Existing 2026-06-14 fix remains expected; Phase 4 must preserve duplicate-warning behavior while collapsing potty taxonomy. |
| H3 - Quick Log snackbar missing `Add details` | Kept as regression guard | Existing 2026-06-14 fix remains expected; Phase 2/4 FAB/Snackbar policy must not remove the detail action. |
| H4 - Timeline events not grouped like atlas | Re-scoped | Full Timeline V2 re-skin is out of this Supergoal run; Phase 4 may touch Timeline only for canonical tracker/filter/subtype propagation. |
| H5 - Settings screens lack atlas navigation headers | Re-scoped | Full settings-header re-skin is out of this Supergoal run; Phase 2 may improve primitive action semantics only. |
| H6 - Quick Trackers rows do not match atlas controls | Re-scoped | Phase 4 updates tracker vocabulary structurally without starting the full V2 list-control re-skin. |
| H7 - Quick Trackers save model diverges from atlas | Resolved by prior fix / regression guard | The implicit-save model remains expected; Phase 4 must not reintroduce a bottom save CTA for taxonomy changes. |

## Goal

Re-check the currently implemented native UI against the design atlas screen by screen, using four independent UX review slices, while excluding screens and states that are still deferred or synthetic-only.

## Method

- Four UX subagents reviewed independent slices:
  - Today + app shell/FAB/tab bar.
  - Quick Log sheet and feedback states.
  - Timeline + Health.
  - More + Settings.
- Reviewers used the raw HTML/JSX design export, committed atlas PNGs, current native files, tests, and retained sanitized native evidence under `/tmp/puppyplan-design-fidelity-2026-06-13/after/`.
- A local side-by-side contact sheet was generated at `output/design-fidelity-audit/atlas-vs-native-contact-sheet.jpg`.
- One fresh simulator screenshot was discarded because it contained private runtime profile data. Future screenshots must be redacted before retention.

## Screens Considered Production-Ready

- `3.1` Today day 1 / first-day state.
- App shell: only `Today | Health | More` primary tabs; Quick Log is a FAB/sheet action.
- `4.1` Quick Log default sheet.
- `4.2`, `4.4`, `4.5` Quick Log feedback states where the implementation claims test or production coverage.
- `5.1`, `5.2`, `5.4` Timeline states where covered by current implementation/tests.
- `11.6` Health empty first-run.
- `11.1` Health mixed list only because the active recovery plan claims it is covered; current code contradicts that claim.
- `14.1` More full list.
- `14.2-default`, `14.2-editing` Puppy profile.
- `14.3` Quick trackers.

## Excluded Deferred / Synthetic States

- Today `3.2`, `3.3`, `3.4` day progression/activity-strip production behavior.
- Quick Log `4.6` details form as production behavior; it is currently synthetic/dev-gallery/test coverage only.
- Timeline `5.3`, `5.5` beyond incidental current coverage.
- Health `11.2`-`11.5` edit/detail/review states and any schema-backed health CRUD.
- More `14.2-breed`, `14.2-breed-q`, `14.4`, `14.5`, `14.6`.
- Family sharing, sitter, trainer sharing, reminders, guidance detail, paywall, shareable cards.

## Critical Findings

No critical visual findings were reported by the four UX passes.

## High Priority Findings

### H1 - Health `11.1` Is Claimed Covered But Current Code Renders Empty-Only

**Atlas refs:** `11.1`, `11.6`
**Files:** `src/features/health/screens/HealthScreen.tsx`, `src/test/app-shell.render.test.tsx`, `docs/plans/active/2026-06-13-design-fidelity-recovery.md`

Current `HealthScreen` always renders the empty state and the app-shell test explicitly asserts that the mixed-list rows are absent. The active recovery plan and retained screenshot matrix claim `11.1` Health mixed list is implemented and reviewed.

**Expected:** either a schema-safe read-only `11.1` visual list with segmented control, month section headers, grouped 72pt rows, icons, status pills, metadata/subline, chevrons, and footer; or the plan/native coverage must mark `11.1` as not production-covered.

**Fix:** decide whether `11.1` is allowed as a safe visual shell without fake production health data. Then either restore and test that list state, or correct the plan/evidence matrix to cover only `11.6`.

**Resolution 2026-06-14:** follow-up review treated static Health rows as a release-gate risk. Production `HealthScreen` now defaults to the honest empty/deferred state with disabled CTAs until PUP-25 durable health records ship. The schema-free `11.1` mixed list remains available only through explicit `reviewState="mixed-list"` fixture coverage for design review; the recovery matrix no longer treats the retained mixed-list screenshot as production-default evidence.

### H2 - Quick Log Duplicate Warning Is Not Production-Reachable And Uses Wrong Anatomy

**Atlas ref:** `4.4`
**Files:** `app/(sheets)/quick-log/index.tsx`, `src/features/quick-log/useQuickLogSheetController.ts`, `src/features/quick-log/screens/QuickLogShell.tsx`

The route does not pass `recentEvent`, while the controller only opens the duplicate warning when `recentEvent` exists. In tests, the warning appears as an inline card appended below the picker grid instead of replacing the picker with the compact warning sheet shown in the atlas.

**Expected:** tapping a tracker with a same-type event inside the 60-second window opens the `4.4` warning sheet state.

**Fix:** derive recent duplicate source from cached/query data in the production route, pass it into the controller, and render duplicate warning as a dedicated sheet state.

**Resolution 2026-06-14:** `app/(sheets)/quick-log/index.tsx` derives `recentEvents` from cached rows and passes them to `QuickLogShell`; `QuickLogShell` renders duplicate warning as a dedicated sheet state; controller tests and route tests cover production reachability. Follow-up coverage also verifies the sheet scrim cancels an active duplicate warning instead of silently closing the sheet.

### H3 - Quick Log Snackbar Missing `Add details`

**Atlas ref:** `4.2`
**Files:** `src/features/quick-log/useQuickLogSheetController.ts`, `src/features/quick-log/QuickLogFeedbackProvider.tsx`

Saved feedback only wires `Undo`. The atlas snackbar includes both `Undo` and `Add details`.

**Expected:** `Logged - <tracker>` snackbar exposes `Undo` plus `Add details`, with accessibility announcement covering both actions.

**Fix:** add a secondary snackbar action that opens `/quick-log/details` after the local client event context is known, or explicitly keep `4.6` deferred and update the design contract for `4.2`.

**Resolution 2026-06-14:** Quick Log now creates the optimistic `clientEventId` before mutation, passes it into the mutation variables, and exposes snackbar `Undo` plus `Add details` for trackers with detail forms. The Add details action opens `/quick-log/details` for the just-created event.

### H4 - Timeline Events Are Not Grouped Like The Atlas

**Atlas refs:** `5.1`, `5.4`
**File:** `src/features/timeline/screens/TimelineScreen.tsx`

Events render as one flat rounded list with no date section headers. The atlas shows `Today` and `Yesterday` section headers with separate grouped cards.

**Expected:** events grouped by localized day bucket, with section headers and grouped list spacing.

**Fix:** group `eventViews` by day before rendering and output `SectionHeader` + grouped card/list per day.

### H5 - Settings Screens Lack Atlas Navigation Headers

**Atlas refs:** `14.2-default`, `14.2-editing`, `14.3`
**Files:** `app/(modals)/_layout.tsx`, `src/features/profile/screens/PuppyProfileSettingsScreen.tsx`, `src/features/settings/quick-trackers/screens/QuickTrackersSettingsScreen.tsx`

Settings screens hide the route header and render large content titles. Saved profile lacks visible `More` back affordance, and Quick Trackers lacks the atlas-style left `More` action and centered title.

**Expected:** atlas `SimpleHeader`: left `More` or `Cancel`, centered screen title, right `Edit` or `Save` where applicable.

**Fix:** add a shared native settings header primitive or route-level header for `/settings/*` while preserving the locked route namespace.

### H6 - Quick Trackers Rows Do Not Match Atlas Controls

**Atlas ref:** `14.3`
**File:** `src/features/settings/quick-trackers/screens/QuickTrackersSettingsScreen.tsx`

Rows render as selected text rows with `On/Off` metadata. The atlas shows reorder handle, tracker icon, label, and native-looking toggle switch. Reorder exists only through accessibility actions, not visually.

**Expected:** grouped reorderable rows with visible handle + icon + toggle; disabled off rows remain visible under More options.

**Fix:** extend design primitives with a toggle and reorder-handle affordance, then render Quick Trackers as atlas list rows.

### H7 - Quick Trackers Save Model Diverges From Atlas

**Atlas ref:** `14.3`
**File:** `src/features/settings/quick-trackers/screens/QuickTrackersSettingsScreen.tsx`

Native screen adds a full-width bottom `Save` CTA. The atlas has no bottom save button and implies direct persistence or header-level navigation.

**Expected:** no bottom primary CTA in the artboard.

**Fix:** decide whether tracker changes save immediately or require explicit save. If explicit save is required, update the design contract/atlas instead of silently diverging.

**Resolution 2026-06-14:** retained the atlas-aligned implicit-save model with no bottom Save CTA and added rollback-on-save-failure coverage so the UI does not display unsaved tracker state after a failed persistence attempt.

## Medium Priority Findings

### M1 - Today Starter Rows Missing Chevrons / Action Affordance

**Atlas ref:** `3.1`
**File:** `src/features/today/components/TodayCards.tsx`

The three starter rows render without trailing chevrons and without an interaction target, while the atlas shows chevrons.

**Fix:** add chevron/accessory and wire the intended action, or document that these rows are intentionally static.

### M2 - Active Tab Styling Is Outline-Only

**Atlas ref:** `3.1`, tab bar contract
**Files:** `app/(tabs)/_layout.tsx`, `src/design/primitives/AppIcon.tsx`

Active tint uses `primary[600]`, and tab icons render outline-only. The design token contract expects `primary/700` plus filled active icon treatment.

**Fix:** consume `focused` in `tabBarIcon`, use `primary[700]`, and add focused/filled variants for nav icons.

### M3 - Today Hero Accessibility Label Is Incomplete

**Atlas ref:** `3.1`
**File:** `src/features/today/components/TodayCards.tsx`

Hero card accessibility label only includes the title, omitting eyebrow/body/action context.

**Fix:** compose the hero label from eyebrow + title + body when present + primary action label while keeping the CTA independently operable.

### M4 - Quick Log Snackbar Visual Style Is Not Atlas Dark Snackbar

**Atlas ref:** `4.2`
**File:** `src/design/primitives/Snackbar.tsx`

Saved Quick Log feedback uses generic success tint styling. The atlas shows a dark elevated snackbar with white text and action treatment.

**Fix:** add a Quick Log undo snackbar variant or adjust saved-log snackbar styling to match `4.2`.

### M5 - Quick Log Failed State Mixes Recovery Rows Into Picker Sheet

**Atlas ref:** `4.5`
**Files:** `src/features/quick-log/components/QuickLogLocalEvents.tsx`, `src/features/quick-log/screens/QuickLogShell.tsx`, `src/features/today/screens/TodayScreen.tsx`

The default picker can append failed/pending local-event cards under the tracker grid. The atlas `4.5` is a Today feedback state with banner + failed row actions.

**Fix:** keep default sheet as the 5-tile picker, move retry/discard visual recovery to Today/Timeline, and capture native evidence for `4.5`.

### M6 - Timeline Pending Rows Can Show Inline Actions

**Atlas ref:** `5.2`
**File:** `src/features/timeline/screens/TimelineScreen.tsx`

Pending rows can show inline undo/delete compact actions when handlers exist. Atlas shows only the pending/saving pill.

**Fix:** keep inline actions for failed rows only; move pending actions behind overflow/menu.

**Resolution 2026-06-14:** pending Timeline rows now expose Undo/Delete through the overflow affordance and accessibility actions; visible compact actions remain for failed rows only.

### M7 - Timeline Row Metadata Repeats Time And Drops Detail Text

**Atlas refs:** `5.1`, `5.4`
**File:** `src/features/timeline/screens/TimelineScreen.tsx`

The row body repeats the timestamp already shown in the left time column and does not render event detail/subtitle text like amount/context notes.

**Fix:** expose detail/subtitle from the event view, render it in the body, and keep actor attribution separate from the left-column time.

### M8 - Health Empty State Missing Atlas CTAs

**Atlas ref:** `11.6`
**File:** `src/features/health/screens/HealthScreen.tsx`

Empty state lacks the atlas primary `Add entry` and secondary `Browse templates` affordances.

**Fix:** add non-writing safe disabled/deferred actions or explicitly document CTA omission as deferred.

**Resolution 2026-06-14:** production Health empty state renders the atlas CTAs as disabled/deferred actions until PUP-25 ships the create/edit flow.

### M9 - Puppy Profile Missing Avatar Hero

**Atlas refs:** `14.2-default`, `14.2-editing`
**File:** `src/features/profile/screens/PuppyProfileSettingsScreen.tsx`

Profile shows only a disabled `Change photo` action. The atlas has a centered 88-96pt avatar/photo hero with edit badge and link below.

**Fix:** render the existing `Avatar` primitive in saved/editing profile states; keep photo change disabled until backed by product behavior.

### M10 - Puppy Profile Saved Sections Are Not Grouped Like Atlas

**Atlas ref:** `14.2-default`
**File:** `src/features/profile/screens/PuppyProfileSettingsScreen.tsx`

Saved profile uses loose stacks rather than rounded grouped-list containers.

**Fix:** reuse `SectionHeader`, `ListGroup`, and settings `ListRow` primitives for profile sections.

## Low / Evidence Findings

### L1 - Today Native Evidence Is Stale

**Atlas ref:** `3.1`
**Files/evidence:** `app/(tabs)/_layout.tsx`, `/tmp/puppyplan-design-fidelity-2026-06-13/after/today-phase3-after.jpg`

Retained Today screenshot shows the older centered FAB, while current code positions the FAB at the right.

**Fix:** recapture a redacted current Today screenshot after the right-FAB change.

### L2 - Quick Log Scrim Accessibility Props Conflict

**Atlas ref:** `4.1`
**File:** `src/features/quick-log/screens/QuickLogShell.tsx`

The scrim has label/role/button behavior but also spreads decorative accessibility props.

**Fix:** either expose the scrim as a real accessible dismiss action or keep it decorative and provide one clear accessible close affordance.

### L3 - Quick Log Details Has No Retained Native Evidence

**Atlas ref:** `4.6`
**Files:** `src/features/_dev/design-gallery/DesignGalleryScreen.tsx`, `src/features/quick-log/screens/QuickLogDetailsScreen.tsx`

This is not a production mismatch because details are deferred, but the active plan counts coverage through tests/dev-gallery without retained native screenshot evidence.

**Fix:** capture a dev-gallery native screenshot for `4.6` or mark visual evidence as pending.

### L4 - Health Empty Illustration Differs From Atlas

**Atlas ref:** `11.6`
**File:** `src/design/primitives/EmptyState.tsx`

Shared `EmptyState` uses a generic larger solid frame; atlas Health empty uses a smaller striped rounded square.

**Fix:** add an `EmptyState` visual variant or Health-specific override via design primitives.

### L5 - Puppy Profile Missing Optional Microchip Row

**Atlas ref:** `14.2-default`
**File:** `src/features/profile/screens/PuppyProfileSettingsScreen.tsx`

Atlas saved view includes Microchip in optional rows; native saved view includes Weight and Note only.

**Fix:** add a deferred Microchip row or document why it is intentionally excluded.

## No-Issue Notes

- Primary tabs are correctly limited to `Today | Health | More`.
- Quick Log is not a tab; it is a FAB action opening `/quick-log`.
- Current More `14.1` section order, primary puppy/settings entries, Timeline entry, bottom padding, and deferred row representation are broadly aligned with the active plan.
- Timeline synced rows correctly hide the synced pill by default.
- Timeline filter chips exist and event icons map from event type rather than localized title text.
- Quick Log `4.1` base sheet has no blocking visual issue in retained evidence for tile count, opaque surface, scrim, and bottom placement.
- Deferred More rows for notifications, privacy/account, and delete behavior were not counted as missing production screens.

## Recommended Fix Order

1. **Decision pass:** resolved 2026-06-14 for Health `11.1` as explicit review fixture plus production empty/deferred default, Quick Trackers implicit-save rollback, and Quick Log `Add details`/duplicate-warning production reachability.
2. **Shared primitives pass:** settings header, toggle, reorder handle, filled tab icons, snackbar dark variant, optional empty-state variant.
3. **Screen fidelity pass:** Today chevrons/a11y, Timeline grouping/metadata/actions, Profile avatar/grouped rows/microchip, Health chosen state, Quick Log duplicate/snackbar states.
4. **Evidence pass:** recapture redacted native screenshots for `3.1`, `4.2`, `4.4`, `4.5`, `4.6` synthetic/dev-gallery if still counted, `5.1`, `5.4`, chosen Health state, `14.2`, and `14.3`.
5. **Verification pass:** focused render tests for each changed screen, i18n parity, privacy/text hygiene, `npm run check`, and redacted simulator evidence.

## Implementation Guardrails

- Do not add dependencies without approval.
- Do not add fake production health data unless it is explicitly scoped as a safe visual shell and covered by tests/docs.
- Do not treat deferred screens as production regressions.
- Do not retain screenshots containing real puppy/user/provider data.
- Keep `app/` thin; implement reusable UI through `src/design` primitives.
- Keep all visible strings in EN/RU/ES i18n files.
