# iOS Runtime And Compliance

## Universal Links

Production invite/share flows use Universal Links, not `puppyplan://`.

Requirements:

- Associated Domains in `app.config.ts`;
- AASA at `/.well-known/apple-app-site-association`;
- no redirects;
- valid TLS;
- `application/json`;
- paths `/invite/*` and `/share/*`;
- CI/release validation.

## Privacy Manifest

`PrivacyInfo.xcprivacy` is a P0 release gate.

Required Reason APIs must be derived from dependency audit. Likely categories include UserDefaults, FileTimestamp, and SystemBootTime, but do not declare categories blindly.

Do not add `NSPrivacyTrackingDomains` automatically unless the app/SDK usage meets Apple's tracking definition.

Expo implementation rule:

- do not hand-edit generated `ios/` files;
- keep the source manifest or config-plugin input in the tracked Expo project;
- verify the built `.app` contains `PrivacyInfo.xcprivacy` at bundle root;
- rerun dependency audit whenever a native dependency is added or upgraded.

The release gate is not just file presence. The manifest must be valid and match the dependency/API audit.

## App Store Gates

Before TestFlight/App Store release:

- privacy policy URL exists;
- account deletion path exists;
- Sign in with Apple present if Google/social auth is present;
- `ITSAppUsesNonExemptEncryption=false` if only standard exempt crypto/HTTPS is used;
- App Privacy form matches actual SDK/data collection;
- App Review notes explain recordkeeping, not veterinary diagnosis;
- no external payment flow for digital goods.

## EAS iOS Profiles

- `development`: dev client/simulator;
- `preview`: internal/ad-hoc or TestFlight staging;
- `production`: App Store/TestFlight release.

Profiles must use explicit env/channel/bundle strategy.

## Notifications

- staged permission: provisional -> full;
- in-app primer before full prompt;
- denied fallback with Settings action;
- categories/actions registered before scheduling.

## Sentry

Production iOS build must upload dSYM/source maps. Release candidate requires verified symbolicated crash stack in Sentry.

## OTA

EAS Update/OTA is off in MVP. Reconsider through ADR only.
