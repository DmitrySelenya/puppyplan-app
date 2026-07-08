# Design Fidelity Pipeline

**Status:** Canonical, mandatory for every UI task. Created 2026-06-14.
**Owners:** all implementation, review, and planning agents (human or AI).
**Related:** `docs/agents/00-operating-model.md` (Design Fidelity Gate), `docs/architecture/06-design-system-and-ui-contracts.md`, `docs/design/v1/README.md`, `docs/design/v1/native-coverage.md`, `AGENTS.md`.

## Why this exists

The repo already had a complete Design Fidelity Gate and a screenshot atlas, yet a long, manual design-recovery pass was still needed (see `docs/plans/completed/2026-06-13-design-fidelity-recovery.md` and `...-ux-audit.md`). The problem was never missing rules. The problem was **when and how** the gate fired:

- It fired **after** a whole batch, not per screen.
- It was **fully manual / eyeballed**, so interpretation gaps slipped through (missing chevrons, outline vs filled icons, wrong toggle anatomy, ungrouped lists, wrong snackbar style).
- There was **no pre-code lock**: screens were built from "visual intent" and re-interpreted instead of from a fixed per-screen contract.
- The **primitive library lagged the atlas**, so screens could not be built faithfully because the building blocks did not exist yet.

**Core principle:** design must be *locked and inspectable before code*, and visual comparison must be a *per-screen, pre-Done* step — never a recovery phase after a big batch.

## Source of truth

The canonical visual source is the repo-native atlas, not Figma:

- `docs/design/v1/manifest.json` — artboard inventory (sections, routes, states, dimensions, IDs).
- `docs/design/v1/screenshots/` + `screenshots/index.md` — the PNG atlas (referenced by ID, e.g. `3.1`, `4.1`, `11.1`).
- `docs/design/v1/raw/screens/*.jsx`, `components.jsx`, `icons.jsx`, `tokens.css` — **visual intent only**; do not copy web JSX into native screens.
- `design-tokens.json` → `src/design/tokens.ts` (via `npm run tokens:generate`, drift-guarded by `npm run tokens:check`).

Figma / Code Connect is intentionally **deferred** (see "Deferred layers"). If a newer external design package ever supersedes the atlas, follow `docs/design/v1/README.md` to reconcile and re-baseline before using it.

## The pipeline (hard sequence — do not skip or reorder)

### Stage 0 — Design Lock (pre-code, hard gate)

No UI coding starts until the task carries a **lock package**:

```
PUP issue → artboard IDs → states → device sizes → allowed deviations → screenshot refs
```

- Resolve every affected artboard ID and state from `manifest.json` + `screenshots/index.md`. **If no artboard/state ID resolves (and there is no user-approved fresh export), coding does not start** — stop and request exact screenshots or scope.
- Write/refresh a per-screen **spec card** at `docs/design/v1/specs/<atlas-id>-<slug>.md` using the template below. The spec card, not the raw JSX, is the build contract and the assertion source.
- List **allowed deviations** explicitly and up front (any approved divergence from the atlas), so they are never re-litigated during review.
- Record the lock package in the plan and the Linear issue.

### Stage 1 — Primitives first

- If the screen cannot be assembled purely from `src/design/primitives` at atlas fidelity, **extend the primitives first** (with tests), then build the screen. No feature-local layout, colors, spacing, icons, `Pressable`, or haptics — this is already required by `docs/architecture/06-design-system-and-ui-contracts.md`.
- Verify each new/changed primitive variant in the dev gallery (`/_dev/components`, `src/features/_dev/design-gallery`) against the atlas component sheet (`docs/design/v1/screenshots/foundation/`).

### Stage 2 — Build the screen

- Assemble the production screen from the spec card + primitives. Keep `app/` thin. All strings through typed i18n (EN/RU/ES).

### Stage 3 — Structural anatomy assertions (cheap, deterministic, CI)

- Add/extend `src/test/*.render.test.tsx` that assert the spec-card anatomy: presence and **order** of elements, chevrons/accessories, icon names, token values in resolved styles, a11y labels/roles, and each covered state.
- These run inside `npm run check`. They are the first-line, no-simulator catch for the interpretation-gap class of bugs (grouping, chevrons, icon weight, control anatomy).

### Stage 4 — Native screenshot comparison loop (agent, per-screen, pre-Done)

This is the existing Design Fidelity Gate, applied **per screen/state and before Done**, not as a batch-end audit.

- For each affected screen/state: run the approved local simulator profile (SE profile per `AGENTS.md` "Mobile E2E"; a larger device only with explicit user approval and never as a replacement for the compact-device check), open the state with **synthetic data**, capture a screenshot, and build a side-by-side / contact sheet against the matching atlas PNG.
- Compare layout, spacing, typography scale, color, iconography, tab/FAB placement, copy hierarchy, and loading/empty/error/pending/permission states.
- Gate the task: record `PASS` only when the screen is visually aligned with the artboard (within allowed deviations), or `BLOCKED/FAIL` with exact mismatches + screenshots. Do not move to Done while a screen is off-mockup unless the user approves a named deviation.

## Evidence and privacy

- Record Stage 0 lock and Stage 4 result (`PASS` / `BLOCKED`) in the active plan and the Linear issue.
- Screenshots use synthetic data only. Never store raw puppy names, notes, emails, provider names, photos, tokens, or production data in repo docs, Linear, PRs, screenshots, or logs. Redact before retaining.

## Spec-card template

Save as `docs/design/v1/specs/<atlas-id>-<slug>.md`:

```md
# <atlas-id> — <screen name>
Route: <expo route>   Atlas: docs/design/v1/screenshots/<path>.png
Device sizes: <e.g. SE compact (primary)>
Allowed deviations: <explicit list, or "none">

## Anatomy (top → bottom)
- <component> — <key props: variant, eyebrow/title/copy, icon name @size, chevron y/n>
- ...

## Tokens
- content padding: <n>   section gaps: <n>   <other notable spacing/elevation>

## States covered
- <default / empty / error / pending / permission> — <production | synthetic | deferred>

## Accessibility
- <label composition, roles, touch targets, Dynamic Type notes>

## Notes / deferred
- <what is intentionally out of scope or synthetic-only>
```

## Definition of Done (copy into the task)

- [ ] Stage 0 lock recorded: artboard IDs, states, device sizes, allowed deviations, screenshot refs, spec card written.
- [ ] Stage 1: screen builds only from `src/design` primitives; any new variant shown in dev gallery vs atlas component sheet.
- [ ] Stage 3: structural anatomy render tests added/updated and passing in `npm run check`.
- [ ] Stage 4: per-screen native screenshot vs atlas recorded `PASS` (or named, approved deviation) — not deferred to a later batch.
- [ ] Evidence in plan + Linear; screenshots synthetic/redacted.

## Deferred layers (NOT now — adopt only when triggered)

These were considered and intentionally postponed to keep the solo/indie cadence cheap and non-flaky. Revisit when the trigger is met:

- **Automated native pixel diff** (`jest-image-snapshot` / Maestro `assertScreenshot`) — trigger: dev-build workflow is stable AND screen count makes the manual Stage 4 loop the bottleneck. RN simulator pixel baselines are flaky (fonts/subpixels/iOS version/safe-area); keep environment identical before adopting.
- **Atlas self-check in CI** (vendor React/Babel, headless-render the atlas, diff vs committed PNGs) — trigger: the raw design source starts drifting from the committed atlas. Half-built already in `scripts/design/export-artboard-screenshots.mjs`.
- **Figma-first + Code Connect** (Figma becomes canon; map Figma components ↔ `src/design` primitives via Figma MCP) — trigger: the team decides to move the canon into Figma. Most precise long-term path, highest setup/seat cost.
