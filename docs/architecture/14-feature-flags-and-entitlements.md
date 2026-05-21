# Feature Flags And Entitlements

## Product Flags

Use PostHog feature flags for product/UI flags and kill switches:

- paywall shell visibility;
- trainer share experiments;
- reminder prompt experiments;
- non-core feature rollout.

Flags default off for non-core beta features.

## Backend Operational Config

Use Supabase `app_config` for backend-critical operational config, such as disabling trusted-sitter push sending if a provider incident occurs.

Do not make backend safety depend on PostHog availability.

## Entitlements

Use a stable entitlement interface in MVP:

```ts
type EntitlementStatus = 'active' | 'inactive' | 'loading';

interface EntitlementProvider {
  getEntitlements(): Promise<Entitlement[]>;
  isActive(key: EntitlementKey): boolean;
  purchase(productId: string): Promise<PurchaseResult>;
  restore(): Promise<void>;
  refresh(): Promise<void>;
}
```

MVP implementation:

- `NoOpEntitlementProvider`;
- `useEntitlement('premium')` returns inactive;
- no live IAP/subscription SDK in MVP binary.

Phase 1:

- live entitlement provider adapter behind feature flag;
- webhooks into Supabase Edge Function;
- household-scoped `subscription_entitlement`.

## App Store / Play Billing

No external payment links for digital content. Future paid unlocks use platform-compliant IAP through the entitlement provider.
