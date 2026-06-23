# Roadmap Resequencing For Incoming Deep Redesign - Plan

> For implementation agents: this is a sequencing/strategy plan, not a feature plan. It re-orders the remaining master-roadmap work (`PUP-26..PUP-32`) so design-independent layers ship now and redesign-exposed layers wait for the new design. It does not authorize code. It amends execution order only; per-feature plans still own the detailed contracts/tests.

**Goal:** Keep delivery moving while a deep design change (new components/patterns, changed screen logic and button behavior — not just visual tokens) is pending, by building the redesign-proof trust layers now and deferring the redesign-exposed UI/flow layers until the new design locks.

**Status:** Active.

**Plan type:** Roadmap (sequencing amendment).

**Current phase:** Phase 0 - Confirm split and freeze fidelity plans.

**Architecture:** Leans entirely on the canonical trust-first phase order (`.agents/skills/plan/SKILL.md`): 1) contracts/business rules → 2) storage/migrations/RLS → 3) Edge Functions/privileged logic → 4) query hooks/cache → 5) feature UI → 6) routes/providers → 7) observability/release. A redesign that changes components/patterns/screen-logic/buttons hits layers **5–6 only**. Layers 1–4 and most of 7 are redesign-proof. The design system (`src/design/tokens` + `src/design/primitives`) is the absorption layer: the stricter features consume it (no raw colors/spacing/Pressable/haptics), the more the redesign becomes a re-skin rather than a rewrite.

**Linear:** No-Linear exception: this is a cross-issue execution-order decision over the existing `PUP-26..PUP-32` split, not a new deliverable. Per-issue Linear items already exist in the master roadmap's split table.

**Branch:** N/A (planning doc).

**TDD mode:** N/A for this doc; per-feature plans keep their own TDD mode.

**Primary source docs:**
- Roadmap: `docs/plans/active/2026-05-29-full-prd-native-app-master-roadmap.md` (Phases 4–9, split table)
- Workflow: `.agents/skills/plan/SKILL.md` (trust-first order)
- Architecture: `docs/architecture/06-design-system-and-ui-contracts.md`
- Pipeline: `docs/agents/design-fidelity-pipeline.md`
- Frozen: `docs/plans/active/2026-06-13-design-fidelity-recovery.md`, `docs/plans/active/2026-06-13-design-fidelity-ux-audit.md`

---

## Context

A deep redesign is coming. The user confirmed it changes components/patterns and the logic of screens and buttons, not just visual tokens. That invalidates effort spent matching the current `docs/design/v1` atlas and on feature-UI flow wiring that the redesign will rewrite.

- **What already exists / is redesign-proof:** contracts (`src/contracts/*`), Supabase schema + RLS baseline, generated DB types, Quick Log queue, auth/session actor, typed i18n keys, design tokens + primitives. `PUP-25` Health is complete locally.
- **What the redesign threatens:** `src/features/*` screen verstka, screen-level flow/interaction logic, button behavior, routes/providers in `app/`, and any side-by-side fidelity work against the soon-to-be-replaced v1 atlas (including the two active fidelity plans and the H1–H7 UX-audit findings).
- **Constraint:** `CLAUDE.md` already mandates that feature code consume `src/design` primitives, not raw styles. That mandate is the lever that makes the redesign cheap — so the prep work is enforcement of an existing rule, not new architecture.

---

## Goals

1. **Build the redesign-proof trust core of `PUP-26..PUP-32` now.**
   - Contracts, business rules, migrations, RLS/pgTAP, Edge Functions, share projections, scheduling/timezone logic, query hooks.
2. **Defer redesign-exposed work until the new design locks.**
   - High-fidelity screen verstka, screen-flow/button interaction assembly, atlas side-by-side fidelity, Dynamic Type / VoiceOver screenshot passes, UI-structural E2E.
3. **Freeze the v1-atlas fidelity plans** so no more effort is spent matching a design that is being replaced.
4. **Tighten the design-system boundary as redesign prep** so the change is absorbed by tokens + primitives, not by rewriting every screen.

---

## Non-Goals

- Stopping work. Pausing is not warranted; only the order changes.
- Touching the redesign content itself (new atlas/tokens) — that arrives separately and triggers a normal design-fidelity pipeline pass.
- Deleting or rewriting existing screens preemptively. Deferred ≠ removed; current screens stay as working scaffolding until the new design replaces them.
- Any schema change beyond what each per-feature plan already scopes under ADR-0007.

---

## Product Decisions Locked In

1. **Redesign depth assumption.**
   - **Chosen:** Treat the redesign as changing components/patterns + screen/button logic, not only visuals.
   - **Reason:** User-confirmed. Drives deferral of feature-UI *flow* logic, not just pixels.

2. **Trust-first order is the resequencing rule.**
   - **Chosen:** For each remaining phase, ship layers 1–4 (+ non-visual 7) now; hold layers 5–6.
   - **Reason:** Matches the canonical workflow and isolates redesign risk to two layers.

3. **Route namespace decision is "build now."**
   - **Chosen:** Resolve the `/more/*` vs `/settings/*` namespace reconciliation (master roadmap Phase 8 / locked-decision item) now, before the redesign hangs screens on it.
   - **Reason:** It is an architecture/navigation decision, not a visual one; a stable route tree is a prerequisite the redesign needs and does not threaten.

4. **Freeze, do not delete, the fidelity plans.**
   - **Chosen:** Mark `design-fidelity-recovery` and `design-fidelity-ux-audit` as paused/frozen with a pointer to this plan; do not action H1–H7.
   - **Reason:** Their target (v1 atlas) is being replaced; re-validation happens against the new atlas.

---

## Resequencing Map

Legend: **NOW** = redesign-proof, build now · **DEFER** = wait for new design · **PREP** = redesign-readiness work.

| Phase / Issue | NOW (redesign-proof) | DEFER (redesign-exposed) |
|---|---|---|
| **P4 / PUP-25 Health** | Done locally (contracts, status, RLS, share projection) | Final health screen fidelity → re-verify against new atlas |
| **P5 / PUP-26 Reminders** | Reminder/occurrence/notification-pref contracts; RLS; scheduling + timezone + quiet-hours rules; `expo-notifications` scheduling/cancel/reschedule + `local_notification_id` tracking; denied-permission logic; query hooks | Reminders hub, Today reminder card, create/edit flow verstka; Done/Snooze/Skip/Edit/Stop *button* assembly |
| **P6 / PUP-27 Family, PUP-28 Sitter** | Invite create/accept/revoke/remove Edge Functions / SECURITY DEFINER; RLS negative tests (owner/caregiver/viewer/revoked/anon); token-safe pending-intent storage; shared Today/Timeline query layer; sitter state machine | Family list, invite preview, viewer/caregiver screens, sitter checklist UI and their button flows |
| **P7 / PUP-29 Trainer, PUP-30 Cards** | Share-scope contracts; ADR-0009 projection tests (included/excluded fields); expiry/revocation logic; signed/public link logic; share-link route *handlers* | Scope selector, permission preview, card builder, share-sheet verstka and interaction logic |
| **P8 / PUP-31 More/Settings, PUP-32 Paywall** | Route-namespace reconciliation + `docs/architecture/05-navigation-and-deeplinks.md` update; entitlement no-op interface; account delete/export request contract | More list, settings screens, paywall shell verstka — **most design-exposed phase; defer aggressively** |
| **P9 / release gates** | AASA/assetlinks validation scripts; privacy-manifest artifact verification; Sentry/PostHog SDK guardrails; perf budget harness | Dynamic Type XXL/XXXL screenshots (EN/RU/ES); VoiceOver/TalkBack passes; UI-structural Maestro flows — all re-run after redesign |

**Recommended NOW order (trust-first across phases):** PUP-26 logic → PUP-27/28 sharing logic → PUP-29/30 share-projection logic → PUP-31 route-namespace decision + entitlement interface (PUP-32). Each lands as its own per-feature plan + Linear issue using the standard template; this doc only fixes the order and the NOW/DEFER line.

---

## Redesign-Prep Workstream (PREP)

Low-cost, high-leverage, do now in parallel with the NOW lane:

1. **Design-system boundary audit.** Grep `src/features/*` for raw color literals, hardcoded spacing, raw `Pressable`/`TouchableOpacity`, direct haptics, and direct business-error `Alert`s. Route every hit through `src/design` primitives/wrappers. This is enforcement of the existing `CLAUDE.md` rule and is exactly what converts the redesign into a re-skin.
2. **Primitive stability inventory.** Classify primitives as shape-stable (grouped rows, section headers, status/pending dots, avatar, empty states, form rows, sheet affordances) vs likely-to-change, so the new design's deltas concentrate in tokens + a small primitive set.
3. **Build deferred-adjacent screens thin.** Where a NOW item still needs a minimal screen to exercise the logic, build it structurally (anatomy + a11y + behavior tests asserting structure/roles, **not** pixels or atlas match) so it survives re-skin without rework.

---

## Invariants And Executable Spec

- **Invariant — no fidelity effort against v1 atlas after freeze:** the two fidelity plans show `Status: Paused/Frozen`; no new commits cite `docs/design/v1/screenshots` as an acceptance target until the new atlas lands.
  - **Check:** plan headers + PR review.
- **Invariant — NOW lane carries full trust assurance:** every NOW item keeps heavy/full-isolated TDD per its per-feature plan; deferral never lowers contract/RLS/Edge assurance.
  - **Test:** per-feature `src/test/*` + `supabase/tests/*` as each plan defines.
- **Invariant — permission enforcement stays server-side:** deferring UI does not defer RLS/Edge; UI guards are never the enforcement boundary.
  - **Test:** RLS pgTAP negative tests in PUP-27/28/29 plans.
- **Invariant — no raw private data anywhere:** unchanged; deferred screenshots avoid the runtime-profile leak already noted in the UX-audit plan.

---

## Implementation Plan

### Phase 0 - Confirm split and freeze fidelity plans
**Checklist:**
- [ ] User confirms the NOW/DEFER split in the Resequencing Map.
- [ ] Set `Status: Paused (redesign pending)` + pointer to this plan on `2026-06-13-design-fidelity-recovery.md` and `2026-06-13-design-fidelity-ux-audit.md`.
- [ ] Update `docs/plans/README.md` current-plans table to reflect the freeze and this plan.
**Acceptance:** No active plan still targets the v1 atlas as an acceptance gate.

### Phase 1 - Stand up the NOW lane
**Checklist:**
- [ ] Create/continue per-feature plans for PUP-26 (reminders logic) using the standard template, trust layers only.
- [ ] Then PUP-27/28 sharing logic, then PUP-29/30 share-projection logic.
- [ ] PUP-31 route-namespace reconciliation + nav doc update; PUP-32 entitlement no-op interface.
- [ ] Each per-feature plan marks its UI/flow sections `Deferred: pending redesign`.
**Acceptance:** Trust core of P5–P8 is shippable independent of the new design.

### Phase 2 - Redesign-prep (parallel)
**Checklist:**
- [ ] Run the design-system boundary audit; file fixes for any raw-style leaks in `src/features/*`.
- [ ] Produce the primitive stability inventory.
**Acceptance:** Feature layer consumes only `src/design`; redesign deltas are concentrated in tokens + primitives.

### Phase 3 - Redesign intake (when new design lands)
**Checklist:**
- [ ] New atlas/tokens trigger a normal `design-fidelity-pipeline` pass.
- [ ] Unfreeze/replace the fidelity plans against the new atlas.
- [ ] Execute the DEFER lane (screen verstka + flow/button logic) on top of the already-shipped trust core.
- [ ] Run P9 visual/a11y/E2E gates against the new design.
**Acceptance:** Screens are built once, against the final design, over verified logic.

---

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Deferred screens leave logic unexercised/untested | Build thin structural screens (PREP #3) + keep logic-level tests in the NOW per-feature plans |
| Redesign also changes data needs, invalidating "redesign-proof" contracts | Keep NOW contracts close to PRD section 6.10 / existing baselines; treat genuinely new data shapes as their own contract change, not as deferred UI |
| Freeze loses the H1–H7 UX-audit findings | Findings stay recorded in the frozen plan; re-triage against the new atlas instead of discarding |
| Route-namespace decision made now conflicts with new design's navigation | Decide the namespace as a route-tree/architecture decision with redirects; new design hangs screens on it without renaming the tree |
| "Defer" misread as "delete current screens" | Non-Goals state current screens remain as working scaffolding until replaced |

---

## Changelog

- 2026-06-17: Initial resequencing plan created after user confirmed the redesign changes components/patterns and screen/button logic. NOW/DEFER split defined across PUP-26..PUP-32; fidelity plans slated for freeze; design-system boundary audit added as prep.
