# Notifications

## Split

Local reminders and remote push are separate systems.

Local reminders:

- created on-device with Expo Notifications;
- work without remote push token;
- support Done, Snooze, Skip, Edit, Stop;
- respect timezone and quiet hours.

Remote push:

- MVP only for trusted-sitter completion updates;
- sent through Edge Function;
- failure does not affect source of truth.

## Device-Specific Scheduling

`local_notification_id` is device/install-specific. It is not a globally meaningful server identifier.

Client invariants:

- new device login reschedules local reminders from server `reminder` rows;
- logout cancels local scheduled IDs on that device;
- timezone changes cancel/reschedule future local notifications;
- two devices may have different local IDs for the same reminder occurrence.

This is not a server schema change.

## iOS

- Use staged permission: provisional first, full prompt after value/in-app primer.
- Register notification categories before scheduling.
- Foreground reminders should show banner/list where appropriate.
- Denied state becomes calm in-app fallback with Settings action.

## Android

- Request `POST_NOTIFICATIONS` after first reminder intent/rationale, not on splash.
- Create channels before the first notification:
  - `reminders_v1`: HIGH;
  - `sitter_completion_v1`: DEFAULT;
  - `system_low_v1`: LOW.
- Channel IDs are immutable after release; changing importance requires a new channel ID and ADR.
- Use Expo Notifications + Expo Push Service in MVP.
- Do not integrate `@react-native-firebase/messaging` directly in MVP.

## Exact Alarm Policy

Do not add exact alarm permission "just in case".

ADR-0016 must decide whether `SCHEDULE_EXACT_ALARM` is justified. `USE_EXACT_ALARM` is not default for PuppyPlan.

Fallback if exact alarm is denied/unavailable:

- inexact local reminder;
- Today reminder card;
- no copy promising minute-perfect delivery.

## Remote Push Delivery

`send_trusted_sitter_completion`:

- checks notification preferences;
- reads enabled device tokens;
- writes `notification_delivery_log` metadata only;
- idempotent by `(trusted_sitter_completion_event_id, device_push_token_id)`;
- never stores notification body, puppy name, token, or email in logs.

