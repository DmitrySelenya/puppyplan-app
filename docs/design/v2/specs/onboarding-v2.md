# Onboarding V2 Design Lock

Date: 2026-06-23

## Sources

- `docs/design/v2/manifest.json`
- `docs/design/v2/raw/screens/onboarding.jsx`
- `docs/design/v2/raw/CHANGELOG-pass3.md`
- Atlas refs: `v2.onboarding.01`, `v2.onboarding.02`, `v2.states.01`

## Locked Anatomy

- Welcome uses strict wizard chrome, one title, one subtitle, and one primary CTA.
- Puppy profile keeps the active age segment visible. Future or invalid birth dates target the birth-date field while the birth-date segment remains selected.
- Tracker picker uses the Phase 2 canonical Quick Log taxonomy only: Potty, Feeding, Sleep, Walk, Zoomies. Weight is Health-only and is not a Quick Log event.
- Step 2.5 plan reveal remains wizard chrome: no TabBar, no Quick Log FAB, no step indicator copy.
- Step 2.6 first Today uses Today chrome: `Today | Health | More` TabBar plus persistent Quick Log FAB, and no onboarding step indicator.
- First-log feedback is single-source. The celebration card remains; the duplicate Done snackbar is absent.

## Implementation Notes

- Production onboarding stays inside `src/features/onboarding/**`; `app/onboarding/**` remains a thin route wrapper.
- Synthetic gallery evidence uses placeholder puppy data only and does not include private content.
- The native comparison target is `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`).

## Gate

- Structural tests assert date-field error targeting, tracker taxonomy, wizard-vs-Today chrome split, retryable save failure, selected tracker roles/states, and absent duplicate snackbar.
- Native screenshots are recorded under `output/design-fidelity/v2-phase3/onboarding/`.
