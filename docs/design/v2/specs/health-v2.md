# Health V2 Implementation Spec

Source atlas:
- `docs/design/v2/raw/screens/health.jsx`
- `DESIGN.md` section 4.1
- `docs/design/v2/raw/CHANGELOG-pass3.md` sections 3.2, 5.3, 5.4

## Locked Anatomy

- Health keeps the top-level `Today | Health | More` tab contract; Quick Log remains the FAB on log surfaces.
- List rows use the 72 pt health row anatomy: leading medical icon, title, status pill, metadata, optional subline, and chevron.
- Mixed-list review fixtures must include confirmed, needs-vet-review, template, completed, empty, and weight states.
- Status is never color-only. Every status has visible text, a decorative icon, and a combined row accessibility label.
- `needs-vet-review` is a status noun in the app strings. CTA wording belongs in guidance/action copy, not in the status value.
- Stage/progress strips expose one active stage only and announce the full stage sequence to assistive tech.
- Empty state actions remain disabled until durable health record creation is implemented by the owning workstream.
- `No clinic listed` and equivalent filler strings are not rendered in Health V2 fixtures.
- Delete entry is the only danger-filled Health action. The confirmation state and pending/disabled state must be visible in fixtures.

## Evidence Targets

- iPhone SE list and empty state from `/health`/gallery fixture.
- iPhone SE edit empty and filled states.
- iPhone SE confirmed detail and needs-vet-review detail with single-active stage strip.
- iPhone SE delete confirmation/pending state.
- iPhone SE weight-entry fixture.

## Verification

- `src/test/health.render.test.tsx` covers row order, status labels/icons, no filler metadata, stage single-active state, delete confirmation, edit path, and weight entry.
- `src/test/app-shell.render.test.tsx` keeps production Health honest-empty by default and the mixed-list fixture explicit.
- `src/test/dev-gallery.render.test.tsx` keeps the synthetic native gallery available for screenshot capture without production writes.
