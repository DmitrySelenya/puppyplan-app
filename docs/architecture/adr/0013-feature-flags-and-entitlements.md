# ADR-0013: Feature Flags And Entitlements Are Separate

Status: Accepted

## Context

Feature rollout, backend kill switches, and paid entitlements have different correctness requirements. Treating them as one flag system risks exposing paid or unsafe behavior incorrectly.

## Decision

Use PostHog for product/UI flags and kill switches. Use Supabase `app_config` for backend-critical operational config. Use `subscription_entitlement` as the source of truth for paid access.

The live subscription provider is abstracted behind `EntitlementProvider`; MVP uses a NoOp/manual provider unless a future ADR adds the live SDK.

## Consequences

- UI flags do not grant paid access.
- Backend operations do not depend on PostHog availability.
- iOS external payment restrictions remain explicit release checks.
