# Senior Pass

**Status:** Canonical, mandatory for every implementation task. Created 2026-07-23.
**Owners:** all implementation agents (human or AI).
**Related:** `AGENTS.md` (Definition Of Done, Review Checklist), `docs/agents/design-fidelity-pipeline.md`, `.agents/skills/implement`, `.agents/skills/ux-audit`, `.agents/skills/review`, `.agents/skills/review-deep`.

## Why this exists

The repo already had a Design Fidelity Pipeline, seven skills, a Definition Of Done, and a
Review Checklist — yet the diary still shipped as junior work: a feature that "kind of runs" is
handed to the owner with real bugs and visuals far from the atlas, and then costs many finishing
iterations. The machinery checked **whether what got built matched the atlas and passed tests**. It
did **not** check two things:

1. **Foresight before code** — did we plan the *whole contour* (all states, edge cases, adjacent
   screens, existing entry points, data lifecycle), or just the literal request? The diary shipped
   a hero CTA duplicating the existing `+` FAB (`f03f705`), dropped edits at midnight (`1e099a9`),
   and lost offline check-offs (`189d7da`) — all foresight gaps, not fidelity gaps.
2. **A senior review before hand-off** — the Review Checklist existed but as a *separate activity*,
   so small edits skipped it, and a self-recorded Stage 4 `PASS` can be false (`54a6a31` shipped
   user prose in a display face despite a green test). "Works kind of" reached the owner unreviewed.

The Senior Pass adds exactly these two gates, calibrated by task size, and a living checklist so a
class of mistake never costs a second iteration twice.

**Core principle:** think the whole contour *before* code, and never hand over work you have not
adversarially reviewed with your own eyes *after* — sized to the task, not as ceremony on every edit.

## Calibration by task size

| Size | Examples | Gate 1 (Contour) | Gate 2 (Self-review) | Independent review |
| --- | --- | --- | --- | --- |
| **Trivial** | copy tweak, one design token, single-line fix | skip — build at senior level | quick self-check | no |
| **Medium** | one screen's behavior, a bug fix, a component change | in-head / one-liner | **mandatory** | no |
| **Feature** | new flow, multi-screen, data lifecycle, schema/contract | **written, shown to owner before code** | **mandatory** | **yes** — `ux-audit` + `review`/`review-deep` |

When unsure which size, round **up** one level. The diary died from "just a small edit" that was
actually medium.

## Gate 1 — Contour (before code)

Answer these before touching code. For a feature, write them into the plan / Linear issue and show
the owner for alignment first. For medium work, run them in your head. If any answer is "I don't
know," that is the first thing to find out — not to guess.

- **Intent** — what is the *real* goal behind the request, not the literal text? What would a senior
  assume the owner actually wants?
- **Surface** — every state this touches: default, empty, loading, error, pending, offline. Every
  screen and **existing entry point** it affects. Before adding a new CTA, is there already one? The
  diary shipped a hero CTA duplicating the existing `+` FAB (`f03f705`).
- **Edge / lifecycle** — the midnight boundary (never gate writes on `todayDate`; a save spanning
  midnight was silently dropped in `1e099a9`), offline round-trip and re-sync, backdating,
  edit/cancel, device hand-off. Walk the data from create → edit → sync → conflict.
- **Design decision** — which primitive and which *slot*, matched to which atlas artboard ID. User
  prose must not land in a generated-label/display slot: it loses its text face and line clamp (a
  quick note once rendered as a full-screen display-weight wall).
- **Blast radius** — what could this break? Which tests, queries, invalidations, RLS paths?
- **Better idea?** — is there a cleaner approach than literally asked? Senior instinct is to propose
  it, not silently execute a worse request.

## Gate 2 — Senior self-review (before showing the owner)

Never hand over a change you have not done all of the following on. This is not optional even for
medium edits.

- **Adversarial diff re-read** — read your own diff as a hostile senior reviewer looking for the
  bug, not as its author confirming it works.
- **Eyes on the running app** — actually look at the rendered screen, not the code's promise of it.
  Rebuild the bundle first: the installed sim app is a release build that ignores Metro, so a stale
  bundle shows last week's code. Do **not** trust a self-recorded `PASS` — open the evidence PNGs
  next to the atlas.
- **Run the pre-flight checklist below.**
- **Run the area gate** — targeted tests, and `npm run check` once it exists. A tab-bar change needs
  the jest render test, not just the scaffold check.

Only after all four is the work "done" enough to show. If time is short, say what is unreviewed —
do not present unreviewed work as finished.

## Independent review (features only)

Before handing a feature to the owner, dispatch fresh eyes — you cannot fully review your own work
(that is why the self-review's `PASS` is not trusted). Two complementary passes:

- **`ux-audit`** — eyes-first audit of the running app: pixels, UX, direction-vs-execution, atlas
  fidelity. This is the cure for "visually far from the mockup." Screenshots are the input; no
  findings without them.
- **`review` / `review-deep`** (or the `code-reviewer` agent) — the code: bugs, edge cases,
  regressions, RLS/permission drift, contract/query correctness.

## Pre-flight checklist (living — append every new junior mistake)

Run before Gate 2 passes. Each line is a real shipped defect. When a *new* class of junior mistake
is caught, add a line here with its precedent so it never costs a second iteration again.

**Foresight**
- [ ] No duplicate entry point / CTA for something that already has one (`f03f705`: hero CTA
      duplicating the `+` FAB).
- [ ] Midnight handled: writes never gated on `todayDate`; a save at 23:59 → 00:01 is not lost
      (`1e099a9`).
- [ ] Offline round-trip verified: create/check/uncheck offline, then sync, without losing state
      (`189d7da`: un-check regression lost the offline check-off).
- [ ] The fix is at the right altitude — a typo is fixed as a typo, not surfaced as a sync failure
      (`20e2bd4`).

**Build**
- [ ] User prose is not routed into a generated-label/display slot; typography + line clamp asserted,
      not just that the string arrived (`54a6a31`).
- [ ] No keyboard auto-pops on sheet/screen open; focus only on explicit tap.
- [ ] Feature code uses `src/design` primitives — no raw `Pressable`, colors, spacing, haptics.

**Verify**
- [ ] Did not trust a self-recorded Stage 4 `PASS`; opened evidence PNGs next to the atlas; grepped
      for raw `Card`+`Button` grids; chips are primary/secondary, never tertiary.
- [ ] a11y assertions read what eyes read: `getByText` where the label must be visible, not only
      `getByLabelText` (which goes green on an invisible label).
- [ ] E2E ran against a freshly rebuilt bundle, not last week's embedded one (the installed sim app
      ignores Metro).
- [ ] Dynamic Type checked via the Settings app or a pre-install default — a mid-session `simctl`
      `content_size` write never reaches Expo `fontScale`.

## How it compounds

The checklist is the durable asset. Every finishing iteration the owner still has to ask for is a
missing checklist line. When that happens: fix the code, then add the line here with its precedent.
The goal is that the *same* junior mistake is impossible to ship twice.
