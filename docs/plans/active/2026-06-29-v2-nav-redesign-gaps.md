# V2 Nav Redesign — Coverage & Gap Analysis

Date: 2026-06-29
Status: **Stage-0 lock started — native UI implementation still gated per screen.** A repo-native
lock package now exists under `docs/design/v1/specs/`, but route-specific native coding still requires
using the relevant spec card, adding anatomy tests, and recording native-vs-atlas comparison before Done.
Derived from board comparison + DESIGN.md.
Owner: Product owner
Relates to: `DESIGN.md` (§3 Collaboration, §4 Records & Settings, §2 Daily Core), `docs/plans/active/2026-06-25-diary-plan-log-redesign.md`, `docs/plans/active/2026-06-27-diary-pet-nav-design-brief.md`, design-fidelity pipeline (`docs/agents/design-fidelity-pipeline.md`).

## 0. Purpose

Map which screens are **already redesigned** under the new bottom-nav model vs which still
carry the old design / are missing, so the remaining redesign work can be sequenced into the
design-fidelity pipeline (lock artboards → primitives → anatomy tests → atlas compare).

## 1. Sources & method

- **Source / full design + references** — Miro board `uXjVL0aEXPU=` ("PupApp"): raw V2 mockups
  (old nav Today/Health/More), competitor references (Zigzag, Budi, etc.), and a Russian design
  brief note. Read visually via browser; small text is approximate.
- **Updated design (freeze)** — Miro board `uXjVHA5hn48=` ("PuppyPlan V2 — Design Freeze Canvas"):
  a single imported-HTML embed from Claude Design. Read by **decompiling the embed bundle**
  (gzip JS modules) → authoritative for copy and for the section/artboard markers below.
- **Canon** — repo `DESIGN.md` (3508 lines), which the freeze references by section number.

**Confidence:** freeze coverage is derived from the embed's own authored markers
(`// PuppyPlan …`, numbered `// N.N …`, `§x.y` refs) + extracted `title`/`subtitle` strings —
high confidence for *what exists*. Items marked 🟡 need a visual confirm of completeness.

### Freeze authored scope (from embed source comments)
- `// PuppyPlan - Batch 2 Diary / Create surfaces.`
- `// PuppyPlan Batch 2 — Pet tab`
- `// PuppyPlan — Reminders, More tab, Paywall (DESIGN.md §4.2, 4.4)`
- `// PuppyPlan — Sharing screens (DESIGN.md §3.1 Family, §3.2 Sitter, §3.3 Trainer, §3.3.6 Revoked)`
- `// PuppyPlan — primitive components` + `// PuppyPlan — icon library`
- Numbered artboard markers present: **6.1, 6.2, 6.3** (Family), **8.1, 8.2, 8.3** (Trainer),
  **10.1** (Revoked/Expired), **12.4** (Reminder push, iOS lock-screen), **14.5** (Delete confirm, 2 states).
- Explicit **out-of-batch** notes:
  - `// No standalone health charts or milestone surfaces in this active batch.`
  - `// Profile and lightweight health context are folded into Pet. No standalone [Health tab].`
  - `// Legacy FAB calls remain in old screens, but the [new TabBar+Add replaces them].`
- Two theme variants authored: **A · Dusk**, **B · Minimal** (pick one as canon).
- Component contracts authored: **TabBar + Add, StatusPill, ListRow, TrackerTile, TimePicker**;
  spec notes: **Dynamic Type Risk, Form states, Feedback + motion, Routine lifecycle**.

## 2. New navigation model

Bottom nav changed **Today / Health / More** → **Diary · Pet · More** + a raised central
**Add → Quick Log**. Implications:
- "Today" becomes **Diary**; standalone **Timeline** folds into Diary history.
- "Health" tab is removed; profile + lightweight health **fold into Pet**.
- The corner **Quick Log FAB** is replaced by the central Add button (legacy FAB still on un-migrated screens).

## 3. Legend

- ✅ updated & present in freeze (new nav)
- 🟡 partially in freeze — needs finishing / visual confirm
- ❌ old mockup exists (board `uXjVL0aEXPU=`) but **not yet re-skinned** to new design/nav
- ➕ **net-new** — required by the new model, absent on both boards
- 🚫 explicitly **deferred / out-of-batch** by the freeze itself
- ❓ **open** — scope undecided pending a source check (named inline)

## 4. Coverage matrix

### Diary (was Today) — DESIGN.md §2.2
- [x] ✅ Layout & anatomy (§2.2.1)
- [x] ✅ Day 1 / first value + empty ("Your Diary starts empty…") (§2.2.2)
- [x] ✅ Day 2 morning (§2.2.3)
- [x] ✅ Household attribution ("Caregiver A logged…/Owner A…") (§2.2.6 / §3.1.8)
- [ ] 🟡 Accident recovery (§2.2.4) — confirm in freeze
- [ ] 🟡 After-feeding pattern (§2.2.5) — confirm
- [ ] 🟡 Missed reminder on Diary (§2.2.7) — marker present, confirm screen
- [ ] 🟡 Day 7 weekly rhythm / summary (§2.2.8) — confirm
- [ ] 🟡 Loading / empty / offline / pending states (§2.2.9) — primitives exist; confirm all four

### Quick Log (central Add) — DESIGN.md §2.3
- [x] ✅ Trigger & sheet anatomy (§2.3.1) — tiles Walk/Feeding/Nap/Play/Sleep/Potty
- [x] ✅ Potty / Feeding / Sleep editors (§2.3.3–2.3.5) — Amount, Note, TimePicker, Add to schedule
- [x] ✅ Zoomies editor (§2.3.6) — details screen supports typed Zoomies intensity draft.
      Training quick tracker/editor is intentionally deferred by the accepted 2026-06-23 canonical
      tracker taxonomy; adding it now would require a separate ADR-0007 schema/contract delta.
- [x] ✅ Optional details — Note (§2.3.7)
- [x] ✅ Snackbar / Undo (§2.3.8) — native route anatomy implemented: after-tap success
      snackbar, polite live region, Undo/Add details actions, and `saveSuccess` feedback contract.
      Stage 4 SE native screenshot comparison PASS recorded 2026-07-02 on the production route.
- [x] ✅ Pending / failed / retry (§2.3.9) — failed-save inline row anatomy implemented
      with retry/discard; snackbar replacement uses error feedback; pending mutation events now
      render inline before cached rows refresh. Stage 4 SE native screenshot comparison PASS
      recorded 2026-07-02 for synthetic pending+failed route anatomy.
- [x] ✅ Duplicate warning (§2.3.10) — native route anatomy implemented: warning tint,
      warning glyph, localized save-anyway/cancel actions, and no mutation before explicit confirm.
      Stage 4 SE native screenshot comparison PASS recorded 2026-07-02 on the production route.
- [x] ✅ **Tracker grid "Edit Trackers"** config (§2.3.2 / §4.4.3) — implemented as
      `/settings/quick-trackers`, reachable from Quick Log sheet and More, with implicit-save
      toggle/reorder rows and owner-only guardrails. Stage 4 SE native screenshot comparison PASS
      recorded 2026-07-02.

### Timeline / history — DESIGN.md §2.4
- [x] ✅ **Decision: fold history into Diary** (no standalone Events tab). Filters (per-tracker)
      and a date-range control live *inside* Diary; old standalone Events screen is dropped.
- [ ] 🟡 Item anatomy / edit / delete / undo within Diary history (§2.4.3–2.4.4)

### Pet (new tab) — DESIGN.md §4.1 (folded) + §4.4.2
- [x] ✅ Edit pet profile — Name/Breed/Sex/Current weight/Age (§4.4.2)
- [x] ✅ Lightweight Health in Pet — Vaccinations, Vet visits ("No visit recorded yet"), Add record affordance
- [x] ✅ Template suggestion ("Template timing · dose not verified") (§4.1.5)
- [x] ➕ **Pet tab landing/hub** — native anatomy slice implemented: profile hub + health below +
      actionable Quick Trackers entry. Stage 4 SE native screenshot comparison PASS recorded
      2026-07-02 for the production landing/empty-health state.
- [x] 🚫 **Multi-pet switcher** — out of scope. `multi-pet/foster` is Deferred in
      `puppyplan-prd-v2.md` (§1 "Нет полноценного multi-pet/foster workflow") and
      `docs/architecture/01-principles-and-scope.md` (Deferred list). MVP = single current pet.
- [x] 🚫 Standalone Health tab anatomy (§4.1.1) — out-of-batch (folded into Pet)
- [x] 🚫 Health charts / milestone surfaces — explicitly out-of-batch
- [ ] 🟡 Add Record full flow (§4.1.3) — native route now opens from Pet, shows record-type
      chooser and empty form anatomy. Stage 4 SE native screenshot comparison PASS recorded
      2026-07-02 for chooser + empty form. Save/persistence/loading/error/offline states remain open.
- [ ] 🟡 Edit record / delete (undo) (§4.1.4) — native detail/delete confirm/undo-toast
      anatomy implemented. Stage 4 SE native screenshot comparison PASS recorded 2026-07-02.
      Durable edit/delete, timed 5-second undo restore, and persistence remain open.
- [x] ✅ Status transitions visualisation Template→Confirmed→Done (§4.1.6) — native detail
      status strip now renders four visible icon+label steps with exactly one active filled state and
      full sequence accessibility label. Stage 4 SE native screenshot comparison PASS recorded 2026-07-02.
- [x] ✅ Vet visit prep card (§4.1.7) — native reference-card anatomy implemented inside Pet
      Health: visit subtitle, four checklist rows, Add item affordance, and non-instruction disclaimer.
      Stage 4 SE native screenshot comparison PASS recorded 2026-07-02. Real checklist editing remains open.
- [x] 🚫 Medication card + "Request a Refill" — out of this wave. `docs/design/v1/specs/05-pet-health.md`
      explicitly defers medication/refill, and §5.3 limits Pet/Health depth to lightweight + minimal CRUD.

### Sharing (lives under More) — DESIGN.md §3.1–3.3 — **fully in freeze** ✅
- [x] ✅ Family list / owner view (§3.1.1 → 6.1)
- [x] ✅ Family invite — role pick / scope confirm (§3.1.2 → 6.2)
- [x] ✅ Invite sent / pending (§3.1.3 → 6.3)
- [x] ✅ Trainer invite — scope selector / ScopeStripe (§3.3.2 → 8.1)
- [x] ✅ Trainer preview — included / excluded (§3.3.3 → 8.2)
- [x] ✅ Trainer accepted read-only view (§3.3.5 → 8.3)
- [x] ✅ Revoked / expired share (§3.3.6 → 10.1)
- [x] ✅ Trusted Sitter mode owner setup shell (§3.2) — More Trainer/Sitter now opens
      `/settings/sitter-mode`, with caregiver row, time window, checklist, visibility preview, and
      enable CTA. Live enable mutation, active status, completion push, auto-expire, exit confirm,
      remain open; Stage 4 native SE screenshot comparison passed 2026-07-02.
- [x] ✅ Accept-invite flow, caregiver-side (§3.1.4) — `/invite/[token]` native shell
      implemented: inviter/puppy context, caregiver role, included/excluded preview, disclosure,
      Accept/Decline actions, and token-safe rendering. Stage 4 native SE screenshot comparison
      passed 2026-07-02; live token lookup/accept/decline remain open.
- [x] ✅ Manage household (§3.1.6) — `/settings/household` native shell implemented:
      More Family row opens owner household preview with members, pending invite, non-color-only
      status badges, overflow affordances, privacy-safe invite label, and Invite CTA. Live member
      query, role changes, removal, resend/revoke, and confirm sheets remain open; Stage 4 native SE
      screenshot comparison passed 2026-07-02.
- [x] ➕ **Shareable Puppy Cards** (§3.4) — **decision: IN scope this wave, MINIMAL only**: a static /
      signed-link card + preview + expiry (PRD-allowed). Native shell implemented at
      `/sharing/puppy-card`: More entry, builder fields, health disclosure, 3:4 preview, share CTA,
      public-link disclosure, and active-card list. Rich builder / multi-template editor → roadmap,
      not this wave. Live signed-link creation, expiry editing, and revoke actions remain open; Stage 4
      native SE screenshot comparison passed 2026-07-02.

### Reminders / Routines — DESIGN.md §4.2
- [x] ✅ Reminders/Routines hub + lifecycle (Mark done / Back-date / Skip / Pause / Delete; "Diary entries stay")
- [x] ✅ Reminder push — iOS lock-screen (§4.2.4 → 12.4)
- [x] ✅ Reminder card on Diary (§4.2.5)
- [x] ✅ Quiet hours picker (§4.2.3) — native reminder-edit anatomy slice implemented:
      quiet-hours card, example range, per-puppy toggle, and calm helper copy. Real range editing,
      validation, and persistence remain open; Stage 4 native SE screenshot comparison passed
      2026-07-02.
- [x] ✅ Sitter checklist reminders (§4.2.6) — native structural anatomy implemented
      inside `/reminders/edit`: trusted-sitter source label, person icon slot, left accent rail,
      1/3 progress bar, and localized action set. Stage 4 native SE screenshot comparison passed
      2026-07-02; real sitter checklist data, completion push, scheduling, and pending-sync state
      remain open.
- [x] ✅ Create / edit reminder form (§4.2.2) — native route anatomy implemented at
      `/reminders/edit`: title/name/category/time/repeat/timezone/toggles/helper copy and disabled
      Save state. Stage 4 native SE screenshot comparison passed 2026-07-02; real reminder
      save/scheduling/loading/error/offline states remain open.
- [x] ✅ Push permission denied — calm in-app state (§4.2.7) — native non-modal permission card
      implemented inside `/reminders/edit`; reminder creation remains visually available and not
      blocked. Stage 4 native SE screenshot comparison passed 2026-07-02; OS settings deeplink
      and real permission state wiring remain open.

### Guidance cards — DESIGN.md §4.3
- [x] 🚫 Guidance card anatomy + states (Read/Practiced/Skip) + topics (§4.3) — deferred for this
      V2 nav-redesign wave by `2026-06-27-diary-pet-nav-design-brief.md` and
      `docs/design/v1/specs/08-deferred-reference.md`. Active Diary now emits no `guidanceCard` and
      ignores legacy guidance card payloads; only the lightweight contextual tip slot remains allowed.

### More tab — DESIGN.md §4.4
- [x] ✅ More tab anatomy (Family / Trainer-sitter / Data and account / Settings / About v1.0.0 / Privacy / Terms)
- [x] ✅ Privacy & account incl. Delete confirm, 2 states (§4.4.5 → 14.5)
- [x] ✅ Subscription / paywall shell — "Choose a plan / Yearly / Monthly / Best value" (§4.4.7)
- [x] ✅ Quick Trackers settings (§4.4.3) — implemented as `/settings/quick-trackers`; see §14.
- [x] ✅ Notification preferences (§4.4.4) — `/settings/notifications` native anatomy slice
      implemented: local reminders, push reminders/sitter completion, quiet hours, timezone rows,
      and More hub navigation. Stage 4 SE native screenshot comparison PASS recorded 2026-07-02.
      Persistence / OS permission handoff remains open.
- [x] ✅ App support / help (§4.4.6) — `/settings/help` native anatomy slice implemented:
      topic shortcuts, diagnostics rows, privacy-safe support note, and More hub navigation.
      Stage 4 SE native screenshot comparison PASS recorded 2026-07-02. Real ticket/email handoff
      and diagnostics upload remain open.
- [x] ✅ Full PuppyPlan Plus screen (features list + Restore purchases) — `/paywall` native shell
      implemented: feature list, annual/monthly/lifetime plan rows, primary CTA, Restore purchases,
      and soft-lock note. Stage 4 SE native screenshot comparison PASS recorded 2026-07-02 after the
      compact modal header fix. Live IAP/restore/purchase states remain open.

### Onboarding / intake — DESIGN.md §2.1
- [ ] 🟡 First-run variants — present in freeze (partial)
- [x] ✅ Welcome (§2.1.1) — native initial `/onboarding` anatomy implemented: decorative warm
      illustration frame, locked H1/subtitle, primary setup CTA, and secondary sign-in action.
      Stage 4 native SE screenshot comparison passed 2026-07-02.
- [ ] 🟡 Puppy Setup (§2.1.2) — native profile-step chrome/stepper slice implemented: visible
      back/step chrome, age section label, locked age-stepper anatomy, birth-date date-zone wrapper,
      and disabled-until-name CTA behavior. Stage 4 native SE screenshot comparison passed
      2026-07-02; real platform DatePicker replacement remains open.
- [x] ✅ Age Hint (§2.1.3) — native profile-step inline hint implemented: info icon, status info tint,
      localized age-range copy, and accessible "Hint. …" label before tracker selection. Stage 4
      native SE screenshot comparison passed 2026-07-02.
- [ ] 🟡 Quick Tracker Selection (§2.1.4) — native tracker-step chrome/anatomy slice implemented:
      visible Step 3 chrome, helper copy, selected checkmark, selected/unselected a11y labels,
      zero-selected Skip Selection CTA, and skip-to-default save normalization. Stage 4 native SE
      screenshot comparison passed 2026-07-02.
- [ ] 🟡 Plan Reveal (§2.1.5) — native value-moment anatomy slice implemented: puppy summary row,
      Honey/accent HeroCard 96pt, three separate DailyCard starter actions, and bottom first-log CTA.
      Stage 4 native SE screenshot comparison passed 2026-07-02.
- [ ] 🟡 First Log (§2.1.6) — native first-value completion anatomy implemented: Diary chrome,
      pending/local-only state, no pre-value account pressure, and celebration snackbar. Real Quick
      Log sheet selection/persistence remains covered by Quick Log slices; Stage 4 native SE
      comparison passed for content/chrome and transient celebration snackbar visual capture 2026-07-02.
- [x] ✅ Account/Notifications prompts (§2.1.7) — post-first-value V2 native preview slices
      implemented as skippable SheetSurface prompts with account and quiet-reminder actions.
      Stage 4 native SE screenshot comparison passed 2026-07-02; runtime scheduler / OS permission
      handoff remain deferred.

### Cross-cutting
- [x] ✅ **Apply new TabBar (Diary/Pet/More + Add) to every migrated screen** — the tab shell now
      delegates bottom chrome to `CapsuleTabBar`; legacy Today/Health aliases are hidden with `href:null`;
      V1 FAB tab-layout assertions are retired; no default full-width tab bar or absolute bottom-right
      FAB remains under `app/(tabs)`. See §36.
- [ ] 🟡 **Global screen states** (Loading / Empty / Offline read banner / Pending write / Permission
      denied / Revoked) re-applied per new screen (§4.5) — primitives (StatusPill, Form states) exist;
      coverage per-screen is the work
- [x] ✅ **Theme resolved** → B · Minimal canonical (see §5.2)

## 5. Decisions (resolved 2026-06-29)
1. **Events/Timeline** → ✅ **fold history into Diary** (filters + date-range inside Diary; no standalone Events).
2. **Theme** → ✅ **B · Minimal = canonical light theme**; Dusk's warm tints reused only for accent
   moments (celebration / empty-state / onboarding hero); Dusk palette → basis for future **dark mode** (v2).
   Rationale: contrast + Dynamic Type + outdoor legibility + "whitespace = calm" + solo-dev maintainability.
6. **Primary CTA colour** → ✅ **terracotta `#c96442`** (as the freeze already uses). **Applied 2026-06-30:
   DESIGN.md §2.3/2.4** — primary moved from the retired Calm Teal ramp to a terracotta ramp; Ember Coral stays
   celebration-only. Needs a proper ramp + `text/on-primary` contrast re-check (white on `#c96442` ≈ 4.0:1 —
   may need a slightly darker 600 stop to clear 4.5:1).
3. **Pet/Health depth** → ✅ **lightweight + minimal CRUD** (profile + list + add/edit + status Template→Confirmed→Done). Defer charts/milestones/medication+refill.
4. **Onboarding** → ✅ **re-skin now** (activation funnel + trial/paywall placement depends on it).
5. **Shareable Puppy Cards (§3.4)** → ✅ **in scope this wave — minimal signed-link/static card only**
   (preview + expiry). Rich builder deferred to roadmap to keep the wave shippable for a solo dev.

## 6. Monetization model — time-gated soft-lock (decided 2026-06-29)

Decided with founder given the **solo-dev constraint**: avoid deep per-feature freemium (too much to
build/maintain). A 3-agent panel (competitor / audience-JTBD / strategy) informed the trade-offs; the
chosen model is a **time-gated trial → soft-lock**, collapsing monetization to a single entitlement check.

> **Scope boundary — model decided, enforcement deferred.** Per `puppyplan-prd-v2.md` §1
> ("Нет обязательного live IAP/paywall до подтверждения beta retention") and the
> `01-principles-and-scope.md` Deferred list ("live IAP/subscription provider"), **live paid
> enforcement does NOT ship in this nav-redesign wave.** This wave ships only: the paywall + soft-lock
> *design surfaces* and a **feature-flagged-off** entitlement shell. Turning enforcement on (real IAP,
> live write-gate) is a separate future plan gated behind confirmed beta retention.

### 6.1 Model
- **Days 0–30: full access, no card, paywall skippable.** The whole app works (the single MVP pet,
  all sharing, full history, all reminders) — free for the first 30 days.
- **Day 30+ without active subscription → soft-lock:** subscription gates **writes** only.
  **Read-only viewing + export of own data always stays available. Trainer share link stays live
  regardless** of the owner's subscription (no-account `WebFrame` projection — keeping it on is less
  code than gating it, and preserves the referral loop).
- **Entitlement = one check:** `active subscription OR within 30-day trial` → gates writes only.
  **Trial clock anchor:** starts at the first durable puppy profile's `household.created_at` (NOT
  auth-user creation, NOT first app open); tied to the Supabase account so reinstall does not reset it.
  *(Anchor to confirm at implementation.)*

**Write taxonomy (precise — a single `gates writes` boolean is too blunt and could brick safety/privacy actions):**
- **Gated at soft-lock:** create new logs/routines/reminders, edit existing entries, create new
  shares/invites.
- **ALWAYS allowed (even expired trial, no sub):** export own data, delete own data, delete account,
  privacy/account settings, revoke an existing share, restore / manage subscription, notification
  opt-out, sign-out, read-only viewing. *(Required by the "silent failures = lost data" rule and the
  privacy guardrails — these must never sit behind a paywall.)*

### 6.2 Why this model (and what it removes)
- **Simplicity (the point):** one boolean, not a feature matrix. **Removes** per-feature gating,
  2nd-pet gate, trainer-depth gate, history-window gate, reminders cap, seat counting,
  archive-not-delete. Paying = full app; trial = full app; expired = read-only + export. (This is why
  the per-feature questions — reminders cap, history window, 2nd-pet, trainer-depth — are now moot.)
- **Conversion (read with care):** RevenueCat's D35 benchmark (hard paywall 10.7% vs freemium 2.1%)
  supports moving paywall timing *earlier/stronger* — but our model (30-day free, no card upfront,
  skippable first paywall) is an **app-managed free-access period, not a hard paywall**, so that ~5×
  figure does **not** transfer directly. Treat it as directional evidence to A/B test, not a forecast.
- **Two landmines defused vs a pure hard wall:** (a) never brick a user's own data → no "data hostage"
  1-star reviews, satisfies the "silent failures = lost data" rule; (b) keep the trainer link live →
  preserve the only affordable growth channel for a solo dev.

### 6.3 Plans & trial
- **Annual $39.99/yr (default)** + **Monthly $8.99 (anchor)** + **Lifetime / "puppyhood pass" ~$79–99
  (one-time)**. Annual pre-selected, "$3.33/mo" framing; lifetime captures cash from high-intent early
  adopters (fits a time-boxed product).
- **30-day trial**, no card upfront, first paywall **skippable** (aligns with PRD "no first-screen
  hard paywall" + "paywall after value moment"). Long trial converts better than short.
- Optional later: **graduation path** (transition to a lightweight adult-dog record) to extend LTV
  past the ~90-day puppy window.

### 6.4 Design surfaces this implies (➕ — much smaller than feature-freemium)
- [x] ➕ **Paywall screen** (fills the flagged `NoOpEntitlementProvider` shell): 3 plan cards
      (annual preselected + monthly + lifetime), value bullets, trust row + **Restore Purchases**,
      real-reviews slot (ship empty — no fake social proof). Two entries: skippable early version +
      day-30 gate version.
- [x] ➕ **Trial status indicator** — subtle "X days left" (gentle, non-nagging).
- [x] ➕ **Soft-lock state** — read-only banner ("Subscribe to add new entries"), export still
      reachable; applied app-wide via the single entitlement check.
- [ ] (no new screen) **Trainer link** stays live regardless of subscription.

### 6.5 Reconcile with existing docs
- **PRD §8** used to specify feature-tiered freemium (1 puppy / 3 reminders / 7-day timeline /
  premium €49.99–54.99). This model **replaces that** with time-gated single-entitlement; applied 2026-06-30.
- **DESIGN §4.4.7 "Free vs Premium" block** used to list the old feature-freemium matrix and multi-pet
  (which is Deferred). Rewritten 2026-06-30 to: trial = full app, expired = read-only + export, sub = full app
  (no per-feature tiers).
- **`docs/architecture/14-feature-flags-and-entitlements.md`**: entitlement becomes a single
  `active sub OR within trial` check gating writes (household-scoped `subscription_entitlement` still
  fits); paywall shell stays feature-flagged off until beta retention is confirmed.

## 7. Next steps (design-fidelity pipeline)
1. [x] Update canon docs: **DESIGN.md §2.3/2.4** (terracotta primary ramp + contrast re-check);
   **PRD §8** (monetization *policy* — note: DESIGN §8 is *Haptics*, not monetization); **DESIGN
   §4.4.7** incl. its former **"Free vs Premium" block** — rewritten to the soft-lock model; and
   `14-feature-flags-and-entitlements.md` → §6 time-gated soft-lock model.
2. [x] Create initial Stage-0 lock package: `docs/design/v1/specs/v2-redesign-lock-package.md` plus
   section spec cards for the 88-board Codex Design handoff. Before native code, split any section card
   into route-specific cards when the implementation needs tighter assertions.
3. [ ] For each ❌/➕/🟡 item kept in scope during native implementation: confirm route-specific artboard
   IDs + spec card, per `docs/agents/design-fidelity-pipeline.md`, before code.
4. [ ] Sequence by tab: **Diary states → Quick Log states → Pet/Health → Reminders forms → Onboarding
   (+ skippable paywall) → More sub-screens → Sharing → paywall + soft-lock states → Shareable Cards**,
   applying the new TabBar as each screen migrates.
5. [ ] Keep DESIGN.md the canon; update §refs if screens are added/merged.

## 8. Codex Design handoff evidence

**2026-06-30 project:** Open/Codex Design project `2f60083d-2d0f-4fe1-8e71-c1c60951fb8c`
(`Web Prototype`), entry `index.html`.

Preview URL:
`http://127.0.0.1:49290/api/projects/2f60083d-2d0f-4fe1-8e71-c1c60951fb8c/raw/index.html`

Legacy Claude/Design canvas alias:
`http://127.0.0.1:49290/api/projects/2f60083d-2d0f-4fe1-8e71-c1c60951fb8c/raw/mqxri78o-Canvas.dc.html`

Delivered canvas contents:
- 9 sections.
- 88 boards.
- 176 native previews: 88 iOS + 88 Android.
- Top coverage map listing every board before the large iOS/Android previews.
- `handoff-manifest.json` in the design project with section counts and legacy-surface dispositions.
- Synthetic placeholder hygiene: visible project placeholders use generic caregiver labels and
  `example.test` email addresses.

Verification run 2026-06-30:
- `node --check .../js/puppyplan.js` — PASS.
- `curl -I .../raw/index.html` — `HTTP/1.1 200 OK`.
- Node/VM inventory check — PASS: `sections=9`, `boards=88`, `nativePreviews=176`,
  manifest boards/sections match, coverage-map renderer/CSS present.
- `jsdom` render check — PASS: `.screen-pair=88`, `.board-map-card=88`,
  `.screen-preview=176`, `ios=88`, `android=88`.
- Re-check after viewport concern — PASS: Open Design project metadata still points to
  `index.html`; static renderer inventory has `uniqueScreenIds=89`, `renderers=31`,
  `extraScreens=58`, `missing=[]`; jsdom boot render again returned `boards=88`,
  `previews=176`, `emptyPreviews=0`.
- Forbidden private-placeholder scan over the design project — no matches after sanitization.
- Repackaged for Claude Design / Miro visibility after the user could only see a small subset:
  primary `index.html` is now **pre-rendered static HTML** containing all board blocks and previews
  without requiring JavaScript; dynamic source is preserved as `index.dynamic.html`; duplicate
  portable entry `miro-complete.html` was added.
- Static DOM verification after repack — PASS: `.screen-pair=88`, `.board-map-card=88`,
  `.screen-preview=176`, `ios=88`, `android=88`, content served at the same preview URL with
  `Content-Length: 954639`.
- Direct Open Design project re-check after the second viewport concern — PASS:
  `handoff-manifest.json` reports `status=static-complete-canvas`, `sections=9`, `boards=88`,
  `nativePreviews=176`; both `index.html` and `miro-complete.html` contain `boardMap=88`,
  `screenPairs=88`, `ios=88`, `android=88`, and the visible static proof block.
- Full-board repack after the user still could not see all screens in the design surface — PASS:
  `index.html` and `miro-complete.html` now include `codex-full-board-layout-v3`, full-size
  iOS/Android preview columns (`390px 412px`), `screenPairs=88`, `deviceRows=88`,
  `screen-preview=176`, and the title `PuppyPlan V2 Complete Full-Board Handoff`.
  `handoff-manifest.json` now reports `status=static-complete-full-board-canvas` and
  `layout=full-size iOS and Android previews, two board pairs per row on wide canvases`.
- Fresh Open Design preview fetch after full-board repack — PASS:
  `curl -I .../raw/index.html` returned `HTTP/1.1 200 OK`, `Content-Length: 956667`;
  streamed content verification returned `title=true`, `fullBoard=1`, `screenPairs=88`,
  `deviceRows=88`, `previews=176`, `hasFullSize=true`, `status=true`.

Fresh browser verification 2026-06-30:
- Opened preview URL with Playwright CLI — page title `PuppyPlan V2 complete Codex Design handoff`.
- Snapshot confirmed visible top inventory: `88 boards`, `176 previews`, `9 sections`, and all 88
  board-map links before the large previews.
- Full-page screenshot captured at
  `output/playwright/puppyplan-codex-design-full-canvas.png` (`1280 x 57316`), confirming this is a
  long scrollable handoff canvas. Seeing only the first rows at a zoomed viewport is not evidence of
  missing screens.
- Browser console had one non-rendering issue only: `favicon.ico` 404.
- Legacy alias repair after the user still saw the old partial canvas — PASS: backed up the redirect-only
  `mqxri78o-Canvas.dc.html`, replaced it with the same complete static canvas as `index.html`, and
  refreshed `full-canvas-coverage.json`.
- Fresh DOM verification after alias repair — PASS: both `index.html` and `mqxri78o-Canvas.dc.html`
  contain `boardMap=88`, `screenPair=88`, `preview=176`, `groups=10`, and no meta/JS redirect.
- Fresh browser verification after alias repair — PASS: headless Chrome opened
  `.../raw/mqxri78o-Canvas.dc.html`; page title `PuppyPlan V2 complete full-board Codex Design handoff`;
  DOM counts `boardMap=88`, `screenPair=88`, `preview=176`, `groups=10`. Screenshot:
  `output/playwright/puppyplan-codex-design-legacy-alias-full.png`.
- Fresh DOM re-check after continuing native work — PASS: both `.../raw/index.html` and
  `.../raw/mqxri78o-Canvas.dc.html` returned `HTTP 200` with title
  `PuppyPlan V2 complete full-board Codex Design handoff`, `boardMap=88`, `screenPairs=88`,
  `deviceRows=88`, `previews=176`, `ios=88`, `android=88`.
- Fresh Codex/Open Design project re-check after the "not all screens are visible" concern — PASS:
  Open Design project metadata still points to entry `index.html`; `index.html`,
  `00-puppyplan-v2-full-canvas.html`, `complete-atlas.html`, `miro-complete.html`,
  `codex-design-complete.html`, and legacy `mqxri78o-Canvas.dc.html` all include the complete
  static handoff. Direct preview fetch returned `HTTP 200`, `bytes=1865511`,
  `totalPreviewNodes=352` because the contact sheet and full-size boards both render the screens,
  `uniqueScreenKeys=89` including the iOS/Android-specific native picker contract keys,
  `uniqueIosScreens=88`, `uniqueAndroidScreens=88`, and `requiredMissing=[]` across the required
  onboarding, Diary, Quick Log, Reminders, Pet, More, Support/Help, sharing, puppy-card,
  soft-lock, and deferred-reference surfaces.

## 9. Native route-label/icon implementation evidence

**2026-06-30 slice:** V2 primary route shell and first-log chrome migration from old
`Today / Health / More` tab contract to `Diary / Pet / More` + persistent Quick Log action.

TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.

Spec lock for this slice:
- Primary tab ids and labels are exactly `diary`, `pet`, `more`.
- `diary/index` uses the canonical book icon, `pet/index` uses paw, `more/index` uses more.
- Legacy `/today` and `/health` route files remain only as redirect aliases.
- Onboarding first-log completion lands in Diary chrome, with the Diary tab selected.
- Shell/i18n/scaffold guardrails enforce the V2 tab keys and no stale Today/Health primary-tab contract.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/tab-layout.render.test.tsx src/test/onboarding-flow.render.test.tsx`
  failed as expected:
  - `diary/index` rendered `today` icon instead of `book`.
  - first-log Diary tab had `accessibilityState.selected=false`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/tab-layout.render.test.tsx src/test/onboarding-flow.render.test.tsx`
  — PASS: 2 suites, 15 tests.
- Expanded route/i18n/render suite — PASS: 13 suites, 88 tests.
- Primitive/dev-gallery/tab focused suite — PASS: 3 suites, 52 tests.
- `node --test scripts/design/lib/strings.test.mjs` — PASS: 6 tests.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
  scaffold guardrails, tokens, privacy scan, text hygiene.
- `rg "tabs\\.(today|health)|tab\\.id === 'today'|tab\\.id === 'health'|name=\\\"today\\\"|name=\\\"heart\\\"" app src`
  — no matches after the V2 cleanup.
- `npm run check` — PASS: lint, typecheck, 63 Jest suites / 448 tests, node tests,
  scaffold checks, tokens, privacy scan, and text hygiene.

Design-fidelity note:
- This slice satisfies Stage 3 structural assertions for the route shell / first-log chrome contract.
- It does **not** complete the per-screen Stage 4 native screenshot comparison for Diary, Pet,
  Quick Log, Onboarding, More, Sharing, Paywall, or Shareable Cards. Those remain plan-owned work
  under §7.3–§7.4 and must be handled per screen/state before Done.

## 10. Diary route Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/diary` route.

- Created route-specific spec card: `docs/design/v1/specs/03-diary-route.md`.
- Source section: `docs/design/v1/specs/03-diary-core-states.md`.
- Locked Open Design board ids: `diary-populated`, `diary-day-1`, `diary-day-2`,
  `diary-weekly-rhythm`, `diary-past`, `diary-cold`, `diary-empty`, `diary-all-done`,
  `diary-states`, `week-selected`, `diary-accident-recovery`, `diary-after-feeding`,
  `diary-missed-reminder`, `diary-item-edit`.
- Recorded allowed deviation: implementation may temporarily reuse the existing `TodayScreen`
  module name internally, but public route/title/tab/navigation contract are `Diary`; `/today`
  remains a redirect alias only.
- Implemented the first locked Diary anatomy slice: the Diary route now renders a seven-day week
  strip with separate selected-day and today states. The selected day comes from the route plan input
  and the today marker comes from the active care context, so `week-selected` can be represented
  without relying on color alone.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  before implementation because `Diary week` was missing from the rendered anatomy.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx src/test/i18n.test.ts`
    — PASS: 2 suites, 19 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 450 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 449 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 449 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 449 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene.
- Implemented the next Diary history language slice: the embedded history section now uses
  `Diary history` / `Review history` language and the Diary card copy no longer references a
  standalone `Timeline`.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while the screen still rendered `Recent Quick Log` / `Open Timeline`.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx src/test/i18n.test.ts`
    — PASS: 2 suites, 19 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 449 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene.
  - `rg "Open Timeline|Recent Quick Log|Timeline keeps|Abrir Timeline|Открыть Timeline|Timeline хранит|Timeline conserva" src/features/today src/test/today-core.render.test.tsx STRINGS.en.json STRINGS.ru.json STRINGS.es.json`
    — no matches under `src/features/today`; remaining hits are legacy string keys only.
- Implemented the first Diary item-anatomy slice: synced logged facts in embedded Diary history no
  longer show a visible `Saved`/synced status pill; pending and failed persistence states still show
  non-color-only status pills and actions. This aligns with DESIGN §2.4.3 (`Synced` hidden by default,
  non-synced visible).
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx` failed as expected
  while synced rows still rendered `timeline.pills.synced`.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx src/test/today-core.render.test.tsx`
    — PASS: 2 suites, 16 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 449 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene.
- Implemented the next Diary item-anatomy slice: embedded Diary history logged facts now use the
  existing `Card` `mutedTemplate` variant (`tokens.color.surface.sunken`) and expose
  `diary-history-logged-fact` for structural anatomy checks. This keeps logged facts visually quieter
  than raised routine/action cards while reserving warning/error styling for persistence failure pills.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx` failed as expected
  while the logged fact row had no `diary-history-logged-fact` anatomy hook and no asserted sunken
  surface.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx`
    — PASS: 1 suite, 6 tests.
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx src/test/today-core.render.test.tsx`
    — PASS: 2 suites, 16 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
- Implemented the next Diary item-action slice: synced embedded Diary history logged facts now expose
  a 44pt+ overflow/edit affordance (`today.history.item-actions`) when `onEdit` is wired. The button
  uses design primitives (`IconButton` + `AppIcon more`) and calls `createQuickLogEditRequest(event)`,
  so the downstream Quick Log details flow receives `clientEventId`, event type, household/puppy ids,
  selected date, and tracker id without making the synced status pill visible again.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx` failed as expected
  while synced Diary history facts had no accessible `today.history.item-actions` button.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx`
    — PASS: 1 suite, 6 tests.
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx src/test/today-core.render.test.tsx src/test/i18n.test.ts`
    — PASS: 3 suites, 25 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
- Implemented the Diary past-unchecked-reminder language slice: the synthetic reminder state now
  renders as a calm `past unchecked routine` preview instead of visible `missed reminder` language.
  EN/RU/ES strings were updated while keeping the historical key name for compatibility.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while the rendered tree still contained `missed reminder`.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 11 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, and text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 454 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
- Implemented the Diary accident-recovery / after-feeding contextual anatomy slice: normal Diary hero
  eyebrow copy no longer exposes legacy `Today`, and `feeding_pattern` renders as a single soft
  `mutedTemplate` contextual tip (`diary-contextual-tip-card`) instead of a normal raised daily card.
  EN/RU/ES visible copy was adjusted away from Today-route language where the same cards now appear
  inside Diary.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected:
  accident recovery still rendered visible `Today`, and the after-feeding state had no
  `diary-contextual-tip-card`.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 13 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 452 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Implemented the Diary all-done state slice: `screenState="all-done"` now exposes the locked
  `diary-all-done` completion surface through the existing status-card primitive with the existing
  `completed` pill tone. This is a synthetic design-review state only; production routine completion
  logic remains scoped to the later Reminders/Routines implementation.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while `today-state-all-done` was absent.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 14 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 453 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Implemented the Diary empty-with-history state slice: `screenState="empty-history"` now exposes the
  locked `diary-empty` quiet-day surface through the existing status-card primitive, using the calm
  `template` pill tone and EN/RU/ES Diary-language copy. This is a synthetic design-review state only;
  production multi-day history/filtering remains scoped to the later Diary history implementation.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while `today-state-empty-history` was absent and the screen still fell through to the existing
  steady-day hero anatomy.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 15 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
- Implemented the Diary cold-start state slice: `screenState="cold-start"` now exposes the locked
  `diary-cold` setup surface through the existing status-card primitive, using the calm `template`
  pill tone and EN/RU/ES copy that names both Add paths: Quick Log and Schedule. This is a synthetic
  design-review state only; production routine creation remains scoped to the later Reminders/Routines
  implementation.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while `today-state-cold-start` was absent and the screen still fell through to first-day starter
  anatomy.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 16 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, and text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 455 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Implemented the Diary synthetic pending-write state slice: `screenState="pending-write"` now exposes
  the locked grouped-state `diary-states` pending surface without requiring a real queued local row.
  This keeps Stage 3 design review able to render the pending-write state deterministically while the
  production pending banner still comes from actual local Quick Log rows.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while `screenState="pending-write"` fell through to first-day Diary anatomy and
  `today-state-pending-write` was absent.
- GREEN evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 17 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, and text hygiene.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/today-core.render.test.tsx`
    — PASS: 2 suites, 26 tests.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 456 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Implemented the synced Diary item delete-action anatomy slice: synced logged facts now expose a
  localized destructive `Delete entry` action when `onDelete` is wired, in addition to the existing
  44pt+ overflow/edit affordance. The action uses `createQuickLogDeleteRequest(event)` with
  `status: 'synced'`, so the downstream deletion path receives the same household, puppy, event type,
  client event id, and selected date contract as pending/failed rows.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx` failed as expected
  while the synced Diary history row had no `today.history.delete-action` button.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx`
    — PASS: 1 suite, 6 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS after adding `today.history.delete-action` to
    `shellI18nKeys`: navigation contract, shell i18n, i18n budgets, scaffold guardrails, tokens,
    privacy scan, and text hygiene.
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx src/test/i18n.test.ts src/test/navigation-contract.test.ts`
    — PASS: 3 suites, 23 tests.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 456 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Stage 4 remains open: the Diary route still needs per-state native screenshots against the locked
  boards before the Diary route can be marked done.

**UPDATE 2026-07-02 — Diary route re-locked and rebuilt to the Clay reference (parallel Claude
session on this branch).** `docs/design/v2/specs/diary-v2.md` (+ recovered atlas under
`docs/design/v2/reference/`) now supersedes the visual-anatomy lock above (`03-diary-route.md`)
and `today-v2.md`. Implemented and Stage-4-verified on iPhone SE 3 + iPhone 16e (populated state):
DiaryHeader greeting (no screen title), WeekStrip, mauve InfoHero, FactCard rows with the
clay/sage/honey/mauve accent map, swipe-to-delete with a VoiceOver-parity accessibility action
(the earlier always-visible destructive `Delete entry` button was removed as a deviation from the
2026-06-30 delete-action slice above). Remaining Diary deltas are itemized as **Items 7–12** in
`2026-06-30-v2-screen-polish-backlog.md` — do not re-implement Diary from this section's older
board lock, and do not revert the Clay rebuild.

## 11. Quick Log route Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/quick-log` route duplicate-warning anatomy.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked atlas board: `4.4 Duplicate warning · 60-sec window`
  (`docs/design/v1/screenshots/quicklog/4-4.png`, state `duplicate-warning`, 393x852).
- Route: `/quick-log`.
- Allowed deviations: production copy may use the existing localized generic duplicate title until
  actor/time-specific duplicate copy is wired, but the anatomy must still expose a warning icon, warning
  tint, explanatory text, save-anyway action, and cancel action.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.

Spec lock for this slice:
- AC-QL-4.4-1: when a recent same-care event triggers duplicate detection, the sheet renders a
  warning-tinted duplicate-warning card, not a normal raised card and not bright red/error styling.
- AC-QL-4.4-2: the duplicate-warning card includes a decorative warning glyph before the warning copy.
- AC-QL-4.4-3: the duplicate-warning card exposes both localized actions: save anyway and cancel.
- AC-QL-4.4-4: mutation is not queued until the user explicitly confirms save anyway.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx`
  failed as expected before implementation while the route did not expose
  `quick-log-duplicate-warning-card` / warning anatomy.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx`
  — PASS: 1 suite, 7 tests.
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx src/test/design-primitives.render.test.tsx`
  — PASS: 2 suites, 48 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, token drift check, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, 63 Jest suites / 456 tests, node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Project graph advisory refresh:
  `python3 /Users/dmitryselenya/.codex/skills/project-graph-context/scripts/project_graph.py update --repo /Users/dmitryselenya/Projects/puppy_app --base HEAD`
  — PASS: FTS index rebuilt, 93 files updated.

Implementation notes:
- `src/features/quick-log/screens/QuickLogShell.tsx` now renders the duplicate warning as a
  warning-tinted `Card` with a visible warning icon slot and the existing localized confirm/cancel
  actions.
- `src/design/primitives/AppIcon.tsx` now includes `warningTriangle` for warning-state anatomy.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator from the installed PuppyPlan.app
  over Metro. Native evidence: `output/v2-nav-gaps-stage4/quick-log-production-default-stage4.png`
  and `output/v2-nav-gaps-stage4/quick-log-production-duplicate-warning-stage4.png`. The
  production flow opened Diary → Add → Quick Log, tapped a same-tracker Feeding event within the
  duplicate window, and exposed the warning-tinted card, warning glyph, localized `Add anyway` /
  `Cancel` actions, and dimmed route backdrop without queuing the mutation before confirmation.

## 12. Quick Log failed-save row Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/quick-log` failed save inline anatomy.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked atlas board: `4.5 Failed save · retry/discard inline`
  (`docs/design/v1/screenshots/quicklog/4-5.png`, state `failed`, 393x852).
- Route/component: `/quick-log`, `QuickLogLocalEvents`.
- Allowed deviations: exact row copy may use the existing localized generic failed-save strings, but the
  failed row must be visually distinct from pending rows and keep retry/discard inline near the affected event.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.

Spec lock for this slice:
- AC-QL-4.5-1: failed local rows expose a structural failed-row hook and use muted danger tint/border
  from design tokens, not a normal raised card or bright red.
- AC-QL-4.5-2: failed local rows remain non-color-only: visible failed status pill plus retry and
  discard actions.
- AC-QL-4.5-3: retry calls the failed row's `clientEventId`; discard calls delete with
  `clientEventId` and `eventType`.
- AC-QL-4.5-4: pending local rows keep undo/discard controls and do not adopt failed danger styling.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-local-events.render.test.tsx`
  failed as expected before implementation because `quick-log-local-event-failed-card` was absent
  and failed rows had no asserted muted danger tint/border.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-local-events.render.test.tsx`
  — PASS: 1 suite, 1 test.
- `npm run test:unit -- --runTestsByPath src/test/quick-log-local-events.render.test.tsx src/test/quick-log-sheet.render.test.tsx`
  — PASS: 2 suites, 18 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, token drift check, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, 63 Jest suites / 456 tests, node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Project graph advisory refresh:
  `python3 /Users/dmitryselenya/.codex/skills/project-graph-context/scripts/project_graph.py update --repo /Users/dmitryselenya/Projects/puppy_app --base HEAD`
  — PASS: FTS index rebuilt, 93 files updated.

Implementation notes:
- `src/features/quick-log/components/QuickLogLocalEvents.tsx` now marks failed local rows with
  `quick-log-local-event-failed-card`, uses `tokens.color.status.dangerTint` and
  `tokens.color.status.danger`, and keeps pending rows on the non-danger path with
  `quick-log-local-event-pending-card`.
- Retry/discard callbacks remain unchanged and covered through the component and sheet tests.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator from a temporary `/_dev/components`
  route harness, restored before commit. Native evidence:
  `output/v2-nav-gaps-stage4/quick-log-pending-failed-harness-stage4.png`. The screenshot verifies
  the same Quick Log sheet anatomy with a pending Feeding row (`Saving`, Undo, Discard) and a failed
  Walk row using muted danger tint/border, visible `Not saved` status, `Try again`, and `Discard`.

## 13. Quick Log snackbar/undo Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/quick-log` after-tap snackbar/undo anatomy.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked Open Design board: `Quick Log after tap`
  (`quicklog-after-tap`, 88-board Codex Design handoff), state `snackbar/undo`.
- Historical atlas cross-reference: DESIGN.md §2.3.8 Snackbar / Undo and §15 Feedback layer.
- Route: `/quick-log`, with global `SnackbarProvider` host.
- Allowed deviations: production copy may use the existing localized tracker-template message rather
  than the exact Open Design sample `Logged · Pee outside`; the anatomy must still expose a bottom
  snackbar status, polite announcement, visible Undo action, optional Add details action for
  detail-capable trackers, and `saveSuccess` feedback without using celebration.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.

Spec lock for this slice:
- AC-QL-4.2-1: after a successful non-duplicate Quick Log tap, the sheet closes and a bottom snackbar
  renders the localized saved message with a visible Undo action.
- AC-QL-4.2-2: the snackbar status is a polite live region and the surface keeps the success tone
  from the shared snackbar primitive.
- AC-QL-4.2-3: the success snackbar carries the design feedback contract `hapticEvent: saveSuccess`;
  normal Quick Log saves must not use the rare `celebration` haptic.
- AC-QL-4.2-4: detail-capable trackers keep the Add details secondary action while Undo remains the
  primary action.
- AC-QL-4.2-5: failed mutation replacement uses the error feedback contract instead of leaving the
  stale save-success snackbar in place.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/design-primitives.render.test.tsx src/test/quick-log-controller.test.tsx src/test/quick-log-sheet.render.test.tsx`
  failed as expected before implementation:
  - shared `SnackbarProvider` did not call the haptic adapter for `hapticEvent: 'saveSuccess'`;
  - Quick Log success snackbar messages did not include `hapticEvent: 'saveSuccess'`;
  - Quick Log failed replacement messages did not include `hapticEvent: 'error'`.
  The route-level after-tap anatomy assertion was already satisfied by the existing visible UI.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/design-primitives.render.test.tsx src/test/quick-log-controller.test.tsx src/test/quick-log-sheet.render.test.tsx`
  — PASS: 3 suites, 72 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, token drift check, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, 63 Jest suites / 458 tests, node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.

Implementation notes:
- `src/design/primitives/Snackbar.tsx` now accepts optional `hapticEvent` metadata and triggers the
  shared design haptic adapter only when a shown/replaced snackbar is accepted as the active snackbar.
- `src/features/quick-log/useQuickLogSheetController.ts` now marks normal successful saves as
  `saveSuccess` feedback, not the rare `celebration` feedback.
- `src/features/quick-log/QuickLogFeedbackProvider.tsx` now passes snackbar haptic metadata through
  translation and marks failed replacement snackbars with `error` feedback.
- `src/test/quick-log-sheet.render.test.tsx` now pins the `4.2 Quick Log after tap` route anatomy:
  sheet closes, success snackbar remains, status is polite, surface uses success tint, and Undo/Add
  details are available for a detail-capable tracker.
- Initial 2026-07-02 follow-up: runtime screenshot attempts after production Quick Log saves and through a
  temporary local `SnackbarProvider` route harness still did not expose the transient snackbar host
  on the SE simulator. A RED/GREEN primitive regression now pins `SnackbarProvider` to a full-height
  root (`snackbar-provider-root`) so absolute snackbar overlays have a valid anchor. At that point,
  native visual capture for the snackbar host remained open pending a production screenshot with the
  success surface, Undo, and Add details.
- 2026-07-02 Stage 4 PASS follow-up: root-cause verification showed the production snackbar host was
  reachable in the runtime tree but could be visually covered by the native-stack layer during bitmap
  capture. A RED/GREEN primitive regression now pins active snackbar messages inside
  `react-native-screens` `FullWindowOverlay` (`snackbar-window-overlay`) while preserving the
  full-height provider root anchor. Native SE evidence from the installed PuppyPlan.app over Metro:
  runtime snapshot after a real Quick Log save exposed `Undo` and `Add details`, and
  `output/v2-nav-gaps-stage4/quick-log-production-snackbar-full-window-fast3-stage4.png` shows a
  real production Diary save with `Logged · Feeding`, visible `Undo`, and visible `Add details`.

## 14. Quick Trackers settings / Edit Trackers evidence

**2026-06-30 audit slice:** `/settings/quick-trackers` and Quick Log sheet "Edit Trackers" config.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked Open Design board: `Edit quick trackers`
  (`quicklog-routines` section in the 88-board Codex Design handoff), state `edit-trackers`.
- Routes/components:
  - `/quick-log` sheet -> `editTrackers={() => router.push('/settings/quick-trackers')}`;
  - More tab -> `/settings/quick-trackers`;
  - modal route `app/(modals)/settings/quick-trackers/index.tsx`;
  - `src/features/settings/quick-trackers/screens/QuickTrackersSettingsScreen.tsx`.
- Allowed deviations: implementation uses the accepted canonical tracker vocabulary
  `potty/feeding/sleep/walk/zoomies`; PRD's older optional `training` quick tracker remains deferred
  by the accepted 2026-06-23 canonical tracker taxonomy (ADR-0007) and the final Supabase
  `puppy_quick_tracker_ids_allowed` constraint. Adding `training` would be a schema/contract change,
  not a UI-only patch.

Spec lock for this slice:
- AC-QT-1: Quick Log sheet exposes an Edit Trackers action that opens `/settings/quick-trackers`
  without logging a tracker or dismissing via the fallback close route.
- AC-QT-2: More hub exposes Quick Trackers settings and opens the same route.
- AC-QT-3: Quick Trackers settings renders atlas-style rows with leading tracker icon, reorder
  affordance, toggle control, selected count, max-5 guidance, and no bottom Save CTA.
- AC-QT-4: settings persist valid toggle/reorder changes implicitly, keep at least one tracker
  selected, serialize saves, and recover failed saves without silently losing the prior confirmed
  selection.
- AC-QT-5: non-owner/viewer states do not render the editable tracker form.
- AC-QT-6: `training` is not selectable in this wave; the current accepted contract rejects it until
  a separate ADR-0007 schema/contract delta explicitly re-adds it.

Verification evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-trackers-settings.render.test.tsx src/test/quick-log-route.render.test.tsx src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts src/test/quick-log-contracts.test.ts src/test/supabase-contracts.test.ts`
  — PASS: 6 suites, 61 tests.

Implementation notes:
- `src/test/quick-trackers-settings.render.test.tsx` covers row anatomy, reorder actions, implicit
  save, max/min guardrails, failed-save rollback, owner-only errors, and non-owner lockout.
- `src/test/quick-log-route.render.test.tsx` covers the active sheet Edit Trackers route handoff.
- `src/test/more-settings.render.test.tsx` and `src/test/navigation-contract.test.ts` cover More entry
  and modal route contract.
- `src/test/quick-log-contracts.test.ts`, `src/test/supabase-contracts.test.ts`,
  `docs/architecture/adr/0007-prd-schema-baseline.md`, and
  `supabase/migrations/20260623120000_canonical_quick_log_tracker_taxonomy.sql` prove that
  `training` is intentionally outside the current selected Quick Log tracker vocabulary.
- Stage 4 PASS (2026-07-02): captured native SE screenshot from the installed PuppyPlan.app running
  JS-over-Metro and compared against this slice's locked acceptance. Evidence:
  `output/v2-nav-gaps-stage4/quick-trackers-stage4-top.png`. The route shows the full modal header,
  max-5 guidance, selected count, selected tracker rows with reorder handles/icons/toggles, More
  Options rows, history-preservation hint, and no bottom Save CTA. The live debug account had 3 of 5
  trackers selected, so the max-reached hint was not visible; that state remains covered by the
  render suite above.

## 15. Pet tab landing/hub Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/pet` landing/hub anatomy.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Locked Open Design board: `Pet hub` (`pet-health` section in the 88-board Codex Design handoff),
  state `landing/hub`.
- Historical atlas cross-reference: Health `11.1 List · mixed templates + records`,
  More `14.2 Puppy profile · saved view`; V2 allowed deviation folds both into the Pet tab.
- Route/component: `/pet`, `src/features/health/screens/HealthScreen.tsx`.
- Allowed deviations: until durable active-pet data wiring lands, the hub may render a neutral
  incomplete-profile placeholder by default and accept synthetic `petSummary` props in render tests.
  It must not show fake production puppy data.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-PET-HUB-1: `/pet` renders a top Pet profile hub card before health filters/rows.
- AC-PET-HUB-2: the hub includes non-color-only profile anatomy: avatar/photo placeholder, puppy
  name/title, age, breed, current weight, and an Edit profile affordance.
- AC-PET-HUB-3: the weight area includes an Add weight affordance without introducing a chart.
- AC-PET-HUB-4: the hub exposes a Quick Trackers entry point so Pet can lead to tracker setup while
  Quick Log remains the separate Add action, not a tab.
- AC-PET-HUB-5: the existing lightweight Health block remains visible below the hub; standalone
  Health tab, charts, multi-pet switcher, medication/refill, and health CRUD are out of this slice.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx` failed as expected while
  `pet-profile-hub-trackers-entry` was a non-actionable accessible `View`: no element with role
  `button` and label `health.pet-hub.quick-trackers-a11y` existed.
- Regression proof for route handoff: temporarily removing the `/pet` route callback made
  `npm run test:unit -- --runTestsByPath src/test/pet-route.render.test.tsx` fail as expected with
  `Expected: "/settings/quick-trackers"; Number of calls: 0`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx` — PASS: 1 suite, 5 tests.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/pet-route.render.test.tsx`
  — PASS: 2 suites, 6 tests.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/pet-route.render.test.tsx src/test/i18n.test.ts src/test/navigation-contract.test.ts`
  — PASS: 4 suites, 23 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx src/test/onboarding-flow.render.test.tsx`
  — PASS: 2 suites, 17 tests, after wrapping the First Log preview in `SnackbarProvider` inside the
  design gallery.
- `npm run check` — PASS: lint, typecheck, Jest 66 suites / 474 tests, node tests 118,
  scaffold checks, tokens, privacy scan, and text hygiene. Existing unrelated React `act(...)`
  warning in `screen-header.render.test.tsx` remains a warning, not a failure.
- `git diff --check` — PASS.
- `npm run check` — PASS: lint, typecheck, 64 Jest suites / 460 tests, node tests, scaffold checks,
  tokens, privacy scan, and text hygiene. Output still includes the existing React `act(...)` warning
  in `screen-header.render.test.tsx`; no failures.

Implementation notes:
- `src/features/health/screens/HealthScreen.tsx` now renders the Pet hub before the lightweight
  Health block, using `Card`, `Avatar`, `Button`, `Touchable`, `AppIcon`, `Stack`, and tokenized
  styles from `src/design`.
- The Quick Trackers entry is a real 44pt+ accessible button with a chevron and press feedback, not
  a static visual row.
- `app/(tabs)/pet/index.tsx` remains thin and only wires `onOpenQuickTrackers` to
  `router.push('/settings/quick-trackers')`.
- Stage 4 PASS (2026-07-02): captured native SE screenshots from the installed PuppyPlan.app running
  JS-over-Metro and compared against `docs/design/v1/specs/05-pet-health.md` plus this slice's locked
  acceptance. Evidence: `output/v2-nav-gaps-stage4/pet-stage4-top.png` (profile hub / Quick Trackers
  entry) and `output/v2-nav-gaps-stage4/pet-stage4-health-empty.png` (Health empty state after scroll).
  The route shows the Pet title, neutral profile placeholder, age/breed/weight facts, Edit profile,
  Add weight, accessible Quick Trackers entry, health filters/chips, empty Health state, Add entry,
  disabled Browse templates, and non-diagnostic footer copy without bottom-chrome overlap. Mixed health
  list, add-record modal, detail/delete, and vet-prep Stage 4 checks remain separate plan items.

## 16. Health Add Record route Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/pet/health-record-edit` Add Record route anatomy.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Locked states: `add record`, cross-referenced to historical atlas `11.2 Edit · empty form`
  and `11.3 Edit · filled, ready to save`.
- Route/component: `/pet/health-record-edit`,
  `app/(modals)/pet/health-record-edit/index.tsx`,
  `src/features/health/screens/HealthScreen.tsx`.
- Allowed deviation: the route currently implements the native type chooser and empty form anatomy
  only. Durable save, edit/delete, status-transition behavior, loading/error/offline states, and
  native screenshot comparison remain plan-owned follow-up work.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-PET-ADD-1: the empty Pet Health state opens `/pet/health-record-edit`.
- AC-PET-ADD-2: the route first renders a native record-type chooser with Close, `New entry`,
  four record types (Vaccination, Parasite treatment, Preventive care, Vet visit), and calm helper
  copy.
- AC-PET-ADD-3: choosing a record type transitions to the health record form anatomy with main
  fields, more fields, status segmented control, urgent toggle, and privacy/non-diagnostic hints.
- AC-PET-ADD-4: no diagnosis, dosage, treatment-plan, or emergency language is introduced.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx`
  failed as expected:
  - `health.empty.primary` was still disabled, so the Add Record affordance could not open a route.
  - the new modal route returned `null`, so no Close button / type chooser existed.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx`
  — PASS: 3 suites, 10 tests.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx src/test/navigation-contract.test.ts src/test/i18n.test.ts`
  — PASS: 5 suites, 27 tests.
- `npm run test:unit -- --runTestsByPath src/test/app-shell.render.test.tsx src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx`
  — PASS: 4 suites, 17 tests.
- `npm run typecheck` initially failed because generated `.expo/types/router.d.ts` was stale and did
  not contain `/pet/health-record-edit`; regenerating typed routes from the Expo Router generator added
  the route without weakening TypeScript.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, Jest 66 suites / 472 tests, node tests 118, scaffold
  checks, tokens, privacy scan, and text hygiene. Existing unrelated React `act(...)` warning in
  `screen-header.render.test.tsx` remains a warning, not a failure.
- `npm run check` — PASS: lint, typecheck, 65 Jest suites / 464 tests, 118 node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- `npm run check` — PASS: lint, typecheck, 65 Jest suites / 464 tests, 118 node tests, scaffold checks,
  tokens, privacy scan, and text hygiene. Output still includes the existing React `act(...)` warning
  in `screen-header.render.test.tsx`; no failures.

Implementation notes:
- `app/(tabs)/pet/index.tsx` stays thin and routes the empty Health Add Record action to
  `router.push('/pet/health-record-edit')`.
- `app/(modals)/pet/health-record-edit/index.tsx` stays thin and wires Close to `router.back()`.
- `HealthRecordEditRouteScreen` uses design primitives (`Screen`, `Card`, `Button`, `ListGroup`,
  `ListRow`, `AppIcon`, `SegmentedControl`, `TextField`, `Toggle`) and existing EN/RU/ES i18n keys.
- Stage 4 PASS (2026-07-02): captured native SE screenshots from the installed PuppyPlan.app running
  JS-over-Metro and compared against `docs/design/v1/specs/05-pet-health.md` plus this slice's locked
  acceptance. Evidence:
  `output/v2-nav-gaps-stage4/health-record-edit-chooser-stage4-after-card-a11y.png`,
  `output/v2-nav-gaps-stage4/health-record-edit-form-stage4-top-after-card-a11y.png`, and
  `output/v2-nav-gaps-stage4/health-record-edit-form-stage4-bottom-after-card-a11y.png`.
  Runtime snapshot also exposes the four type chooser targets and the empty-form fields, confirming
  the chooser can be operated through native accessibility. Save/persistence/loading/error/offline
  states remain open.

## 17. Health detail status/delete anatomy Stage-0 lock evidence

**2026-06-30 next implementation slice:** Health record detail status strip + delete pending undo preview.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Locked DESIGN refs: §4.1.4 Edit Record / Delete (Undo), §4.1.6 Status Transitions Visualisation.
- Route/component: `HealthRecordDetailPreview` in
  `src/features/health/screens/HealthScreen.tsx`.
- Allowed deviation: this slice implements native structural anatomy only. Real record persistence,
  editable dirty-state behavior, soft warning haptic, timed 5-second undo restore, and native screenshot
  comparison remain plan-owned follow-up work.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-PET-STATUS-1: detail view renders four visible status steps: Template, Needs vet review,
  Confirmed, Done.
- AC-PET-STATUS-2: each stage is non-color-only: visible icon + visible label.
- AC-PET-STATUS-3: exactly one stage is active and filled with the current status tone; inactive steps
  remain outline/raised.
- AC-PET-STATUS-4: the strip exposes a single full-sequence accessibility label using the existing
  `health.status-transitions.a11y-template`.
- AC-PET-DELETE-1: delete pending state shows the delete confirm busy/disabled controls plus a visible
  undo-toast preview using the existing localized copy.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx` failed as expected before
  implementation:
  - `health-stage-step` did not exist because the status strip still rendered unlabeled hidden bars.
  - `health.edit-record.delete-undo-toast` was absent from the delete pending anatomy.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx`
  — PASS: 1 suite, 6 tests.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx src/test/i18n.test.ts src/test/navigation-contract.test.ts`
  — PASS: 5 suites, 27 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: 67 Jest suites / 491 tests, node tests 118/118, scaffold, tokens,
  privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)` warning
  in `src/test/screen-header.render.test.tsx` is unrelated to this slice.

Implementation notes:
- `HealthStageStrip` now renders `health-stage-step` cards with `AppIcon`, visible labels, tone fills,
  and the existing aggregate accessibility label.
- Delete pending preview now renders the localized `Entry deleted. Undo` toast copy in a polite live
  region without adding a new primitive or unsupported React Native role.
- `src/contracts/navigation.ts` now includes `health.edit-record.delete-undo-toast` in
  `shellI18nKeys`.
- Stage 4 PASS (2026-07-02): captured native SE screenshots from the installed PuppyPlan.app running
  JS-over-Metro and compared against `docs/design/v1/specs/05-pet-health.md` plus this slice's locked
  acceptance. Evidence:
  `output/v2-nav-gaps-stage4/health-detail-confirmed-stage4.png`,
  `output/v2-nav-gaps-stage4/health-detail-stage-strip-stage4.png`,
  `output/v2-nav-gaps-stage4/health-detail-needs-review-stage4.png`, and
  `output/v2-nav-gaps-stage4/health-detail-delete-pending-stage4.png`. Runtime snapshot evidence also
  exposed the status-strip accessibility labels (`Stage 3 of 4: Confirmed...` and
  `Stage 2 of 4: Needs vet review...`) plus the busy `Delete entry` target. The screenshots show
  confirmed and needs-vet-review detail rows, four non-color-only stage steps, one active filled stage,
  the delete confirm card, disabled destructive delete, and undo-toast preview. Real record persistence,
  editable dirty-state behavior, soft warning haptic, timed undo restore, and durable delete remain open.

## 18. Vet visit prep card Stage-0 lock evidence

**2026-06-30 next implementation slice:** Pet Health vet visit prep reference card.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Locked DESIGN ref: §4.1.7 Vet Visit Prep Card.
- Route/component: `/pet`, `HealthScreen` in
  `src/features/health/screens/HealthScreen.tsx`.
- Allowed deviation: this slice implements a static native reference card for the design anatomy.
  Durable checklist editing, actual upcoming-vet-visit data, item completion state, notifications, and
  native screenshot comparison remain plan-owned follow-up work.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-PET-VET-PREP-1: Pet Health renders the vet visit prep card inside the Pet Health content, not as a
  standalone tab.
- AC-PET-VET-PREP-2: the card shows title, visit date/time subtitle, four checklist rows, an Add item
  affordance, and the non-instruction disclaimer.
- AC-PET-VET-PREP-3: checklist rows have stable 36pt+ row anatomy and are non-color-only.
- AC-PET-VET-PREP-4: visible copy stays calm and avoids diagnosis, dosage, treatment-plan, and
  emergency language.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx` failed as expected before
  implementation because `health-vet-prep-card` did not exist in the Pet Health render tree.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx`
  — PASS: 1 suite, 7 tests.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx src/test/i18n.test.ts src/test/navigation-contract.test.ts`
  — PASS: 5 suites, 28 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n parity/budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, 66 Jest suites / 470 tests, 118 node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- `npm run check` — PASS: lint, typecheck, 66 Jest suites / 468 tests, 118 node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- `npm run check` — PASS: lint, typecheck, 65 Jest suites / 465 tests, 118 node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.

Implementation notes:
- `HealthVetPrepCard` uses existing design primitives (`Card`, `Stack`, `Button`, `AppIcon`,
  `AppText`) and existing `health.vet-prep.*` localized copy.
- EN/RU/ES gained localized sample date/time values for the existing interpolated subtitle.
- `src/contracts/navigation.ts` now includes the `health.vet-prep.*` keys used by shell UI.
- Stage 4 PASS (2026-07-02): captured a native SE screenshot from the installed PuppyPlan.app running
  JS-over-Metro and compared against `docs/design/v1/specs/05-pet-health.md` plus this slice's locked
  acceptance. Evidence: `output/v2-nav-gaps-stage4/pet-vet-prep-stage4.png`. The screenshot shows the
  Health list context, `Getting ready for the visit`, visit date/time subtitle, four checklist rows,
  Add item affordance, and the non-instruction/non-medical-advice footer copy. Real checklist editing,
  actual upcoming-vet-visit data, item completion state, and notifications remain open.

## 19. Reminder edit route Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/reminders/edit` create/edit reminder form, quiet-hours
preview, and calm push-permission-denied anatomy.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked DESIGN refs: §4.2.2 Create / Edit Reminder Form, §4.2.3 Quiet Hours Picker,
  §4.2.7 Push Permission Denied — Calm In-App State.
- Route/component: `/reminders/edit`,
  `app/(modals)/reminders/edit/index.tsx`,
  `src/features/reminders/screens/ReminderEditScreen.tsx`.
- Allowed deviation: this slice implements native structural anatomy only. Real reminder persistence,
  local notification scheduling, OS permission probing, Settings deeplink, quiet-hours range editing,
  validation, and loading/error/offline states remain plan-owned follow-up work.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-REM-EDIT-1: `/reminders/edit` renders modal header actions Cancel / Save and keeps Save disabled
  while required title/time input is absent.
- AC-REM-EDIT-2: the form renders title field, category options, health-category helper text, native
  picker rows for time/repeat/timezone, quiet-hours and sound toggles, and the local-reminder helper.
- AC-REM-QUIET-1: the same route exposes quiet-hours anatomy: title, example range, per-puppy toggle,
  and non-blocking helper copy.
- AC-REM-PERMISSION-1: permission-denied state is a calm inline card with muted info tint, bell icon,
  body copy, How to enable action, and fallback text that says reminders remain created/visible in app.
- AC-REM-SAFETY-1: visible copy does not introduce diagnosis, dosage, treatment-plan, or emergency
  language.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/navigation-contract.test.ts` failed as expected
  while `/reminders/edit` was present in `modalRoutes` but absent from `plannedRouteFiles`.
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx` failed as
  expected while the new route returned `null`: Cancel, form rows, quiet-hours card, and permission
  card were absent.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx`
  — PASS: 1 suite, 3 tests.
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx src/test/navigation-contract.test.ts src/test/i18n.test.ts`
  — PASS: 3 suites, 20 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n parity/budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.

Implementation notes:
- `ReminderEditScreen` uses existing design primitives (`Screen`, `Card`, `Button`, `TextField`,
  `ListGroup`, `ListRow`, `Toggle`, `AppIcon`, `Stack`) and existing EN/RU/ES `reminders.*` localized
  copy.
- `app/(modals)/_layout.tsx` now registers `reminders/edit/index`, and
  `src/contracts/navigation.ts` tracks `/reminders/edit` as an existing modal route file.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/reminders-edit-stage4-top.png`,
  `output/v2-nav-gaps-stage4/reminders-edit-stage4-form-pickers.png`,
  `output/v2-nav-gaps-stage4/reminders-edit-stage4-quiet-hours.png`,
  `output/v2-nav-gaps-stage4/reminders-edit-stage4-permission-denied.png`. Runtime snapshot evidence
  exposed the required controls and labels: Cancel, disabled Save, name field, category options,
  Time / Repeat / Time zone rows, Respect quiet hours, Sound, quiet-hours example range,
  per-puppy toggle, Notifications are off, How to enable, and fallback copy.

## 20. Trusted sitter checklist reminder anatomy evidence

**2026-06-30 next implementation slice:** Trusted Sitter Checklist Reminder card anatomy inside
the Reminders edit/review surface.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked DESIGN ref: §4.2.6 Trusted Sitter Checklist Reminders.
- Route/component: `/reminders/edit`, `ReminderEditScreen` in
  `src/features/reminders/screens/ReminderEditScreen.tsx`.
- Allowed deviation: this slice implements a static native structural anatomy preview inside the
  current reminder-edit route. Real sitter checklist source data, checklist open flow, whole-checklist
  completion, push to the owner, and pending-sync state remain plan-owned follow-up work.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-REM-SITTER-1: the route renders a trusted-sitter checklist reminder card with a left
  `primary/600` accent rail and `personCluster` icon slot.
- AC-REM-SITTER-2: the card exposes the `Trusted sitter` source label, evening checklist title,
  and a synthetic privacy-safe caregiver label.
- AC-REM-SITTER-3: progress is non-color-only: a visible 1/3 progress bar plus an accessibility label.
- AC-REM-SITTER-4: the action set includes localized Open checklist, Mark all done, and Skip actions.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx` failed as
  expected before implementation because `reminder-sitter-checklist-card` was absent from the route.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx`
  — PASS: 1 suite, 4 tests.
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx src/test/i18n.test.ts src/test/navigation-contract.test.ts`
  — PASS: 3 suites, 21 tests.

Implementation notes:
- `TrustedSitterChecklistReminderCard` uses existing design primitives (`Card`, `Button`, `AppIcon`,
  `AppText`, `Stack`) and tokenized styles. No new primitive or dependency was introduced.
- EN/RU/ES `reminders.sitter-card.*` strings now include the progress accessibility label and the
  full three-action checklist reminder set.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/reminders-edit-stage4-sitter-checklist.png`. Runtime snapshot evidence
  exposed the `Trusted sitter` label, `Evening checklist · 7:00 pm` title, privacy-safe caregiver
  label, `Open checklist`, `Mark all done`, and `Skip` actions.

## 21. Onboarding Welcome anatomy evidence

**2026-06-30 next implementation slice:** `/onboarding` initial Welcome state.

- Route-specific spec card: `docs/design/v1/specs/02-1-onboarding-welcome.md`.
- Source spec card: `docs/design/v1/specs/02-onboarding-flow.md`.
- Locked atlas board: `2.1 Welcome · default`
  (`docs/design/v1/screenshots/onboarding/2-1.png`, state `default`, 393x852).
- Route/component: `/onboarding`, `OnboardingScreen` in
  `src/features/onboarding/screens/OnboardingScreen.tsx`.
- Allowed deviation: native implementation uses a token-built abstract warm illustration rather than
  the atlas placeholder text/bitmap. Mount animation remains deferred to the later onboarding motion pass.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-ONB-WELCOME-1: the initial onboarding state renders a decorative 160pt+ warm illustration frame
  before the heading block.
- AC-ONB-WELCOME-2: the H1 uses `onboarding.welcome.title` and exposes the locked accessibility label
  `onboarding.welcome.a11y-title`.
- AC-ONB-WELCOME-3: the subtitle, primary Get started CTA, and secondary "already have an account"
  action are visible and accessible before puppy setup.
- AC-ONB-WELCOME-4: the secondary sign-in action is actionable and can route to `/sign-in`; it is not
  a decorative text-only row.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx` failed as expected
  before implementation because `onboarding-welcome-illustration` was absent from the welcome state.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 9 tests.
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx src/test/app-shell.render.test.tsx src/test/auth-navigation.test.ts src/test/i18n.test.ts`
  — PASS: 4 suites, 33 tests.
- `npm run typecheck` — PASS after replacing the mistaken `accent.honeyTint` reference with the
  existing `tokens.color.accent[100]`.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n parity/budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.

Implementation notes:
- The welcome state now uses the existing design primitives (`Screen`, `Stack`, `AppText`, `Button`)
  and tokenized decorative `View` anatomy with `decorativeViewProps`.
- `ConnectedOnboardingScreen` accepts optional `openSignIn`, and `app/onboarding/index.tsx` wires the
  secondary action to `router.replace('/sign-in')`.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/onboarding-welcome-stage4.png`. Runtime snapshot evidence exposed the
  locked H1 accessibility text, subtitle, `Get started` primary CTA, and `I already have an account`
  secondary action with no stale modal layer after app restart.

## 22. Onboarding Puppy Setup / Age Hint anatomy evidence

**2026-06-30 next implementation slice:** `/onboarding` profile-step Age Hint.

- Route-specific spec card: `docs/design/v1/specs/02-2-onboarding-puppy-setup-age-hint.md`.
- Source spec card: `docs/design/v1/specs/02-onboarding-flow.md`.
- Locked atlas boards: `2.2 Profile · default`, `2.2 Profile · filled`, `2.2 Profile · error`
  (`docs/design/v1/screenshots/onboarding/2-2-default.png`,
  `docs/design/v1/screenshots/onboarding/2-2-filled.png`,
  `docs/design/v1/screenshots/onboarding/2-2-error.png`, 393x852).
- Route/component: `/onboarding`, `OnboardingScreen` in
  `src/features/onboarding/screens/OnboardingScreen.tsx`.
- Allowed deviation: full Puppy Setup step chrome/stepper/date-wheel is not claimed by this slice;
  this slice only locks the inline age hint card from §2.1.3.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx` failed as expected
  before implementation on `renders the puppy setup age hint inline before tracker selection` because
  `onboarding-age-hint-card` was absent from the profile step after name entry.

GREEN evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 10 tests.
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx src/test/i18n.test.ts src/test/app-shell.render.test.tsx src/test/auth-navigation.test.ts`
  — PASS: 4 suites, 34 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n parity/budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, Jest 66 suites / 471 tests, node tests 118, scaffold
  checks. Existing unrelated React `act(...)` warning in `screen-header.render.test.tsx` remains a
  warning, not a failure.

Implementation notes:
- The profile step now shows an inline `Card` before tracker selection when age-weeks mode has a valid
  estimate and the profile has user-entered content.
- The card uses existing primitives (`Card`, `Stack`, `AppIcon name="infoCircle"`, `AppText`) and
  design tokens (`tokens.color.status.infoTint`, `tokens.color.status.info`, `tokens.radius.md`).
- The hint text reuses `getPuppyAgeHintKey(...)` and existing EN/RU/ES localized copy; no new user
  strings were required.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/onboarding-age-hint-stage4.png`. Runtime snapshot evidence exposed the
  Step 2 chrome, name field with privacy-safe synthetic input, age segmented control, 8-week stepper,
  info hint copy, and enabled Continue action.
- The full Puppy Setup profile step still needs native screenshot comparison.
  Visible back/step chrome, stepper/date-zone anatomy, and disabled-until-name CTA behavior are now
  tracked by §23.

## 23. Onboarding Puppy Setup chrome / stepper anatomy evidence

**2026-06-30 next implementation slice:** `/onboarding` profile-step Puppy Setup native anatomy.

- New route-specific spec card: `docs/design/v1/specs/02-2-onboarding-puppy-setup.md`.
- Locked atlas refs:
  - `docs/design/v1/screenshots/onboarding/2-2-default.png`
  - `docs/design/v1/screenshots/onboarding/2-2-filled.png`
  - `docs/design/v1/screenshots/onboarding/2-2-error.png`
- Source canon: `DESIGN.md` §2.1.2 Puppy Setup and §2.1.3 Age Hint.
- Allowed deviation: the birth-date mode keeps an editable native text input inside the DateWheel
  zone until the real platform DatePicker module is wired; visual zone, validation placement, and
  a11y label remain locked in this slice.

Spec lock for this slice:
- AC-OB-2.2-1: profile step renders top chrome with a localized back button, centered `Step 2 of 5`,
  and no card wrapper around the title block.
- AC-OB-2.2-2: profile step shows an explicit Age section label before the segmented Age/Birth Date
  control.
- AC-OB-2.2-3: Age mode renders a tokenized stepper zone, value, decrement/increment controls, and
  an `adjustable` accessibility contract instead of a free text age field.
- AC-OB-2.2-4: Continue is disabled until the name field has non-empty content and does not show a
  name error while disabled.
- AC-OB-2.2-5: after name entry, Continue enables, age value becomes visible, the age hint remains
  directly under the age zone, and age adjustments update the visible weeks value before tracker
  selection.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  failed as expected before implementation because `Step 2 of 5` was absent, the age field was still
  the old `Age in weeks` TextField, and the Continue CTA was enabled with an empty name.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 11 tests.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/onboarding-flow.render.test.tsx`
  — PASS: 2 suites, 20 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: 67 Jest suites / 492 tests, node tests 118/118, scaffold, tokens,
  privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)` warning
  in `src/test/screen-header.render.test.tsx` is unrelated to this slice.

Implementation notes:
- `src/features/onboarding/screens/OnboardingScreen.tsx` now renders the profile chrome, disabled
  CTA, age section label, age stepper, and birth-date date-zone wrapper through existing design
  primitives (`Screen`, `Stack`, `Touchable`, `AppText`, `AppIcon`, `Button`, `TextField`, `Card`).
- EN/RU/ES startup locale files include the new step label, back label, dynamic `{count}` age value,
  and increment/decrement accessibility labels.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/onboarding-puppy-setup-default-stage4.png`,
  `output/v2-nav-gaps-stage4/onboarding-age-hint-stage4.png`,
  `output/v2-nav-gaps-stage4/onboarding-puppy-setup-error-stage4.png`. Runtime snapshot evidence
  exposed Back, Step 2 of 5, name field, disabled/enabled Continue, age section, birth-date date-zone
  field, and future-date inline error. The visual Birth date segment required one `idb ui tap`
  coordinate tap because XcodeBuildMCP exposed the segment text but not an actionable target.
- Real platform DatePicker replacement remains open and should use the native picker integration
  slice rather than adding a web-style custom picker here.

## 24. Onboarding Quick Tracker Selection anatomy evidence

**2026-06-30 next implementation slice:** `/onboarding` tracker-step native anatomy.

- New route-specific spec card: `docs/design/v1/specs/02-4-onboarding-tracker-picker.md`.
- Locked atlas ref: `docs/design/v1/screenshots/onboarding/2-4.png`.
- Source canon: `DESIGN.md` §2.1.4 Quick Tracker Selection.
- Allowed deviation: the onboarding UI may reach zero selected trackers and show the locked
  `Skip selection` CTA, but saving from zero normalizes to the accepted default tracker set. This
  preserves the existing durable Quick Log settings invariant that saved tracker selections contain at
  least one tracker and avoids an empty first Quick Log surface.

Spec lock for this slice:
- AC-OB-2.4-1: tracker step renders top chrome with a localized back button and centered
  `Step 3 of 5`.
- AC-OB-2.4-2: helper copy is the tracker-picker helper, not the previous puppy-age hint.
- AC-OB-2.4-3: selected tracker tiles expose `accessibilityState.selected=true`, selected/unselected
  screen-reader labels, and a visible top-right checkmark so selection is not color-only.
- AC-OB-2.4-4: users can deselect all trackers; the counter reaches `0 of 5 selected`, no minimum
  warning appears, and the CTA changes to `Skip selection`.
- AC-OB-2.4-5: pressing `Skip selection` saves default tracker ids so the durable profile still
  satisfies the accepted Quick Log tracker contract.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  failed as expected before implementation:
  - `Step 3 of 5` was absent and the tracker step still rendered the age hint as helper copy.
  - tracker tile accessibility labels were only the tracker names and had no checkmark assertion.
  - deselecting the final tracker showed the old minimum-required snackbar instead of reaching zero.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 12 tests.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/design-primitives.render.test.tsx src/test/onboarding-flow.render.test.tsx`
  — PASS: 3 suites, 63 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, Jest 66 suites / 473 tests, node tests 118, scaffold
  checks, tokens, privacy scan, and text hygiene. Existing unrelated React `act(...)` warning in
  `screen-header.render.test.tsx` remains a warning, not a failure.

Implementation notes:
- `src/features/onboarding/screens/OnboardingScreen.tsx` now renders tracker-step chrome, helper
  copy, selected/unselected a11y labels, zero-selection CTA, and skip-to-default save normalization.
- `src/design/primitives/TrackerTile.tsx` now renders a selected checkmark using the design-owned
  `AppIcon name="check"` and tokenized primary/check colors.
- EN/RU/ES startup locale files include the new tracker back label, step label, selected/unselected
  tile accessibility templates, and the locked `Skip selection` wording.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/onboarding-tracker-selection-stage4.png`,
  `output/v2-nav-gaps-stage4/onboarding-tracker-selection-zero-stage4.png`. Runtime snapshot evidence
  exposed Back, Step 3 of 5, helper copy, five selected tracker tiles with selected accessibility
  labels, visible checkmarks, `5 of 5 selected`, `Continue`, then all five unselected labels,
  `0 of 5 selected`, and `Skip selection` with no minimum-warning alert.

## 25. Onboarding Plan Reveal anatomy evidence

**2026-06-30 next implementation slice:** `/onboarding` plan-step native value moment.

- New route-specific spec card: `docs/design/v1/specs/02-5-onboarding-plan-reveal.md`.
- Locked atlas ref: `docs/design/v1/screenshots/onboarding/2-5.png`.
- Source canon: `DESIGN.md` §2.1.5 Plan Reveal.
- Allowed deviation: onboarding remains outside the V2 tab shell, so no TabBar or persistent Quick
  Log FAB is shown on this wizard step. Motion requirements (stagger-in cards and one-time CTA pulse)
  remain deferred to the shared onboarding motion pass.

Spec lock for this slice:
- AC-OB-2.5-1: plan step starts with a localized puppy summary row containing name, age, and owner
  avatar context.
- AC-OB-2.5-2: the H2/title and supporting copy match `DESIGN.md` §2.1.5.
- AC-OB-2.5-3: hero card is a distinct 96pt minimum activation card using the rare Honey/accent tint
  and localized first-log copy.
- AC-OB-2.5-4: starter actions render as three separate DailyCard-style cards, not as plain text
  inside one shared card.
- AC-OB-2.5-5: bottom primary CTA remains `Start your first log` / localized equivalent and opens
  the standard Quick Log sheet.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  failed as expected before implementation:
  - the plan step had no puppy summary row or summary accessibility label;
  - the CTA appeared before the hero card;
  - the hero/starter content was grouped inside one plain card with no 96pt hero hook and no separate
    starter-card anatomy.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 13 tests.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/onboarding-flow.render.test.tsx`
  — PASS: 2 suites, 22 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, Jest 66 suites / 474 tests, node tests 118,
  scaffold checks, tokens, privacy scan, and text hygiene. Existing unrelated React `act(...)`
  warning in `screen-header.render.test.tsx` remains a warning, not a failure.
- `git diff --check` — PASS.

Implementation notes:
- `src/features/onboarding/screens/OnboardingScreen.tsx` now renders the Plan Reveal summary row,
  accent HeroCard, three separate starter action cards, and bottom CTA using design primitives.
- EN/RU/ES locale files include the Plan Reveal summary, summary accessibility label, birth-date
  fallback, hero accessibility label, and starter-card accessibility template.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/onboarding-plan-reveal-stage4.png`. Runtime snapshot evidence exposed the
  plan title/supporting copy, hero first-log copy, three separate starter actions, and `Start your
  first log` CTA; visual evidence also covers the localized puppy summary row with privacy-safe
  synthetic name and age.

## 26. Onboarding First Log anatomy evidence

**2026-06-30 next implementation slice:** first-value completion state after onboarding Quick Log.

- New route-specific spec card: `docs/design/v1/specs/02-6-onboarding-first-log.md`.
- Locked atlas ref: `docs/design/v1/screenshots/onboarding/2-6.png`.
- Source canon: `DESIGN.md` §2.1.6 First Log.
- Allowed deviation: legacy atlas may name Today; V2 final shell lands in Diary with Diary selected,
  Pet/More available, and the separate Add/FAB action present.

Spec lock for this slice:
- AC-OB-2.6-1: first-log completion lands in Diary chrome, not wizard chrome.
- AC-OB-2.6-2: the first event is not presented as fully synced before account wall; it has visible
  pending and local-only indicators.
- AC-OB-2.6-3: copy avoids legacy `Today` wording in the V2 first-value preview.
- AC-OB-2.6-4: completion announces a single celebration snackbar using the design Snackbar
  primitive and `celebration` haptic metadata.
- AC-OB-2.6-5: account and notification prompts remain absent from the first-value screen.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  failed as expected before implementation:
  - First Log preview still showed `First Today` and `Today now shows...`;
  - first event status was `Saved` / synced;
  - there was no local-only indicator, pending indicator, or celebration snackbar.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 13 tests.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/onboarding-flow.render.test.tsx`
  — PASS: 2 suites, 22 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.

Implementation notes:
- `src/features/onboarding/screens/OnboardingScreen.tsx` first-log preview now removes the old
  Today eyebrow, uses Diary wording, renders a pending status pill, marks the timeline row
  local-only, and triggers the existing Snackbar primitive with `hapticEvent: 'celebration'`.
- `src/features/_dev/design-gallery/DesignGalleryScreen.tsx` wraps the First Log preview in
  `SnackbarProvider`, matching the snackbar context the runtime app already has through providers.
- EN/RU/ES locale files include the first-log celebration snackbar accessibility label and updated
  Diary-first body copy.
- Stage 4 partial PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro. Native
  content/chrome evidence:
  `output/v2-nav-gaps-stage4/onboarding-first-log-chrome-stage4.png`,
  `output/v2-nav-gaps-stage4/onboarding-first-log-harness-stage4.png`. Runtime/visual evidence covers
  Diary-selected chrome, Pet/More tabs, separate Quick Log FAB, pending `Saving` pill, local-only row,
  Diary copy with no legacy `Today` wording, and no account/notification prompt.
- Stage 4 PASS follow-up recorded 2026-07-02: after the shared `SnackbarProvider` host moved active
  messages into `FullWindowOverlay`, a native SE screenshot from the installed PuppyPlan.app over
  Metro captured the first-log preview and visible celebration snackbar:
  `output/v2-nav-gaps-stage4/onboarding-first-log-snackbar-full-window-direct-stage4.png`. Evidence
  shows Diary-selected bottom chrome, the separate Add/FAB action, pending/local-only first event
  state, no account/notification prompt, and the visible snackbar message `Done. You can keep going.`

### 27. Onboarding Account / Notifications Prompt Reconciliation (§2.1.7)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/02-7-onboarding-account-notifications-prompts.md`.
- Source: `DESIGN.md` §2.1.7 plus Open Design V2 sheet anatomy; no standalone v1 PNG exists.
- Allowed deviation: prompts are post-first-value previews only. Runtime scheduler and OS permission
  handoff remain deferred.

Acceptance:
- AC-OB-2.7-1: account prompt renders as a skippable sheet with Apple, Google, Email, and Not now actions.
- AC-OB-2.7-2: notification prompt renders as a skippable sheet with enable and Not now actions.
- AC-OB-2.7-3: first-value completion remains free of account/notification pressure.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 16 tests.
- `npm run check` — PASS: lint, typecheck, 66 Jest suites / 478 tests, node checks, scaffold
  guardrails, token drift, privacy scan, and text hygiene.

Implementation notes:
- `src/features/onboarding/screens/OnboardingScreen.tsx` already exposes
  `OnboardingAccountPromptPreview` and `OnboardingNotificationsPromptPreview` with localized
  EN/RU/ES copy and design `SheetSurface` / `Button` primitives.
- This section reconciles the plan status from ❌ to ✅ after fresh verification; it did not add a new
  runtime prompt scheduler.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro. Native
  evidence:
  `output/v2-nav-gaps-stage4/onboarding-account-prompt-clean-stage4.png`,
  `output/v2-nav-gaps-stage4/onboarding-notifications-prompt-clean-stage4.png`. Visual evidence covers
  the account SheetSurface with Apple, Google, Email, and Not now actions, plus the quiet-reminder
  SheetSurface with Turn on and Not now actions. Runtime scheduler and OS permission handoff remain
  deferred.

### 28. More Notification Preferences Anatomy Slice (§4.4.4)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/06-more-privacy-paywall.md`.
- Source: `DESIGN.md` §4.4.4.
- Route: `/settings/notifications` from the More hub notifications row.

Acceptance:
- AC-MORE-4.4.4-1: More notifications row is an active chevron row and opens the settings route.
- AC-MORE-4.4.4-2: notification preferences screen renders Local reminders, Push to your device,
  Quiet hours, and Time zone sections.
- AC-MORE-4.4.4-3: local reminders, push reminders, and sitter-completed rows use native switch
  anatomy with localized accessibility labels.
- AC-MORE-4.4.4-4: quiet hours and timezone rows show the locked values as chevron rows, not as
  duplicated section labels.
- AC-MORE-4.4.4-5: route/navigation contract, shell i18n, and scaffold guardrails include
  `/settings/notifications`.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  failed as expected before implementation because `Notifications` was not a button route.
- The same suite failed as expected after adding the screen assertion because
  `NotificationPreferencesScreen` did not exist.
- The suite caught one anatomy mismatch: the quiet-hours row duplicated the section title instead of
  using the locked time value as the row title.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  — PASS: 1 suite, 8 tests.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts src/test/i18n.test.ts src/test/app-shell.render.test.tsx`
  — PASS: 4 suites, 32 tests.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx`
  — PASS: 1 suite, 4 tests.
- `npm run test:scaffold` — PASS.
- `git diff --check` — PASS.
- `npm run check` — PASS: lint, typecheck, 66 Jest suites / 478 tests, node checks, scaffold
  guardrails, token drift, privacy scan, and text hygiene. Note: the existing reduced-motion
  `act(...)` console warning in `screen-header.render.test.tsx` remains non-failing and unrelated to
  this slice.

Implementation notes:
- Added `src/features/more/screens/NotificationPreferencesScreen.tsx`.
- Added route file `app/(modals)/settings/notifications/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openNotifications`, active notification row, and route wiring from
  `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and scaffold guardrails to include `/settings/notifications`.
- Updated local Expo typed routes so `router.push('/settings/notifications')` typechecks in this
  workspace.
- Stage 4 PASS (2026-07-02): captured native SE screenshot from the installed PuppyPlan.app running
  JS-over-Metro and compared against the locked More notification preferences anatomy in
  `docs/design/v1/specs/06-more-privacy-paywall.md` plus this slice's acceptance. Evidence:
  `output/v2-nav-gaps-stage4/settings-notifications-stage4.png`. The route shows the full modal
  header, local reminders toggle, push reminders/sitter completion toggles, quiet-hours row, and
  timezone row without clipping/overlap. Persistence and OS permission handoff remain deferred.

### 29. More Support / Help Anatomy Slice (§4.4.6)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/06-4-more-support-help.md`.
- Source: `DESIGN.md` §4.4.6 plus the Open Design V2 More/support board.
- Route: `/settings/help` from the More hub Help row.

Acceptance:
- AC-MORE-4.4.6-1: More Help row is an active chevron row and opens the settings help route.
- AC-MORE-4.4.6-2: support/help screen renders modal header, intro card, topic shortcuts, diagnostics
  rows, contact row, and a privacy-safe support note.
- AC-MORE-4.4.6-3: support/help copy uses typed EN/RU/ES i18n keys and does not expose a hardcoded
  support email or private sample data.
- AC-MORE-4.4.6-4: route/navigation contract, shell i18n, and scaffold guardrails include
  `/settings/help`.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because Help was not an active button route,
  `HelpSupportScreen` had no anatomy, and the navigation contract did not include `/settings/help`.
- The same suite caught one setup mismatch after GREEN implementation: a test expecting active Help
  had omitted the `openHelp` action, so the row correctly rendered as non-interactive in that scenario.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 2 suites, 18 tests.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/app-shell.render.test.tsx`
  — PASS: 2 suites, 16 tests.
- `npm run test:scaffold` — PASS.
- `git diff --check` — PASS.
- `npm run check` — PASS: lint, typecheck, 67 Jest suites / 488 tests, node checks, scaffold
  guardrails, token drift, privacy scan, and text hygiene. Note: the existing reduced-motion
  `act(...)` console warning in `screen-header.render.test.tsx` remains non-failing and unrelated to
  this slice.
- `git diff --check` — PASS.
- `npm run check` — PASS: lint, typecheck, 67 Jest suites / 486 tests, node checks, scaffold
  guardrails, token drift, privacy scan, and text hygiene. Note: the existing reduced-motion
  `act(...)` console warning in `screen-header.render.test.tsx` remains non-failing and unrelated to
  this slice.

Implementation notes:
- Added `src/features/more/screens/HelpSupportScreen.tsx`.
- Added route file `app/(modals)/settings/help/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openHelp`, active Help row, and route wiring from
  `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and scaffold guardrails to include `/settings/help`.
- Stage 4 PASS (2026-07-02): captured native SE screenshots from the installed PuppyPlan.app running
  JS-over-Metro and compared against `docs/design/v1/specs/06-4-more-support-help.md`. Evidence:
  `output/v2-nav-gaps-stage4/settings-help-stage4.png` (top) and
  `output/v2-nav-gaps-stage4/settings-help-stage4-bottom.png` (bottom). The route shows modal back
  header, intro card, three help topic chevron rows, diagnostics rows, contact row, and the visible
  privacy-safe support note. Allowed deferred items remain real support ticket creation, email composer
  handoff, and diagnostics upload.

### 30. PuppyPlan Plus Paywall Shell Slice (§4.4.7)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/06-5-puppyplan-plus-paywall.md`.
- Source: `DESIGN.md` §4.4.7 plus Open Design V2 More/paywall board.
- Route: `/paywall` from the More hub PuppyPlan Plus row.

Acceptance:
- AC-MORE-PLUS-1: More PuppyPlan Plus row is an active chevron row and opens the paywall modal shell.
- AC-MORE-PLUS-2: paywall screen renders modal header, subtitle, three feature rows, annual/monthly/
  lifetime plan rows, primary CTA, Restore purchases, legal copy, and soft-lock information.
- AC-MORE-PLUS-3: annual plan selection is structural with radio/selected state, not color-only.
- AC-MORE-PLUS-4: live IAP, product loading, restore, purchase, entitlement enforcement, and
  RevenueCat/provider wiring remain absent in this shell slice.
- AC-MORE-PLUS-5: route/navigation contract, shell i18n, and scaffold guardrails include `/paywall`.
- AC-MORE-PLUS-6: the skippable early paywall shell renders a subtle trial-days-left status and
  non-nagging note.
- AC-MORE-PLUS-7: the day-30 soft-lock shell renders a read-only write-gate banner while export and
  Restore purchases remain visible actions.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because `PuppyPlanPlusScreen` was missing and `/paywall`
  was absent from modal route and planned route contracts.
- The same suite caught two anatomy/test-contract issues during GREEN: duplicate title copy in the
  shell and a test expecting the selected plan as a button instead of a radio row.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 2 suites, 20 tests.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/app-shell.render.test.tsx`
  — PASS: 2 suites, 16 tests.
- `npm run test:scaffold` — PASS.
- 2026-06-30 follow-up RED: `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  failed as expected before implementation because `paywall.trial-status`,
  `paywall.soft-lock-banner-title`, and the export action were absent from the paywall route.
- 2026-06-30 follow-up GREEN:
  `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  — PASS: 1 suite, 13 tests.
- `npm run typecheck` — PASS.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.

Implementation notes:
- Added `src/features/more/screens/PuppyPlanPlusScreen.tsx`.
- Added route file `app/(modals)/paywall/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openPlus`, active PuppyPlan Plus row, and route wiring from
  `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and scaffold guardrails to include `/paywall`.
- Added feature-flag-ready trial and soft-lock shell states to `PuppyPlanPlusScreen`: the default
  shell shows the trial-days-left status; `accessState="softLocked"` shows the read-only banner and
  export action without introducing live entitlement/provider wiring.
- Stage 4 PASS (2026-07-02): initial SE capture found the modal title truncated as `Puppy...` /
  `PuppyPlan...`. Fixed the shared `ScreenHeader` title lane through RED/GREEN primitive coverage so
  compact modal titles with side controls keep the full `PuppyPlan Plus` header visible. Evidence:
  `output/v2-nav-gaps-stage4/paywall-stage4-top-after-header-flex3.png` (top) and
  `output/v2-nav-gaps-stage4/paywall-stage4-bottom-after-header.png` (bottom). The route shows the
  full modal title, intro/trial status, feature list, annual/monthly/lifetime plan rows, primary CTA,
  Restore purchases, soft-lock info, and legal note. Loading/offline/error/pending purchase, real
  restore, active subscription, and soft-lock enforcement states remain deferred.

### 31. Accept Invite Caregiver-Side Shell Slice (§3.1.4)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-1-accept-invite.md`.
- Source: `DESIGN.md` §3.1.4 plus Open Design V2 sharing boards.
- Route: `/invite/[token]`.

Acceptance:
- AC-SHARE-ACCEPT-1: `/invite/[token]` renders a native caregiver-side accept shell instead of the
  generic revoked/expired placeholder.
- AC-SHARE-ACCEPT-2: the shell shows who invited the viewer, which puppy it concerns, the caregiver
  role, included permissions, excluded/private areas, owner revocation disclosure, Accept, and Decline.
- AC-SHARE-ACCEPT-3: included/excluded states are non-color-only and use design-owned icons, not raw
  glyph strings or local Pressables/Text.
- AC-SHARE-ACCEPT-4: raw invite tokens are never rendered in visible copy.
- AC-SHARE-ACCEPT-5: public token routes remain tracked in navigation contracts without becoming
  primary tabs or production modal routes.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/app-shell.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because `InviteAcceptScreen` did not exist and
  `/invite/[token]` / `/share/[token]` were absent from `plannedRouteFiles`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/app-shell.render.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 2 suites, 18 tests.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/app-shell.render.test.tsx`
  — PASS: 2 suites, 17 tests.
- `npm run test:scaffold` — PASS.
- `npm run check` — PASS: 67 Jest suites / 489 tests, node checks 118/118, scaffold,
  tokens, privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)`
  warning in `src/test/screen-header.render.test.tsx` is unrelated to this slice.
- `git diff --check` — PASS.

Implementation notes:
- Added `src/features/linking/screens/InviteAcceptScreen.tsx`.
- Updated `app/invite/[token].tsx` to render the accept shell through a thin Expo Router wrapper.
- Updated navigation contracts to track `/invite/[token]` and `/share/[token]` as existing public
  token routes.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro using
  synthetic deep link `puppyplan://invite/stage4-preview-token`. Native evidence:
  `output/v2-nav-gaps-stage4/invite-accept-stage4.png`. Visual evidence covers inviter/puppy context,
  caregiver role, included and excluded permission blocks with non-color-only icons, owner revocation
  disclosure, Accept/Decline actions, and no visible raw token. Live token lookup,
  loading/error/already-member/expired states, accept RPC, decline confirmation, and post-accept
  redirect remain deferred.

### 32. Manage Household Shell Slice (§3.1.6)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-2-manage-household.md`.
- Source: `DESIGN.md` §3.1.6 plus `docs/design/v1/specs/07-sharing-access-cards.md`.
- Route: `/settings/household` from the More Family row.

Acceptance:
- AC-SHARE-HOUSEHOLD-1: More Family row is an active chevron row and opens the household settings
  route.
- AC-SHARE-HOUSEHOLD-2: the route renders a native Manage household shell with modal header, members
  section, invitations section, owner row, caregiver row, pending invite row, Invite CTA, and empty
  owner-alone guidance.
- AC-SHARE-HOUSEHOLD-3: member/invite states are non-color-only through visible role/status badges
  and icon affordances.
- AC-SHARE-HOUSEHOLD-4: pending invite preview does not render raw email addresses or invite tokens.
- AC-SHARE-HOUSEHOLD-5: route/navigation contract, shell i18n, and scaffold guardrails include
  `/settings/household`.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because `HouseholdAccessScreen` did not exist and
  `/settings/household` was absent from `settingsRoutes` / `plannedRouteFiles`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts src/test/i18n.test.ts`
  — PASS: 3 suites, 30 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `git diff --check` — PASS.
- `npm run check` — PASS: 67 Jest suites / 490 tests, node checks 118/118, scaffold, tokens,
  privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)` warning
  in `src/test/screen-header.render.test.tsx` is unrelated to this slice.

Implementation notes:
- Added `src/features/more/screens/HouseholdAccessScreen.tsx`.
- Added route file `app/(modals)/settings/household/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openHousehold`, active Family row, and route wiring from
  `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and scaffold guardrails to include `/settings/household`.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro. Native
  evidence:
  `output/v2-nav-gaps-stage4/settings-household-top-stage4.png`,
  `output/v2-nav-gaps-stage4/settings-household-bottom-stage4.png`. Visual evidence covers the modal
  header, intro card, owner row, caregiver row, pending invite row, role/status badges, overflow
  affordances, privacy-safe pending invite label, owner-alone guidance card, and Invite CTA. Live
  member/invite queries, role changes, access removal, resend/revoke actions, and confirm sheets
  remain deferred.

### 33. Trusted Sitter Mode Owner Shell Slice (§3.2)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-sharing-access-cards.md`.
- Source: `DESIGN.md` §3.2.1 Enable Sitter Mode.
- Route: `/settings/sitter-mode` from the More Trainer / sitter row.

Acceptance:
- AC-SITTER-MODE-1: More Trainer / sitter row is active and opens the sitter mode settings route.
- AC-SITTER-MODE-2: the route renders a native owner-side sitter setup shell with title, hero copy,
  caregiver row, time window rows, five checklist rows, visibility preview, disclosure, and enable CTA.
- AC-SITTER-MODE-3: checklist selection and visibility states are non-color-only through visible icons.
- AC-SITTER-MODE-4: the shell uses existing design primitives, typed EN/RU/ES i18n keys, and no raw
  email, invite token, provider, or private contact data.
- AC-SITTER-MODE-5: route/navigation contract, shell i18n, and scaffold guardrails include
  `/settings/sitter-mode`.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because `SitterModeScreen` did not exist and
  `/settings/sitter-mode` was absent from `settingsRoutes` / `plannedRouteFiles`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 2 suites, 22 tests.
- `npm run typecheck` — PASS.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.

Implementation notes:
- Added `src/features/more/screens/SitterModeScreen.tsx`.
- Added route file `app/(modals)/settings/sitter-mode/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openSitterMode` and route wiring from `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and scaffold guardrails to include `/settings/sitter-mode`.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro. Native
  evidence:
  `output/v2-nav-gaps-stage4/settings-sitter-mode-stage4.png`,
  `output/v2-nav-gaps-stage4/settings-sitter-mode-bottom-stage4.png`. Visual evidence covers the modal
  header, hero copy, caregiver row, time window rows, checklist selected/unselected icon states,
  visibility preview included/excluded icon states, disclosure, and enable CTA. Real caregiver
  selection, date/time picker, checklist editing, enable mutation, active owner status, completion
  push, auto-expire, and exit confirm remain deferred.

### 34. Shareable Puppy Card Shell Slice (§3.4)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-sharing-access-cards.md`.
- Source: `DESIGN.md` §3.4 plus `cards/*` atlas references in the V2 sharing boards.
- Route: `/sharing/puppy-card` from the More sharing section.
- Allowed deviation: rich builder, multi-template editor, live signed-link creation, expiry editing,
  and revoke flows are roadmap/deferred; this slice is the minimal static/signed-link shell.

Acceptance:
- AC-SHARE-CARD-1: More exposes an active Shared cards row that opens `/sharing/puppy-card`.
- AC-SHARE-CARD-2: the route renders a native shell with modal header, builder field list, health
  disclosure, 3:4 preview, share CTA, public-link disclosure, and active shared-card row.
- AC-SHARE-CARD-3: preview aspect ratio is structurally locked to 3:4.
- AC-SHARE-CARD-4: the shell uses design primitives, typed EN/RU/ES i18n keys, and tokenized styles.
- AC-SHARE-CARD-5: the shell renders no raw email, provider name, invite/share token, or private
  contact data.
- AC-SHARE-CARD-6: route/navigation contract, shell i18n, and scaffold guardrails include
  `/sharing/puppy-card`.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because `ShareablePuppyCardScreen` was missing and
  `/sharing/puppy-card` was absent from the planned route contract.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 2 suites, 24 tests.
- `npm run typecheck` — PASS.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `git diff --check` — PASS.
- `npm run check` — PASS: 67 Jest suites / 495 tests, node checks 118/118, scaffold, tokens,
  privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)` warning
  in `src/test/screen-header.render.test.tsx` is unrelated to this slice.
- Changed-file raw color scan found no `hex` / `rgb` / raw `backgroundColor` / raw `color` literals.

Implementation notes:
- Added `src/features/more/screens/ShareablePuppyCardScreen.tsx`.
- Added route file `app/(modals)/sharing/puppy-card/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openShareableCards` and route wiring from `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and shell i18n allowlist to include `/sharing/puppy-card` and the
  card preview keys.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro. Native
  evidence:
  `output/v2-nav-gaps-stage4/sharing-puppy-card-top-stage4.png`,
  `output/v2-nav-gaps-stage4/sharing-puppy-card-middle-stage4.png`. Visual evidence covers the modal
  header, hero card, builder field list, health disclosure, 3:4 preview anatomy, Share CTA,
  public-link disclosure, and active shared-card row without raw email, provider, invite/share token,
  or private contact data. Live signed-link creation, real share sheet, expiry editing, copy-link,
  revoke/extend, card history, loading/error/offline states, and public web projection remain
  deferred.

### 35. Guidance Active-UI Deferral Reconciliation (§4.3)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/08-deferred-reference.md`.
- Source: `docs/plans/active/2026-06-27-diary-pet-nav-design-brief.md` §0.6 / §11, plus
  `docs/design/v1/specs/03-diary-route.md` contextual tip slot.
- Allowed active surface: at most one lightweight Diary contextual tip. No Guidance tab, no broad
  training library, and no read/practiced/skip card states in this wave.

Acceptance:
- AC-GUIDANCE-DEF-1: `buildTodayPlan` emits `guidanceCard: null` for active V2 Diary plans.
- AC-GUIDANCE-DEF-2: `TodayPlanCards` does not render `today-guidance-card`, even if a legacy plan
  payload contains a `guidanceCard`.
- AC-GUIDANCE-DEF-3: active Diary render tests assert absence of Read / Tried it / Skip guidance
  actions.
- AC-GUIDANCE-DEF-4: local starter guidance content/contracts may remain as deferred reference
  material, but no production Diary UI consumes them in this wave.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/today-prioritization.test.ts src/test/today-core.render.test.tsx`
  failed as expected before implementation because `buildTodayPlan` emitted a `guidanceCard` and
  Diary rendered `today-guidance-card`.
- Follow-up RED with `src/test/guidance.render.test.tsx` also failed because direct legacy
  `TodayPlanCards` input still rendered the active read/practiced/skip card.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/today-prioritization.test.ts src/test/today-core.render.test.tsx src/test/guidance.render.test.tsx`
  — PASS: 3 suites, 23 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `git diff --check` — PASS.
- `npm run check` — PASS: 67 Jest suites / 495 tests, node checks 118/118, scaffold, tokens,
  privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)` warning
  in `src/test/screen-header.render.test.tsx` is unrelated to this slice.
- Changed-file raw style scan found no `hex` / `rgb` / raw color literals or numeric padding/margin
  literals in the touched Today/Diary files after tokenizing the existing info banner spacing.

Implementation notes:
- `buildTodayPlan` now always returns `guidanceCard: null`; the nullable schema remains for legacy
  shape compatibility and future approved guidance work.
- `TodayPlanCards` ignores `plan.guidanceCard`, and the old interactive `StarterGuidanceCard` /
  `GuidanceTopicDetail` active UI was removed from `TodayCards.tsx`.
- `src/test/guidance.render.test.tsx` now locks the deferral behavior instead of locking the old
  read/practiced/skip interactions.
- No Stage 4 screenshot is required for the deferred guidance UI; Stage 4 for the remaining allowed
  contextual tip slot stays covered under the Diary route screenshot backlog.

### 36. Cross-Cutting V2 TabBar + Pet Deferred-Scope Reconciliation

Stage-0 lock:
- Navigation spec: `docs/design/v1/specs/01-navigation-add.md`.
- Pet/Health spec: `docs/design/v1/specs/05-pet-health.md`.
- Source canon: `DESIGN.md` V2 redesign override and `puppyplan-prd-v2.md` MVP/deferred scope.

Acceptance:
- AC-XCUT-NAV-1: the Expo tabs layout delegates bottom navigation chrome to `CapsuleTabBar`.
- AC-XCUT-NAV-2: visible primary tabs remain exactly Diary, Pet, More; legacy Today/Health routes are
  registered only as hidden redirect aliases through `href:null`.
- AC-XCUT-NAV-3: the V1 tab-layout tests no longer assert a persistent bottom-right Quick Log FAB;
  Add-open behavior is covered by the `CapsuleTabBar` anatomy tests instead.
- AC-XCUT-NAV-4: no default full-width tab bar or absolute bottom-right FAB remains under
  `app/(tabs)`.
- AC-XCUT-PET-1: multi-pet/foster, standalone Health tab, health charts/milestones, and
  medication/refill remain closed as explicit out-of-wave scope, not native implementation work.

Evidence:
- `app/(tabs)/_layout.tsx` passes `tabBar={(props) => <CapsuleTabBar {...props} />}` to Expo Router.
- `src/test/tab-layout.render.test.tsx` asserts visible routes equal `primaryTabs`, hidden legacy
  routes are `today/index` and `health/index` with `href:null`, canonical icons are book/paw/more,
  active tint is `tokens.color.primary[700]`, and bottom chrome is delegated to `CapsuleTabBar`.
- `src/test/capsule-tab-bar.render.test.tsx` asserts T1-T7 anatomy, Add outside the tablist,
  detached capsule, capsule removal while chooser is open, scrim + two slabs, slab routing, reduced
  motion, haptics, and stable in-place Add morph.
- `rg "<FAB|isFabLogSurfacePath|tabBarStyle" app/(tabs) src/test/tab-layout.render.test.tsx`
  returns no V1 tab-shell implementation or stale tab-layout assertions.
- `rg "medication/refill|Medication card|multi-pet|standalone Health|charts" docs/design/v1/specs/05-pet-health.md docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md puppyplan-prd-v2.md docs/architecture/01-principles-and-scope.md`
  confirms these Pet/Health depth items are deferred/out-of-wave.

Verification:
- `npm run test:unit -- --runTestsByPath src/test/tab-layout.render.test.tsx src/test/capsule-tab-bar.render.test.tsx src/test/legacy-tab-route-redirects.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 4 suites, 28 tests.

Notes:
- The remaining `FAB` primitive usage in `src/features/onboarding/screens/OnboardingScreen.tsx` is not
  a migrated tab-shell FAB. It belongs to the onboarding first-log preview, whose spec allows the V2
  separate Add/FAB action while the wizard itself stays outside the tab shell.
- This reconciliation does not close Stage 4 screenshot backlogs for individual screens; it only closes
  the stale cross-cutting "old nav still applied" matrix row and the explicitly deferred Pet/Health
  depth rows.

### 37. Quick Log Pending Route Coverage (§2.3.9)

Stage-0 lock:
- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Source canon: `DESIGN.md` §2.3.9 Pending/failed/retry.
- Route/component: `/quick-log`, `QuickLogShell`, `QuickLogLocalEvents`.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.

Acceptance:
- AC-QL-2.3.9-PENDING-1: when the route receives a `started` Quick Log mutation event before
  `useQuickLogCachedRows` refreshes, the sheet renders an inline pending row for the affected tracker.
- AC-QL-2.3.9-PENDING-2: the pending row uses the existing localized pending label and
  `quick-log-local-event-pending-card` anatomy hook.
- AC-QL-2.3.9-PENDING-3: the inline pending Undo action calls the mutation undo port with the active
  care context (`clientEventId`, `eventType`, `householdId`, `puppyId`, `todayDate`).
- AC-QL-2.3.9-PENDING-4: mutation-event rows merge with cached local rows by `clientEventId` so the
  route does not duplicate the same pending/failed event.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx`
  failed as expected before implementation: `Unable to find an element with testID:
  quick-log-local-event-pending-card`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx`
  — PASS: 1 suite, 8 tests.
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx src/test/quick-log-sheet.render.test.tsx src/test/quick-log-local-events.render.test.tsx`
  — PASS: 3 suites, 27 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, token drift check, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, 67 Jest suites / 497 tests, node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.

Implementation notes:
- `src/features/quick-log/screens/QuickLogShell.tsx` now maps `started` mutation events to
  pending `QuickLogLocalEventView` rows using the active care context and existing tracker i18n keys.
- The same mapping keeps failed mutation events on the failed-row path if cache rows have not refreshed.
- Cached local rows and mutation-event rows are merged by `clientEventId`, with the latest mutation event
  overriding a stale cached row for the same event.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator from the temporary Quick Log
  pending/failed route harness noted in §12. Native evidence:
  `output/v2-nav-gaps-stage4/quick-log-pending-failed-harness-stage4.png`.

## Changelog
- 2026-07-02: Closed Quick Log snackbar/undo Stage 4: added RED/GREEN coverage that active
  snackbar messages render through `FullWindowOverlay` above native-stack screens, captured production
  SE evidence at
  `output/v2-nav-gaps-stage4/quick-log-production-snackbar-full-window-fast3-stage4.png`, and verified
  the visible success surface carries `Logged · Feeding`, `Undo`, and `Add details`.
- 2026-07-02: Closed the remaining Onboarding First Log snackbar Stage 4 gap after the shared
  `FullWindowOverlay` snackbar fix: captured native SE evidence at
  `output/v2-nav-gaps-stage4/onboarding-first-log-snackbar-full-window-direct-stage4.png` with the
  first-value Diary preview and visible `Done. You can keep going.` celebration snackbar.
- 2026-07-02: Closed Quick Log Stage 4 for duplicate warning and pending/failed inline rows:
  production route screenshots verify the default sheet and duplicate warning; a temporary restored
  dev-route harness verifies pending and failed local rows. The snackbar visual gap is now closed by
  the follow-up `FullWindowOverlay` fix above.
- 2026-07-01: Closed Quick Log §2.3.9 pending route coverage: `started` mutation events now render
  inline pending rows before cached rows refresh, reuse existing pending-row anatomy/i18n, and wire
  Undo through the active care context. RED/GREEN route tests and adjacent Quick Log render suites pass;
  Stage 4 screenshot comparison remains open.
- 2026-07-01: Reconciled the cross-cutting V2 TabBar row and Pet deferred-scope rows with current
  code/spec evidence: `app/(tabs)` now delegates to `CapsuleTabBar`, Today/Health aliases are hidden,
  V1 FAB tab-layout assertions are retired, the focused nav suites pass 28/28, and multi-pet,
  standalone Health, charts/milestones, and medication/refill are closed as explicit out-of-wave scope.
- 2026-07-01: Reconciled Guidance §4.3 with the locked V2 nav wave: active Diary no longer emits or
  renders `guidanceCard` / read-practiced-skip states, while guidance content/contracts remain only
  as deferred reference. Targeted RED/GREEN suites, typecheck, scaffold checks, diff whitespace, and
  raw-style scan passed; Diary contextual-tip Stage 4 remains part of the Diary screenshot backlog.
- 2026-06-30: Added the Shareable Puppy Card shell: More now opens `/sharing/puppy-card`, the route
  renders builder fields, health disclosure, 3:4 preview, share CTA, public-link disclosure, and an
  active-card row with privacy-safe sample data; route/i18n/scaffold contracts were updated. Live
  signed-link creation, real share sheet, revoke/extend/history states, and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/sharing/puppy-card`: captured native SE top/middle screenshots
  from the installed PuppyPlan.app over Metro and verified the modal header, builder fields, health
  disclosure, locked 3:4 preview anatomy, Share CTA, public-link disclosure, active-card row, and
  privacy-safe visible copy. Live signed-link and share operations remain deferred.
- 2026-06-30: Added the Trusted Sitter mode owner setup shell: More Trainer / sitter now opens
  `/settings/sitter-mode`, with caregiver row, time window rows, checklist anatomy, included/excluded
  visibility preview, disclosure, and enable CTA. Live sitter data/mutations, owner active status,
  completion push, auto-expire, exit confirm, and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/settings/sitter-mode`: captured native SE top/bottom screenshots
  from the installed PuppyPlan.app over Metro and verified the owner-side setup shell, caregiver row,
  time window, selected/unselected checklist icons, visibility included/excluded icons, disclosure,
  and enable CTA. Live sitter data and mutations remain deferred.
- 2026-06-30: Added PuppyPlan Plus trial/soft-lock shell states: default `/paywall` now shows a
  subtle trial-days-left status and note; synthetic `accessState="softLocked"` renders the read-only
  write-gate banner with export and Restore purchases still reachable. Live entitlement enforcement,
  purchase/restore, and Stage 4 screenshots remain open.
- 2026-06-30: Added the Manage Household shell: More Family now opens `/settings/household`, with
  owner/caregiver rows, pending invite row, role/status badges, overflow affordances, privacy-safe
  invite labeling, and Invite CTA. Live member queries, role changes, removal, invite actions,
  confirm sheets, and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/settings/household`: captured native SE top/bottom screenshots
  from the installed PuppyPlan.app over Metro and verified the modal header, intro card, household
  member rows, pending invite row, non-color-only status badges, overflow affordances, guidance card,
  privacy-safe invite label, and Invite CTA. Live member/invite operations remain deferred.
- 2026-06-30: Added the caregiver-side Accept Invite shell: `/invite/[token]` now renders
  inviter/puppy context, caregiver role, included/excluded preview, disclosure, and Accept/Decline
  actions without exposing raw invite tokens; public token routes are tracked in navigation
  contracts. Live token lookup, accept/decline RPCs, already-member/expired states, post-accept
  redirect, and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/invite/[token]`: captured a native SE screenshot from the
  installed PuppyPlan.app over Metro using a synthetic invite deep link and verified the caregiver
  role shell, included/excluded permission anatomy, owner revocation disclosure, Accept/Decline
  actions, and token-safe visible copy. Live token lookup and accept/decline flows remain deferred.
- 2026-06-29: Initial coverage/gap analysis from board `uXjVL0aEXPU=` (source) vs `uXjVHA5hn48=`
  (freeze) cross-referenced against DESIGN.md.
- 2026-06-29: Resolved §5 decisions (Events→Diary, Health lightweight+CRUD, Onboarding now,
  Shareable Cards in-scope; theme pending).
- 2026-06-29: Monetization decided — **time-gated soft-lock** (30-day full free trial, skippable
  paywall → writes gated by subscription, read-only+export always free, trainer link stays live).
  Plans: Annual $39.99 / Monthly $8.99 / Lifetime ~$79–99. Replaces PRD §8 feature-freemium
  (per-feature gating questions dropped). Supersedes the earlier 3-agent freemium proposal.
- 2026-06-29: Theme decided — **B · Minimal canonical**, Dusk → accents + future dark mode (rendered
  both for comparison). Primary CTA = **terracotta `#c96442`** → update DESIGN.md §2.3/2.4 (was Calm Teal).
- 2026-06-29: Applied review feedback — (1) multi-pet switcher → 🚫 (Deferred per PRD/arch); (2) added
  explicit write taxonomy + always-allowed list (export/delete/privacy/revoke/restore/sign-out never
  gated); (3) softened RevenueCat 5× claim (our model isn't a hard paywall); (4) pinned trial-clock
  anchor (first durable puppy `household.created_at`); (5) Shareable Cards scoped to minimal signed-link
  only; (6) added scope boundary — monetization *model* decided but live *enforcement* deferred until
  beta-retention (PRD §1 / arch Deferred); (7) fixed canon refs — monetization policy = PRD §8 (DESIGN
  §8 is Haptics), paywall = DESIGN §4.4.7 + its Free/Premium block needs rewrite; (8) resolved stale
  "Pick a theme" matrix line; Guidance §4.3 marked ❓ pending brief check.
- 2026-06-30: Implemented first plan batch: reconciled canon docs for Terracotta Clay primary,
  time-gated trial → write soft-lock monetization, and entitlement taxonomy; created
  `docs/design/v1/specs/v2-redesign-lock-package.md` plus eight section spec cards covering the
  expanded 88-board Codex Design handoff.
- 2026-06-30: Updated the Codex/Open Design project itself: added the top all-board coverage map,
  `handoff-manifest.json`, refreshed `critique.json`, sanitized real-looking caregiver placeholders,
  and verified rendered DOM coverage for all 88 boards / 176 previews.
- 2026-06-30: Re-verified the Codex/Open Design preview in a real browser after the user's viewport
  concern: Playwright snapshot and full-page screenshot confirm the complete 88-board / 176-preview
  handoff is present in the main canvas.
- 2026-06-30: Repacked the Codex/Open Design entry as a static complete handoff for Claude Design/Miro:
  `index.html` and `miro-complete.html` now contain all 88 boards / 176 native previews directly;
  `index.dynamic.html` keeps the previous JS-rendered source.
- 2026-06-30: Implemented and verified the native route-label/icon slice: Diary/Pet/More primary tabs,
  book/paw/more icon contract, first-log Diary selection, V2 shell/string scaffold guardrails, and
  full `npm run check` pass. Stage 4 per-screen native screenshot comparison remains open.
- 2026-06-30: Split the Diary section card into `03-diary-route.md` so the next native Diary
  implementation pass has a route-specific Stage-0 lock before code.
- 2026-06-30: Added the first native Diary anatomy slice from the lock: seven-day week strip with
  separate selected/today states, i18n/shell contract coverage, RED/GREEN render test, and full
  `npm run check` pass. Re-checked the Open Design static handoff directly in the project directory:
  both `index.html` and `miro-complete.html` contain all 88 boards and 176 iOS/Android previews.
- 2026-06-30: Fixed the Open/Codex Design legacy canvas entry that matched the user's partial-canvas
  screenshot: `mqxri78o-Canvas.dc.html` is no longer a redirect page and now contains the same complete
  static 88-board / 176-preview handoff as `index.html`; fresh DOM + headless Chrome verification passed.
- 2026-06-30: Added the Diary history language slice: embedded history now says `Diary history` /
  `Review history` and the Diary card copy no longer exposes standalone Timeline wording; RED/GREEN
  render coverage and full `npm run check` pass recorded.
- 2026-06-30: Added the first Diary item-anatomy slice: synced logged facts hide the visible synced
  pill in embedded Diary history while pending/failed states remain visible and actionable; RED/GREEN
  render coverage and full `npm run check` pass recorded.
- 2026-06-30: Added the next Diary item-anatomy slice: embedded Diary history logged facts now use
  the quiet/sunken `mutedTemplate` card surface with a structural render assertion for
  `tokens.color.surface.sunken`; targeted Diary tests, typecheck, scaffold checks, and full
  `npm run check` pass.
- 2026-06-30: Added the Diary synced-item action slice: synced logged facts now have a 44pt+
  `IconButton` overflow/edit affordance wired through `createQuickLogEditRequest`, with EN/RU/ES
  `today.history.item-actions` copy and RED/GREEN render coverage.
- 2026-06-30: Added the Diary past-unchecked-reminder language slice: synthetic reminder preview
  copy no longer exposes visible `missed reminder` / shame language, with RED/GREEN render coverage,
  i18n parity, typecheck, and scaffold checks.
- 2026-06-30: Added the Diary accident-recovery / after-feeding contextual anatomy slice: normal
  Diary hero eyebrow copy moved off legacy `Today`, feeding-pattern now renders as a soft contextual
  tip (`diary-contextual-tip-card` / `mutedTemplate`), and RED/GREEN render coverage plus full
  `npm run check` pass were recorded.
- 2026-06-30: Added the Diary all-done state slice: synthetic `screenState="all-done"` renders a
  calm completed status card with EN/RU/ES copy, RED/GREEN render coverage, and full `npm run check`
  pass.
- 2026-06-30: Added the Diary empty-with-history state slice: synthetic `screenState="empty-history"`
  renders the locked quiet-day status without falling back to first-day onboarding, with EN/RU/ES copy
  and RED/GREEN render coverage plus full `npm run check` pass.
- 2026-06-30: Added the Diary cold-start state slice: synthetic `screenState="cold-start"` renders
  the locked no-logs/no-routines setup status without falling back to first-day onboarding, with
  EN/RU/ES copy and RED/GREEN render coverage plus full `npm run check` pass.
- 2026-06-30: Added the Diary synthetic pending-write state slice: `screenState="pending-write"` now
  renders the locked pending-write status without requiring queued local rows, with RED/GREEN render
  coverage and full `npm run check` pass recorded.
- 2026-06-30: Added the synced Diary item delete-action slice: synced logged facts now expose a
  localized destructive delete action wired through `createQuickLogDeleteRequest`, with RED/GREEN
  render coverage, shell i18n allowlist coverage, and full `npm run check` pass recorded.
- 2026-06-30: Added the Quick Log duplicate-warning anatomy slice: duplicate detection now renders
  a warning-tinted card with a warning glyph and localized save-anyway/cancel actions, while blocking
  mutation until explicit confirmation; targeted Quick Log + design primitive suites and full
  `npm run check` pass.
- 2026-06-30: Added the Quick Log failed-save row anatomy slice: failed local rows now have a
  structural failed-card hook, muted danger tint/border, non-color-only failed status pill, and
  inline retry/discard controls; targeted local/sheet suites and full `npm run check` pass.
- 2026-06-30: Added the Quick Log snackbar/undo after-tap slice: the route-level success snackbar
  anatomy is locked, shared Snackbar accepts haptic feedback metadata, normal Quick Log saves use
  `saveSuccess`, failed replacements use `error`, and targeted/full checks passed.
- 2026-06-30: Reconciled the Quick Trackers settings/Edit Trackers plan item with the implemented
  native route: Quick Log and More both open `/settings/quick-trackers`, atlas-style implicit-save
  rows are covered by render tests, and `training` remains deferred by the accepted canonical tracker
  taxonomy rather than added as an unapproved schema delta.
- 2026-07-02: Closed Stage 4 for `/settings/quick-trackers`: captured a native SE screenshot from the
  installed PuppyPlan.app over Metro and verified the modal header, max-5 guidance, selected count,
  selected tracker rows with reorder handles/icons/toggles, More Options rows, history-preservation
  hint, and absence of a bottom Save CTA against the locked acceptance. The live owner state showed
  3 of 5 selected; max-reached hint remains covered by render tests.
- 2026-06-30: Added and verified the Pet tab landing/hub native anatomy slice: `/pet` now shows a
  profile hub before lightweight Health, includes avatar/profile facts/Edit/Add weight, and routes
  the Quick Trackers entry to `/settings/quick-trackers`; targeted Pet/i18n/navigation tests and
  full `npm run check` passed. Stage 4 screenshot comparison remains open.
- 2026-07-02: Closed Stage 4 for `/pet` landing/hub production state: captured top and scrolled native
  SE screenshots from the installed PuppyPlan.app over Metro, verifying the Pet title, neutral profile
  placeholder, age/breed/weight facts, Edit profile, Add weight, Quick Trackers entry, health filters,
  empty Health state, Add entry, disabled Browse templates, and non-diagnostic footer copy without
  bottom-chrome overlap. Mixed health list, add-record modal, detail/delete, and vet-prep Stage 4
  remain separate items.
- 2026-06-30: Added the first Health Add Record route slice: empty Pet Health can open
  `/pet/health-record-edit`, the modal shows a native record-type chooser and then the health record
  form anatomy, shell i18n/typed-route contracts were updated, and targeted/typecheck/scaffold checks
  plus full `npm run check` passed. Save/persistence/loading/error/offline/edit/delete remain open.
- 2026-07-02: Closed Stage 4 for `/pet/health-record-edit`: fixed the static `Card` accessibility
  contract so labelled containers no longer collapse nested controls in native snapshots, then captured
  native SE chooser and form screenshots over Metro. Chooser targets (`Vaccination`, `Parasite treatment`,
  `Preventive care`, `Vet visit`, `Close`) are exposed to the runtime snapshot; form top/bottom evidence
  covers Cancel/New entry/disabled Save, main fields, status control, note/privacy copy, and urgent toggle.
  Save/persistence/loading/error/offline states remain open.
- 2026-06-30: Added the Health detail status/delete anatomy slice: record detail now shows a
  non-color-only four-step status strip with one active filled state, and delete pending shows the
  localized undo-toast preview; targeted health tests, typecheck, scaffold checks, related route/i18n
  suites, and full `npm run check` passed. Real timed undo restore/persistence and Stage 4 screenshots
  remain open.
- 2026-07-02: Closed Stage 4 for Health detail status/delete: captured native SE confirmed,
  needs-vet-review, stage-strip, and delete-pending screenshots from the synthetic health preview over
  Metro. Evidence covers noun status pills, detail rows, four icon+label stage steps with exactly one
  active filled state, aggregate stage accessibility labels in runtime snapshot, busy delete action,
  confirm card, disabled destructive button, and undo-toast preview. Durable edit/delete persistence,
  warning haptic, and timed restore remain open.
- 2026-06-30: Added the Vet Visit Prep card anatomy slice inside Pet Health: localized visit subtitle,
  four 36pt+ checklist rows, Add item affordance, and non-instruction disclaimer; RED/GREEN health
  render coverage, related route/i18n suites, typecheck, scaffold checks, and full `npm run check`
  passed. Real checklist editing/data wiring and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for the `/pet` vet-prep state: captured native SE evidence over Metro
  showing the Health list context, vet-prep title/subtitle, all four checklist rows, Add item affordance,
  and non-instruction/non-medical-advice footer copy. Real checklist editing, actual visit data,
  item completion state, and notifications remain open.
- 2026-07-02: Closed Stage 4 for `/reminders/edit` create/edit, quiet-hours, and permission-denied
  anatomy: captured native SE top/form/quiet/permission screenshots from the installed PuppyPlan.app
  over Metro, with runtime snapshot evidence for the modal actions, disabled Save, category selector,
  time/repeat/timezone rows, toggles, quiet-hours range/per-puppy control, permission CTA, and fallback
  copy. Sitter checklist Stage 4 remains separate.
- 2026-07-02: Closed Stage 4 for the trusted-sitter checklist reminder card inside `/reminders/edit`:
  captured native SE evidence for the source label, person icon slot, left accent rail, evening
  checklist title, privacy-safe caregiver label, progress bar, and Open checklist / Mark all done /
  Skip actions. Real sitter checklist data, completion push, and pending-sync state remain open.
- 2026-07-02: Closed Stage 4 for `/onboarding` Welcome: restarted the installed PuppyPlan.app over
  Metro, captured clean native SE evidence for the decorative warm illustration frame, locked H1,
  subtitle, primary Get started CTA, and secondary sign-in action, and verified the runtime snapshot
  no longer included stale Reminders modal targets.
- 2026-07-02: Closed Stage 4 for the `/onboarding` Age Hint slice: captured native SE filled-profile
  evidence over Metro showing Step 2 chrome, privacy-safe synthetic name input, Age/Birth date
  segmented control, 8-week stepper, info-tinted age hint, and enabled Continue action without keyboard
  overlay.
- 2026-07-02: Closed Stage 4 for `/onboarding` Puppy Setup default/filled/error states: captured native
  SE evidence for disabled-until-name default, filled age-stepper/age-hint state, and future birth-date
  validation error. Real platform DatePicker replacement remains open.
- 2026-07-02: Closed Stage 4 for `/onboarding` Quick Tracker Selection: captured native SE selected
  and zero-selected states over Metro, verifying Step 3 chrome, helper copy, selected checkmarks,
  selected/unselected accessibility labels in runtime snapshot, counter changes from 5/5 to 0/5, and
  the zero-state `Skip selection` CTA without a minimum-warning alert.
- 2026-07-02: Closed Stage 4 for `/onboarding` Plan Reveal: captured native SE evidence over Metro
  after the debug-account tracker flow, verifying the puppy summary row, title/supporting copy,
  Honey/accent first-log hero card, three separate starter cards, and bottom `Start your first log`
  CTA.
- 2026-06-30: Added the Reminder edit route anatomy slice: `/reminders/edit` now renders the create/edit
  form, quiet-hours preview, and calm permission-denied state with design primitives and existing
  localized copy; RED/GREEN route/navigation tests, typecheck, and scaffold checks passed. Real
  scheduling/persistence/permission deeplink and Stage 4 screenshots remain open.
- 2026-06-30: Added the trusted-sitter checklist reminder anatomy slice inside `/reminders/edit`:
  source label, person icon slot, left accent rail, 1/3 progress bar, and localized Open checklist /
  Mark all done / Skip actions; RED/GREEN route coverage and related i18n/navigation suites passed.
  Real sitter data, completion push, pending-sync state, and Stage 4 screenshots remain open.
- 2026-06-30: Re-checked the Codex/Open Design full handoff after the user's visibility concern:
  default `index.html` and all portable aliases contain the static complete canvas; direct preview
  audit found 88 unique iOS screens, 88 unique Android screens, 352 total preview nodes across the
  compact contact sheet plus full-size boards, and no missing required surfaces.
- 2026-06-30: Added the first Onboarding re-skin slice: `/onboarding` Welcome now has a locked
  native illustration frame, H1/subtitle/primary CTA anatomy, and a real secondary sign-in action
  wired to `/sign-in`; RED/GREEN onboarding tests, related route/i18n suites, typecheck, and scaffold
  checks plus full `npm run check` passed. Puppy setup, age hint, tracker picker, plan reveal, first
  log, prompts, and Stage 4 screenshots remain open.
- 2026-06-30: Added the Onboarding Age Hint native anatomy slice: Puppy Setup now shows the inline
  age hint card before tracker selection with an info icon, status info tint, localized age copy, and
  accessible `Hint. …` label; RED/GREEN onboarding render coverage plus full `npm run check` passed.
  Full Puppy Setup re-skin and Stage 4 screenshots remain open.
- 2026-06-30: Added the Onboarding Puppy Setup chrome/stepper anatomy slice: profile step now has
  localized back/step chrome, explicit Age section label, tokenized age stepper with adjustable a11y,
  disabled-until-name Continue, and a birth-date date-zone wrapper. RED/GREEN onboarding coverage,
  i18n parity, typecheck, scaffold checks, and full `npm run check` passed. Real platform DatePicker
  and Stage 4 screenshots remain open.
- 2026-06-30: Added the Onboarding Quick Tracker Selection anatomy slice: tracker step now has
  localized Step 3 chrome, tracker helper copy, selected checkmarks, selected/unselected tile a11y,
  zero-selected `Skip selection`, and skip-to-default save normalization. RED/GREEN onboarding
  coverage, i18n/design primitive suites, typecheck, scaffold checks, and full `npm run check` passed.
  Stage 4 screenshots remain open.
- 2026-06-30: Added the Onboarding Plan Reveal anatomy slice: plan step now has the locked puppy
  summary row, accent 96pt HeroCard, three separate starter action cards, and bottom first-log CTA.
  RED/GREEN onboarding coverage, i18n parity, typecheck, scaffold checks, diff whitespace check, and
  full `npm run check` passed. Stage 4 screenshots remain open.
- 2026-06-30: Added the Onboarding First Log anatomy slice: first-value preview now lands in Diary
  chrome with pending/local-only state, no legacy Today copy, and a design Snackbar celebration.
  RED/GREEN onboarding coverage, i18n parity, typecheck, dev-gallery regression coverage, scaffold
  checks, diff whitespace check, and full `npm run check` passed. Stage 4 screenshots remain open.
- 2026-07-02: Added partial Stage 4 native evidence for Onboarding First Log: primary SE simulator
  screenshots verify Diary-selected chrome, Pet/More tabs, separate Quick Log FAB, pending/local-only
  first event state, Diary copy, and absence of account/notification pressure. Transient celebration
  snackbar visual capture remains open after dev-gallery and temporary route-harness attempts; render
  tests continue to cover the Snackbar primitive contract and celebration haptic metadata.
- 2026-06-30: Reconciled the Onboarding Account/Notifications prompt slice as implemented and verified:
  skippable account and quiet-reminder SheetSurface previews pass onboarding anatomy coverage, with
  scheduler / OS permission handoff and Stage 4 screenshots still open.
- 2026-07-02: Closed Stage 4 for the Onboarding Account/Notifications prompt previews: captured clean
  native SE screenshots from the installed PuppyPlan.app over Metro for the account sheet and quiet
  reminder sheet, verifying the skippable SheetSurface anatomy and required actions. Runtime scheduler
  and OS permission handoff remain deferred.
- 2026-06-30: Added the More Notification Preferences anatomy slice: More now opens
  `/settings/notifications`, the screen renders local reminders, push reminders/sitter completion,
  quiet hours, and timezone sections with design primitives, navigation/scaffold contracts were updated,
  and full `npm run check` passed. Persistence, OS permission handoff, and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/settings/notifications`: captured a native SE screenshot from the
  installed PuppyPlan.app over Metro and verified the modal header, local reminders toggle, push
  reminders/sitter completion toggles, quiet-hours row, and timezone row against the locked More
  notification preferences anatomy. Persistence and OS permission handoff remain deferred.
- 2026-06-30: Added the More Support / Help anatomy slice: More now opens `/settings/help`, the
  screen renders topic shortcuts, diagnostics rows, contact affordance, and a privacy-safe support
  note with EN/RU/ES typed copy; navigation/scaffold contracts were updated, and full `npm run check`
  passed. Real support ticket/email handoff, diagnostics upload, and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/settings/help`: captured top and bottom native screenshots on the
  required SE simulator from the installed PuppyPlan.app over Metro, verified the modal header, intro
  card, topic rows, diagnostics/contact rows, and visible privacy note against
  `docs/design/v1/specs/06-4-more-support-help.md`. Real ticket/email handoff and diagnostics upload
  remain deferred.
- 2026-06-30: Added the PuppyPlan Plus paywall shell slice: More now opens `/paywall`, the screen
  renders feature rows, annual/monthly/lifetime plan rows, Choose plan, Restore purchases, legal copy,
  and soft-lock availability note with EN/RU/ES typed copy; navigation/scaffold contracts were updated,
  and full `npm run check` passed. Live IAP/restore/entitlement enforcement and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/paywall`: SE screenshot review initially exposed a truncated
  `PuppyPlan Plus` modal title; added RED/GREEN `ScreenHeader` primitive coverage and widened the
  title lane, then recaptured top/bottom native screenshots showing the full header, feature rows,
  plan rows, Choose plan, Restore purchases, soft-lock info, and legal note. Live IAP/restore/
  entitlement enforcement remains deferred.
