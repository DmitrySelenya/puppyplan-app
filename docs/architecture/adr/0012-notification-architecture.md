# ADR-0012: Notification Architecture

Status: Accepted

## Context

Reminders are local user-care workflows. Trusted-sitter completion is a narrow remote update. Combining both into one push-centric model would add failure modes and policy burden.

## Decision

Use Expo Notifications for local reminder scheduling. Use Expo Push Service through a Supabase Edge Function only for trusted-sitter completion notifications.

`local_notification_id` is device/install-specific and is managed by the client.

## Consequences

- New device login reschedules reminders from server rows.
- Logout cancels local schedules for that device.
- Android channels and iOS categories are registered before scheduling.
- Notification delivery logs store metadata only.
