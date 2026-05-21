# Observability, Error Handling, Performance

## Sentry

Use a single wrapper in `src/lib/observability`.

Direct `Sentry.captureException` from feature code is forbidden.

Required PII scrub deny-list:

- puppy name;
- household member names;
- raw email;
- note text;
- provider name;
- token values;
- media URLs;
- raw health text.

The scrubber must be covered by tests with synthetic fixtures for each denied category. Tests fail if the wrapper forwards raw private values to Sentry tags, contexts, breadcrumbs, messages, exception extras, analytics properties, or logs.

Feature code must pass structured error categories and stable IDs only. Raw backend errors are normalized at the boundary before reaching UI, analytics, or observability.

## Error Boundaries

Three tiers:

- root boundary: catastrophic app failure;
- route boundary: tab/modal route failure;
- feature/widget boundary: heavy partial UI such as Timeline/Today cards.

Every Sentry event gets `boundary_level`.

Business errors render design-system `ErrorState`/`InlineAlert`, not `Alert.alert`.

## Suspense

Route-level Suspense is allowed for initial reads. Quick Log FAB and critical Quick Log entry path must never suspend.

## Performance Budgets

Hard gates:

- Quick Log tap -> visible optimistic row <=100ms;
- cold start TTI <=2.5s on mid-range Android;
- Today list render <=16ms/frame;
- Timeline scroll drop <=1% frames over 10 seconds.

## Android Observability

- Enable Sentry ANR/app-hang tracking.
- Upload Hermes source maps and ProGuard/R8 mapping for production AAB.

## iOS Observability

- Upload dSYM/source maps for production builds.
- Release candidate requires an intentional crash with symbolicated Sentry stack trace.

## Analytics

Use a typed analytics wrapper with whitelist events from PRD taxonomy. PostHog session replay is off in MVP.

No autocapture in MVP.

CI must include an observability privacy gate once the app scaffold exists:

- deny-list fixture test for Sentry wrapper;
- analytics event schema test that rejects unknown properties;
- static search for direct `Sentry.captureException`, PostHog autocapture/session replay enablement, and raw token/email/note property names outside approved scrubber tests.
