# ADR-0016: Android Compliance And Exact Alarms

Status: Accepted

## Context

Android reminders face notification permission, channel immutability, Doze, vendor background behavior, App Links verification, Data Safety, and exact-alarm policy constraints.

## Decision

Use verified App Links, Play App Signing SHA-256 in `assetlinks.json`, AABs for Play tracks, Expo Notifications, immutable channel IDs, and explicit Data Safety review.

Do not request exact-alarm permissions by default. Exact alarms require a separate spike and Play-policy justification.

## Consequences

- Fallback behavior must not promise minute-perfect reminders.
- `AD_ID` permission is forbidden unless a future ADR changes analytics policy.
- Pre-beta device matrix includes Pixel, Samsung Galaxy A/One UI, and Xiaomi Redmi/MIUI.
