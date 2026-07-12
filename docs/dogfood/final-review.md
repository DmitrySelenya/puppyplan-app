# Dogfood core-loop final deep review

## Findings resolved

1. **Medium · permission truth:** the legacy reminder review screen rendered a denied card without
   permission input. It now renders Settings guidance only for an explicit `denied` state.
2. **Medium · observable failure:** no-care-context notification cancellation and permission refresh
   could reject outside the scrubbed reporter. Both device boundaries now report non-PII operation
   context through the shared observability wrapper.
3. **Medium · Release compatibility:** Supabase 2.106.1's ESM computed OpenTelemetry import fails
   Hermes release compilation. Metro selects Supabase's equivalent published CJS entry; fresh iOS
   Hermes export passes. Native install retry remains disk-gated.

No Critical or High finding remains. Existing React test `act()` warnings and Expo Go's remote-push
warning are test-environment noise with green assertions; they are not suppressed by configuration.

## Security/privacy/RLS

- Private notes remain inside payload-v2 durable fact paths and are excluded from analytics,
  observability metadata, notification content, broad shares, screenshots, and evidence.
- Observation is excluded from accepted-share routine/event projections; owner/caregiver/viewer and
  non-member pgTAP coverage remains in the tracked RLS suite.
- The additive migration, generated event enum, Constants enum, and TypeScript contracts agree.
- `npm run supabase:guardrails` passes 31 checks; privacy scan and generated-type drift check pass.

## Design fidelity matrix

| Surface | Stage 4 evidence | Result |
|---|---|---|
| Quick Log fast sheet/details | phase3 Stage 4, five locked-SE captures | PASS |
| Canonical Routine Editor | phase4 Stage 4, five locked-SE captures | PASS |
| Diary plan/fact | phase5 Stage 4, past-unmarked + planned/actual captures | PASS |
| Permission state | Stage 0 reference + synthetic denied/authorized render anatomy | PASS; physical banner pending |
| Local Release run | Hermes export | PASS; native install retry disk-gated |

EN/RU/ES parity, string budgets, typed keys, 44pt controls, Dynamic Type-safe primitives, and
Reduced Motion guardrails pass the aggregate checks. No design token or raw Pressable boundary was
introduced in feature UI.

## Performance/platform

- Diary day derivation is pure and bounded to one day; query composition shares TanStack keys.
- Notification scheduling is a bounded 72-hour deterministic rebuild and has listener cleanup.
- Quick Log keeps one SQLite transaction per durable create and idempotent replay.
- App routes remain thin; feature code uses Supabase/query/design/observability boundaries.
- No EAS, production, commit, push, merge, generated-native edit, or cleanup occurred.

## Verdict

Approve with two named external notes: physical two-phone/banner acceptance is owner-executed, and
native Release install/restart must be retried only after free disk is restored above 10 GiB.
