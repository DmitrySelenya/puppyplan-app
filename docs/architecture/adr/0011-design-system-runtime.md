# ADR-0011: Design System Runtime Boundaries

Status: Accepted

## Context

The app needs consistent mobile UI, accessibility, haptics, motion, and design QA while the Figma work is still evolving.

## Decision

Create `src/design` as the only UI infrastructure zone. Tokens are TypeScript `as const` in MVP. Use Reanimated 3 for motion and a typed haptics wrapper. Feature code cannot import raw colors, spacing, typography, icons, `Pressable`, or direct haptics.

MVP component inspection uses `/_dev/components`; Storybook is Phase 1 unless justified by component count or design QA.

## Consequences

- UI changes must go through primitives or extended components.
- Accessibility labels, roles, target sizes, and Reduced Motion behavior are component contracts.
- `AUDIT_FIXES.md` remains a required beta design QA track.
