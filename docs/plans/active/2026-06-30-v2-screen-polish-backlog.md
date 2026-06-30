# V2 Screen Polish — Backlog for Codex

> **For Codex:** This is the follow-up backlog after the nav-capsule plan
> ([`2026-06-30-v2-nav-capsule.md`](2026-06-30-v2-nav-capsule.md)). Do the nav plan FIRST.
> These are smaller, mostly screen-level fixes found during a live simulator walkthrough on
> 2026-06-30 (Diary → Quick Log → Pet → More). Each item lists the exact location, what's
> wrong, the target, and acceptance. Severity: P1 = visible polish/correctness, P2 = nice-to-have.

## Ground rules (same as the nav plan)

- Tokens only; typed i18n keys only; primitives only. No hardcoded colors/spacing.
- Never weaken a check to make it pass. If a fix legitimately changes a test's expectation
  (e.g. item 3 changes how many "Deferred" rows exist), UPDATE the test to assert the new
  correct behavior — do not delete or skip it.
- User-facing strings live in `STRINGS.en.json` (repo root) and its sibling locale files.
  Update every locale, then run `node scripts/checks/check-i18n.mjs`.
- Token changes go through `design-tokens.json` → `npm run tokens:generate` → `npm run tokens:check`
  (the same pipeline used for the Terracotta Clay sync). Never edit `src/design/tokens.ts` by hand.
- After each item: run `npm run check` and commit separately.

---

## P1 — Item 1: Dev-leak copy on the Pet "Quick trackers" card

**What's wrong:** The Pet hub shows the implementation detail "Adjust the five Add buttons".
Users don't think in "Add buttons", and "five" hardcodes a count that the feature itself treats
as "up to 5".

**Location:** `STRINGS.en.json`
- `health.pet-hub.quick-trackers-meta` = `"Adjust the five Add buttons"`
- `health.pet-hub.quick-trackers-a11y` = `"Quick trackers. Adjust the five Add buttons."`

**Target:** Reword to user-facing language, consistent with the existing
`more.quick-trackers.hint` = `"Pick up to 5 trackers for Today and Quick Log."` Reuse that phrasing
(e.g. meta = `"Pick up to 5 for Today and Quick Log"`; a11y mirrors it). Update all locales.

**Acceptance:** No occurrence of "Add buttons" / "five" in any user-facing `health.pet-hub.*`
string; `check-i18n.mjs` green; any snapshot/render test referencing the old copy updated.

## P1 — Item 2: Pet ↔ More duplication (Puppy profile, Quick trackers)

**What's wrong:** "Puppy profile" and "Quick trackers" appear as entry points on BOTH the Pet hub
and the More screen, with no clear primary home — it muddies the information architecture.

**Locations:**
- Pet hub: `src/features/health/screens/HealthScreen.tsx` (renders the profile card +
  `health.pet-hub.quick-trackers-*`).
- More: `more.rows.quick-trackers` / `more.rows.puppy-profile` rows + `src/features/more/...`
  and `more.quick-trackers.*` settings screen.

**This is an IA decision, not a mechanical fix.** Decide ONE canonical home for each:
- Recommended: Pet hub owns puppy profile + quick-trackers (they're pet-scoped); More keeps a
  single "Pet settings" entry that deep-links into the Pet hub, instead of duplicating both rows.
- Whatever is chosen, document it in `docs/design/v1/specs/` (the Pet and More spec cards) so it's
  locked, then implement. Update `src/test/more-settings.render.test.tsx` to match the new row set.

**Acceptance:** Each of "Puppy profile" and "Quick trackers" has exactly one primary entry point;
the spec cards state where; tests updated and green.

## P1 — Item 3: "Deferred" rows exposed to users in More

**What's wrong (nuance):** More renders 7 rows tagged `"Deferred"` (Family, Trainer/sitter,
Reminders, …). This is currently a **deliberate, tested** decision — `more.rows.deferred` and
`src/test/more-settings.render.test.tsx` asserts exactly 7 deferred rows. But showing internal
roadmap status ("Deferred") to end users reads as unfinished product.

**Location:** `more.rows.deferred` in `STRINGS.en.json`; `src/features/more/...`;
test `src/test/more-settings.render.test.tsx:117-118`.

**Decision needed (design):** Pick one —
(a) hide deferred rows entirely in production builds (keep them in the dev gallery);
(b) keep the rows but replace the "Deferred" tag with a neutral "Coming soon" or a lock affordance;
(c) leave as-is (accept it).
Record the decision in the More spec card before changing code. If (a)/(b), update the render test
to assert the new behavior (legitimate — the spec changed), do not just delete the assertion.

**Acceptance:** Decision recorded in spec; More screen matches it; test reflects the new contract.

## P1 — Item 4: Teal "Done" status pill is a Calm-Teal leftover

**What's wrong:** The `completed`/"Done" status pill is teal (`#EAF3F3` fill / `#175255` text),
a remnant of the retired Calm Teal palette. It clashes with the Terracotta Clay system.

**Location:** `design-tokens.json` → `color.pill.completed` (generates
`tokens.color.pill.completed` in `src/design/tokens.ts:84-87`). Used wherever a `completed`/done
StatusPill renders (Pet hub status chips).

**Target:** Re-tone to the V2 system — either a neutral "done" (greys from `color.text`/`surface`)
or a desaturated success that harmonizes with terracotta. Keep it visually distinct from
`success` (`#3F7A57`) and `confirmed` (green). Verify text-on-fill contrast ≥ 4.5:1.

**Do it via the token pipeline:** edit `design-tokens.json`, `npm run tokens:generate`,
`npm run tokens:check`. Reference DESIGN.md §2 for the canonical ramp.

**Acceptance:** No teal (`#175255`/`#EAF3F3`) remains in `color.pill.*`; contrast checked;
tokens regenerated and drift-check green.

## P1 — Item 5: Screen-title hierarchy is inconsistent

**What's wrong:** "Diary" renders as a large Lora display title, but "Pet" and "More" render
noticeably smaller. There's no single rule for the screen title.

**Location:** the `ScreenHeader` primitive (`src/design/primitives/ScreenHeader.tsx`) and each
screen's usage (Diary, Pet/HealthScreen, More). Compare the `variant`/size each passes.

**Target:** One consistent screen-title treatment across Diary/Pet/More (pick the Diary display
size as canonical unless the spec says otherwise). Drive it from `ScreenHeader` defaults so screens
don't each choose their own size.

**Acceptance:** Diary, Pet, More share the same title typography token; verified in the simulator.

## P2 — Item 6: Verify the Pet empty state isn't a near-empty void

**What to check (verify-first, may be fine):** In the walkthrough, the Pet hub's health section
read as a large card with just a stethoscope icon. The code DOES use a full `EmptyState` with body
+ two CTAs (`src/features/health/screens/HealthScreen.tsx:95-105`,
`health.empty.body` / `health.empty.primary` / `health.empty.secondary`).

**Target:** Confirm the body text and both CTAs actually render (not clipped/below the fold) and
the card isn't mostly whitespace. If the icon-only impression is real, tighten the empty-state
spacing or ensure body+actions are visible without scrolling. No change if it renders correctly.

**Acceptance:** Screenshot of the Pet empty state showing icon + body + CTAs; spacing adjusted only
if needed.

---

## Suggested order

Nav-capsule plan → Item 1 (trivial copy) → Item 4 (token, isolated) → Item 5 (header) →
Item 6 (verify) → Items 2 & 3 (need a design/IA decision + spec update first).

## Note on the native build

These are all JS/token/i18n changes — verifiable via JS-over-Metro on the installed binary. The
native iOS build is currently blocked by an expo-sqlite × Xcode 26.2 / Swift 6.2.3 incompatibility
(see `chore(deps): align expo packages…` commit). It does not block this backlog.
