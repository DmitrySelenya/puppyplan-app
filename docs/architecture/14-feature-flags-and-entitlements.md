# Feature Flags And Entitlements

## Product Flags

Use PostHog feature flags for product/UI flags and kill switches:

- paywall shell visibility;
- soft-lock / entitlement-shell visibility;
- trainer share experiments;
- reminder prompt experiments;
- non-core feature rollout.

Flags default off for non-core beta features.

## Backend Operational Config

Use Supabase `app_config` for backend-critical operational config, such as disabling trusted-sitter push sending if a provider incident occurs.

Do not make backend safety depend on PostHog availability.

## Entitlements

Use a stable entitlement interface in MVP. The V2 monetization model is a single
household-level entitlement check:

```text
can_write = active_subscription OR within_30_day_trial
```

The trial clock is anchored to the first durable puppy profile's household creation time
(`household.created_at`), not auth-user creation and not first app open. Reinstalling the app must
not reset the trial.

```ts
type EntitlementStatus = 'active' | 'trial' | 'soft_locked' | 'loading';

interface EntitlementProvider {
  getEntitlements(): Promise<Entitlement[]>;
  isActive(key: EntitlementKey): boolean;
  canWrite(): boolean;
  getTrialDaysRemaining(): number | null;
  purchase(productId: string): Promise<PurchaseResult>;
  restore(): Promise<void>;
  refresh(): Promise<void>;
}
```

MVP implementation:

- `NoOpEntitlementProvider`;
- `useEntitlement('premium')` returns inactive unless a feature-flagged local shell state is enabled for design/testing;
- paywall and soft-lock surfaces are feature-flagged off by default for closed beta;
- no live IAP/subscription SDK in MVP binary.

Soft-lock write taxonomy:

- gated when `canWrite() === false`: create new logs/routines/reminders, edit existing entries, create
  new shares/invites.
- always allowed even when soft-locked: read-only viewing, export own data, delete own data, delete
  account, privacy/account settings, revoke existing shares, restore/manage subscription,
  notification opt-out, sign-out, and existing trainer share viewing.

Do not implement per-feature entitlement tiers for MVP. No reminder cap, history-window cap, second-pet
gate, trainer-depth gate, caregiver-seat counting, export tier, or archive-not-delete model in this
wave. The MVP remains single-pet.

Phase 1:

- live entitlement provider adapter behind feature flag;
- webhooks into Supabase Edge Function;
- household-scoped `subscription_entitlement`.

## App Store / Play Billing

No external payment links for digital content. Future paid unlocks use platform-compliant IAP through the entitlement provider.
