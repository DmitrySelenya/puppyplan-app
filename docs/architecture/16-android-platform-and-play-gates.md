# Android Platform And Play Gates

## App Links

Production invite/share flows use verified Android App Links.

Requirements:

- intent filter with `autoVerify="true"` via config plugin;
- hosted `https://puppyplan.app/.well-known/assetlinks.json`;
- SHA-256 from Play App Signing certificate;
- `puppyplan://` only as dev/test fallback.

## Play Data Safety

Data Safety form is a P0 gate before first Play track.

Declare actual collection:

- email/auth;
- user ID;
- push token/device ID;
- diagnostics;
- product interaction analytics.

Session replay is off.

`com.google.android.gms.permission.AD_ID` is forbidden unless an ADR and Data Safety update explicitly allow it.

## EAS Android Profiles

- `development`: APK, dev client, dev/debug credentials;
- `preview-apk`: APK for QA direct install;
- `internal-aab` or production internal submit: AAB for Play Internal Testing;
- `production`: AAB for Play release.

Do not upload APK to Play tracks.

## Notifications

- `POST_NOTIFICATIONS` for Android 13+;
- rationale after first reminder intent;
- notification channels created before first notification:
  - `reminders_v1`: HIGH;
  - `sitter_completion_v1`: DEFAULT;
  - `system_low_v1`: LOW.

Channel IDs are immutable after release.

## Exact Alarms

Exact alarm permission requires ADR and Play policy justification. `USE_EXACT_ALARM` is not default.

Fallback behavior must be documented if exact alarm is unavailable.

## Runtime UI

- target SDK 35+ edge-to-edge baseline;
- safe-area/system insets on Screen, FAB, sheets;
- predictive back closes sheets/modals without losing drafts.

## Sentry

- ANR/app-hang tracking enabled;
- Hermes source maps uploaded;
- ProGuard/R8 mapping uploaded.

## Device Matrix

Before beta:

- Pixel stock Android;
- Samsung Galaxy A / One UI;
- Xiaomi Redmi / MIUI.

Test Doze, battery saver, notification permission denied, channel disabled, timezone change, and reminder fire/action.

## Native Config Rule

Generated `android/` is read-only for agents. Native config changes go through `app.config.ts`/config plugins and ADR.

