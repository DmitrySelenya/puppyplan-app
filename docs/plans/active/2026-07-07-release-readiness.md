# Release Readiness — Deferred Gates Aggregator

> For implementation agents: this is a checklist aggregator, not a single task. Each item was
> deliberately deferred by an earlier plan; the source plan/doc is named per item. Execute items
> only through scoped Linear issues (or explicit no-Linear exceptions), and never perform
> release/production actions without the user's exact approval per `AGENTS.md`.

**Goal:** One place that owns every deferred release/production/verification obligation, so
nothing rots in the tail of an archived plan when the closed-beta release approaches.

**Status:** Active.

**Plan type:** Active follow-up plan (aggregator).

**Linear:** no-Linear exception for the aggregator itself; each executed item gets its own issue.

**Maintenance rule:** when a plan defers a release-relevant item, add it here with a source
pointer and move the plan to `completed/` if nothing else remains. When an item completes,
check it off here with evidence pointers.

---

## 1. Production backend (exact approval required)

Source: `completed/2026-06-08-post-pup-18-next-batch.md`, master roadmap changelog 2026-06-09.

- [ ] Create/connect the real PuppyPlan production Supabase project (none exists today; only
      `PuppyPlan Dev` `olymqppxsadsxfrcyskh` is configured).
- [ ] Apply repo migrations to a clean production baseline; verify migration history, dry-run
      no-op, lint, advisors.
- [ ] Run RLS/pgTAP verification and remote typegen against production; do not copy dev test
      data into production.
- [ ] Production auth email/OTP template and environment configuration.

## 2. Native build signoff caveats

Source: `completed/2026-06-08-post-pup-18-next-batch.md` (emulator evidence), master roadmap.

- [ ] Resolve or explicitly accept the generated-native-project warnings noted during the
      PUP-21 SE emulator evidence (CTO release signoff caveat).
- [ ] Re-run approved-SE simulator smoke that was blocked by the XcodeBuildMCP build launch
      failure during PUP-22/PUP-23 (source: `completed/2026-06-12-pup-22-23-today-quicklog-timeline.md`).

## 3. Accessibility and localization gates (re-run against V2 design)

Sources: `completed/2026-05-21-design-handoff-agent-gallery.md` (PUP-7 follow-up),
master roadmap Phase 9, `active/2026-06-17-redesign-resequencing.md` P9 DEFER lane.

- [ ] Dynamic Type XXL/XXXL screenshots in EN/RU/ES for Diary, Quick Log, Pet/Health record
      entry, Sharing Preview, and Onboarding CTA — against the **V2** screens.
- [ ] VoiceOver/TalkBack pass for Quick Log, invite preview, health record entry, and the
      notification-permission-denied fallback.
- [ ] Touch-target audit (44pt/48dp; central Add 56pt+) on migrated V2 screens.

## 4. E2E smoke (needs installable dev build)

Sources: master roadmap Phase 9, `AGENTS.md` Mobile E2E section.

- [ ] Maestro flows: onboarding → puppy profile → first Quick Log → Diary update; offline
      Quick Log → reconnect → dedupe; family invite accept/revoke; trainer share
      preview/revoke; reminder schedule/fire/action; notification permission denied fallback.
- [ ] Only after a stable dev build: port/create the `tools/mobile-e2e` toolkit (explicitly
      deferred until then).

## 5. Platform compliance and privacy gates

Sources: `completed/2026-05-21-phase-0-architecture-cleanup.md` tails,
`docs/architecture/15-ios-runtime-and-compliance.md`, `16-android-platform-and-play-gates.md`.

- [ ] AASA and assetlinks validation scripts.
- [ ] `PrivacyInfo.xcprivacy` built-artifact verification plus a fresh dependency/API audit.
- [ ] Privacy manifest generation/check wired into the Expo build path.
- [ ] Android Data Safety / App Privacy form evidence.
- [ ] Platform preflight gate before TestFlight/Play Internal Testing (greenlight /
      app-store-preflight scan per global operating rhythm).
- [ ] Auth compliance check: if any third-party social login (e.g. Google) is added before
      submission, Sign in with Apple becomes mandatory (App Store Guideline 4.8); email-OTP-only
      needs no extra provider.
- [ ] App-wide observability PII scrubber tests once shared observability wrappers exist.
- [ ] Sentry/PostHog SDK guardrails and symbolication smoke plan (deps require approval).

## 6. Performance budgets

Source: master roadmap Phase 9.

- [ ] Cold start, Diary time-to-interactive, Quick Log tap-to-visible-update, Diary history
      scroll performance checks.

## 7. Repository/process gates

Sources: `completed/2026-05-21-phase-0-architecture-cleanup.md`, master roadmap.

- [ ] Branch protection and required checks (needs explicit user approval for repo settings).
- [ ] Invalidation helpers for reminders, health, sharing, membership mutations (feature work;
      tracked here only so the phase-0 tail is not lost — split into feature issues).

## 8. Non-gate deferred follow-ups (not release blockers)

- [ ] Development-only native design gallery route with synthetic V2 state fixtures
      (source: `completed/2026-05-21-design-handoff-agent-gallery.md` Phase 7).
- [ ] Remove legacy `today`/`health` redirect routes in one batch with i18n keys and tests
      (source: ADR-0020 action item).
- [ ] Revisit OTA-disabled decision (ADR-0014) at beta if release iteration speed hurts.

---

## Changelog

- 2026-07-07: Created during the plans-hygiene pass; absorbed deferred tails from phase-0
  architecture cleanup, design handoff (PUP-7), post-PUP-18 next batch, PUP-22/23, the
  resequencing P9 DEFER lane, and master roadmap Phase 9.
