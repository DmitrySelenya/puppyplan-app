# Cloud Design handoff prompt — Sitter & Trainer, round 2 (review fixes)

> Paste the block below into the Cloud Design (claude.ai/design) chat for the
> PuppyPlan_V2 board. This is the **corrections pass** after a two-reviewer audit of
> round 1 — the architecture is correct, these are cleanup + fidelity fixes. The more
> of our docs you attach, the more faithful the result. Recommended attachments, in
> priority order:
>
> 1. `docs/design/v2/specs/sharing-sitter-trainer-v2.md` (the design lock — wins on any conflict)
> 2. `docs/design/v2/decisions/2026-06-23-sharing-access-model.md` (the 9 agreed decisions)
> 3. `docs/architecture/screen-states-matrix.md` (required states per screen — for the 🟡 fixes)
> 4. `docs/design/v2/raw/uploads/DESIGN.md` Part 3 (§3.2–3.4 — anatomy, copy)
> 5. The current `components.jsx`, `screens/sitter.jsx`, `screens/sharing.jsx`,
>    `screens/cards.jsx`, `screens/more.jsx`, `tokens.css`, `PuppyPlan.html` are already
>    on the board — reference them by filename.
>
> Round 1 already landed correctly and must NOT be undone: trainer/card recipients
> render in `WebFrame` (browser, no account, live, soft footer — never a gate); sitter is
> an in-app badged household share with one-step invite, recoverable sign-in, badged
> "You're sitting" home + role switcher; cards reuse the same `WebFrame`; one neutral
> unavailable state; More IA split. Keep all of that.

---

## PROMPT

You are editing the PuppyPlan_V2 design-canvas board. This is a **surgical corrections pass**, not a redesign. Keep the existing design DNA and all current tokens (the live palette is the "Warm Refresh" — Clay primary, Sage, Honey accent; Lora display). Where this prompt and the attached `sharing-sitter-trainer-v2.md` lock disagree, follow the lock. Do not weaken, skip, or stub anything to make it look done — fix the underlying screen.

Apply the fixes below in priority order. Each names the exact file + function.

---

### 🔴 MUST-FIX

**1. Delete the retired two-step sitter-enable flow.**
`screens/sitter.jsx` still defines `ScreenSitterEnable` (with its `no-caregiver` "First invite a caregiver" branch and `pending-invite` branch), and `PuppyPlan.html` still places it as artboards **7.1-ready** and **7.1-pending**. Decision #4 and the lock (deviation `V2-SITTER-ONESTEP-MERGE`) retire this flow — the one-step `ScreenSitterShare` (7.0) is the single canonical owner entry.
- Remove `ScreenSitterEnable` from `sitter.jsx` and from its `Object.assign(window, …)` export.
- Remove the `7.1-ready` and `7.1-pending` `<DCArtboard>`s from section 7 in `PuppyPlan.html`.
- The "who already exists" affordance is already covered by the person chips in `ScreenSitterShare`; do not reintroduce a separate enable screen.

**2. Refresh the stale canvas "Read me" (§0 intro in `PuppyPlan.html`).**
It still describes the pre-ADR-0018 world. Update these bullets:
- Included list: `8 · Trainer — scope selector, preview, accepted view` → `8 · Trainer — scope selector, link-first preview, link created, trainer WEB view (WebFrame · no app)`
- Included list: `10 · Revoked/expired — single neutral state` → `10 · Revoked/expired — in-app membership state + web WebShareUnavailable (one neutral copy)`
- "Added in this pass": `7 · Trusted Sitter — enable (ready / pending / no-caregiver), sitter checklist, owner status, exit-confirm` → `7 · Trusted Sitter — one-step share, invitee accept (intro / sign-in / done), badged shared home + role switcher, sitter checklist, owner status, exit-confirm`

**3. Fix the two real sample-data inconsistencies (do NOT rename the cast).**
The intended cast is consistent and must be preserved: **owner = "You" in-app / "Owner A" to external recipients · sitter = Sitter A · second caregiver = Caregiver B · puppy = Puppy A · sitter's own dog = Sitter Puppy A.** Do not rename Sitter A to Owner A. Only fix these two genuine drifts:
- `screens/sitter.jsx` › `ScreenSitterChecklist`: the snackbar `Done. Caregiver B has been notified.` → `Done. Owner A has been notified.` (the completion-push goes to the **owner**, not a caregiver; Caregiver B is only a pending caregiver invite in the family list).
- `screens/more.jsx` › `ScreenReminders`: the "Trusted sitter" row subtitle `3 items · sitter: Caregiver A` → `3 items · sitter: Sitter A`.

**4. Give "sitter" its own token + pill tone; stop reusing `warning` and raw hex.**
The sitter badge/tint currently hardcodes honey hex that, by value, collides with the `needs-vet-review` / `urgent` pill tokens — so a calm "sitting" state reads like "needs attention."
- In `tokens.css`, add a dedicated set:
  ```css
  --pp-sitter-tint:   #FBF3E2;  /* "You're sitting" card fill */
  --pp-sitter-stroke: #EAD9B6;  /* its border */
  --pp-sitter-fill:   #F7EAD2;  /* Sitter pill fill */
  --pp-sitter-text:   #7E5A18;  /* Sitter pill text */
  ```
- In `components.jsx` `PILL_PRESETS`, add:
  ```js
  sitter: { fill: 'var(--pp-sitter-fill)', text: 'var(--pp-sitter-text)', icon: 'ui.checkmark.seal' },
  ```
- Replace every inline override with the preset. In `ScreenSitterChecklist`, `ScreenSitterHome`, `ScreenPuppySwitcher`: `<Pill tone="warning" icon="ui.checkmark.seal" style={{ background: '#F7EAD2', color: '#7E5A18' }}>Sitter</Pill>` → `<Pill tone="sitter">Sitter</Pill>`.
- In `ScreenSitterHome`, the "You're sitting" wrapper `background: '#FBF3E2'` / `border: '1px solid #EAD9B6'` → `var(--pp-sitter-tint)` / `1px solid var(--pp-sitter-stroke)`.

---

### 🟡 SHOULD-FIX

**5. Add the trainer web view's missing states (required by `screen-states-matrix`).**
`WebTrainerShare` only renders the populated view. The matrix requires `loading` and `empty (per scope)` for "Trainer Web View (recipient)."
- Add a `loading` variant: skeletons (`Skel`) inside the `WebFrame` body (header band can stay).
- Add an `empty-per-scope` treatment: when a granted scope has no data, render a muted row, e.g. `No training notes yet for this range.` / `No activity recorded in this period.` — never an empty white page.
- Drive both via a `state` prop on `WebTrainerShare` and add artboards `8.3-loading` and `8.3-empty` in `PuppyPlan.html` (in the same `WebShell`, 760×WH).

**6. Recolor the sitter-checklist deadline strip — it is not a warning.**
`screens/sitter.jsx` › `ScreenSitterChecklist`: the "Sitter mode through May 19, 09:00" strip uses `--pp-warning-tint` + `--pp-warning` rail/text. A countdown of a normal window is a calm fact (the codebase already removed an amber rail elsewhere "for an unnecessary tense tone"). Switch it to the new sitter tint (`--pp-sitter-tint` fill, `--pp-sitter-text` text, `--pp-sitter-fill`/honey rail) or `Banner tone="info"`. Also swap the leading glyph from `status.template` (a doc icon) to a time glyph (clock/calendar).

**7. Disambiguate the in-app revoked state (keep it — it's spec-sanctioned).**
`ScreenRevokedExpired` (`Phone`, artboard 10.1) is intentionally separate from the web `WebShareUnavailable` (it covers a revoked **membership inside the app**, per decision #9 / DESIGN §3.3.6) — keep it and its identical copy. Only relabel artboard 10.1 from `10.1 Revoked or expired · neutral` → `10.1 Revoked / expired · in-app membership`, so it doesn't read as a duplicate of the web 8.4.

**8. Three small consistency fixes.**
- `components.jsx` › `WebHeaderBand`: `access from {owner}` reads like a debug string → `Shared by {owner}`.
- `components.jsx` › `WebHeaderBand`: the puppy name uses an off-scale `fontSize: 32` → use the type ramp (`pp-title-1` = 28, or the unmodified `pp-display` token), not a one-off 32.
- `screens/more.jsx` › `ScreenReminders`: the "Trusted sitter" row hand-rolls a `3×36` `--pp-primary-500` leading bar that exists nowhere else and over-weights the least-urgent row. Drop the bar (use the plain seal icon like sibling rows). Rename the section header `Trusted sitter` → `Sitter` to match every other surface.

---

### 🟢 NICE-TO-HAVE

**9. Real Apple mark on "Continue with Apple" (App Store requirement).**
`screens/sitter.jsx` › `ScreenSitterAcceptSignIn`: the Apple button uses `ui.paw.filled` as its glyph. Sign in with Apple requires the Apple logo — add an `apple` mark to `icons.jsx` and use it here. (Keep the Google multi-color dot as-is.)

**10. Tokenize the `WebFrame` browser chrome.**
`components.jsx` › `WebFrame`: chrome `background: '#E4DBCB'` ≈ `--pp-stroke` (`#E4D9C8`) → use the token (the 1px difference is invisible). Leave the three traffic-light hexes as an illustration constant but add a one-line comment marking them deliberate, or token them as `--pp-web-chrome-dot-*`.

**11. Extract two primitives (after #1 removes the duplicate).**
The five-item checklist block and the From→through date card are duplicated patterns. Extract `ChecklistPicker` (the 5 toggle rows) and `DateRangeCard` into `components.jsx`; reuse in `ScreenSitterShare` and the sitter-checklist view.

**12. Close the open transitions.**
- `screens/sitter.jsx` › `ScreenSitterAcceptIntro`: "Not now" has no destination — add a simple decline/return state (e.g. a neutral "Maybe later" screen or dismissal).
- The accept flow has no email-code entry screen — `ScreenSitterAcceptSignIn` says "Email me a code" but the code-entry step isn't drawn. Add a 6-digit OTP entry artboard between sign-in and done.
- `ScreenSitterChecklist` "Open the timeline" link — point it at the existing timeline view.

**13. (Deferred — do NOT build this pass, just note it) short-code fallback.**
Decision #5 lists an optional "I have a code" manual-code path on the accept screen. It is intentionally deferred to a later pass — leave a one-line code comment in `ScreenSitterAcceptSignIn` noting it as a future affordance; do not add UI now.

**14. Palette comment sweep.**
Several code comments still say "teal" / "amber rail" from the pre-Warm-Refresh palette (the live tokens are Clay/Sage/Honey). Update stale comments where you touch a file so they don't mislead the next reader. Cosmetic only — do not change any values.

---

### Invariants — do not regress while fixing
- Recipient (non-member) surfaces render ONLY in `WebFrame`, never in `Phone`.
- The `WebFrame` "Get PuppyPlan" footer stays a soft hook; `WebShareUnavailable` keeps `footer={false}`.
- One neutral unavailable copy ("This access is no longer available" / "Contact the owner if you need new access") across in-app + web.
- Trainer owner flow stays link-first (primary = Create/Copy link; email optional).
- Sitter sign-in stays recoverable-identity only (Apple / Google / email code; "No password"); no anonymous path.
- Web views show only sanitized projections — no exact times, health notes, vet/owner contacts, or private notes.

### Acceptance checklist (verify before you finish)
- [ ] `ScreenSitterEnable` gone from `sitter.jsx` and `PuppyPlan.html`; 7.0 is the only owner sitter entry.
- [ ] Read-me §0 bullets 7 / 8 / 10 updated.
- [ ] Snackbar says "Owner A has been notified"; Reminders says "sitter: Sitter A".
- [ ] `--pp-sitter-*` tokens exist; `tone="sitter"` preset added; zero inline `#F7EAD2` / `#FBF3E2` / `#7E5A18` / `#EAD9B6` left in sitter screens.
- [ ] `WebTrainerShare` has loading + empty-per-scope states + artboards.
- [ ] Deadline strip no longer uses `--pp-warning`.
- [ ] Artboard 10.1 relabeled "in-app membership".
- [ ] `WebHeaderBand` says "Shared by {owner}" and uses an on-ramp font size.
- [ ] Reminders "Sitter" row has no bespoke bar; section renamed "Sitter".
- [ ] Apple button uses an Apple mark.
- [ ] No recipient surface moved into `Phone`; footer/invariants intact.
