# Navigation And Deep Links

## Expo Router

Use file-based routing. `app/` contains only route shells and layouts.

Primary tabs:

```text
Today | Health | More
```

Quick Log is a persistent FAB overlay, not a tab. It is hidden only on onboarding, Quick Log itself, and full-screen flows where it would cover the primary CTA.

## Route Groups

Expected route groups:

```text
app/
  _layout.tsx
  _dev/
    components/
  (auth)/
  (onboarding)/
  (tabs)/
    today/
    health/
    more/
  (modals)/
    quick-log/
    quick-log/details/
    timeline/
    reminders/edit/
    family/invite/
    sharing/trainer-preview/
    sharing/scope-selector/
    health/record-edit/
    settings/puppy-profile/
    settings/quick-trackers/
  invite/[token].tsx
  share/[token].tsx
```

## Settings Namespace

More is the user-facing entry point for settings and care-context management, but editable settings screens use a single production namespace under `/settings/*`.

Locked routes:

- `/settings/puppy-profile`
- `/settings/quick-trackers`

Design atlas labels that use `/more/puppy-profile` map to `/settings/puppy-profile`. Do not create parallel `/more/*` and `/settings/*` edit trees for the same setting.

The development-only native design gallery uses `/_dev/components`. It must not appear in primary tabs, More rows, production modal stacks, analytics funnels, or deep-link allowlists.

## Deep Links

Production:

- iOS Universal Links;
- Android App Links.

Dev/test fallback:

- `puppyplan://`.

Production invite/share URLs must use HTTPS paths:

- `/invite/*`;
- `/share/*`.

Render target differs by path (ADR-0018): `/invite/*` opens the **app** (sitter/caregiver accept → thin account → household membership), while `/share/*` renders a **public read-only web view** (trainer and card recipients — no account, no app install). The one-step "Поделиться с пэтситтером" owner flow issues an `/invite/*` link.

## iOS Requirements

- Associated Domains in `app.config.ts`.
- AASA hosted at `/.well-known/apple-app-site-association`, no `.json`, no redirects, valid TLS, `application/json`.
- CI/release gate validates AASA.

## Android Requirements

- App Links with `autoVerify="true"` through config plugin.
- `assetlinks.json` hosted at `/.well-known/assetlinks.json`.
- SHA-256 fingerprint comes from Play App Signing certificate, not debug/upload keystore.

## Pending Intent

If a user opens an invite/share link without a permanent account:

1. Preserve pending intent in SecureStore or equivalent durable safe storage.
2. Complete anonymous/permanent auth as required by the flow.
3. Resolve token via Edge Function.
4. Route to permission preview or accepted state.

Do not store raw tokens in Zustand, Sentry, PostHog, or logs.

After resolution, delete the stored pending intent. Expired, revoked, already-used, and invalid tokens all route to the same neutral unavailable state and must not reveal which condition occurred.

Pending intent storage must include an expiry timestamp. If local expiry passes before auth completes, drop the pending intent and ask the user to request a new link.

## Android Runtime

- Edge-to-edge is baseline for target SDK 35+.
- Predictive back must dismiss sheets/modals without losing draft state.
- All screens and FAB use safe-area/system insets.
