# Screen States Matrix

Every key screen must define these states unless explicitly carved out:

- `loading`
- `empty`
- `error`
- `offline-read`
- `pending-write`
- `permission-denied`
- `revoked/expired-share`

## Matrix

| Screen / Flow | Required states | Notes |
|---|---|---|
| Onboarding Welcome | default | Static carve-out |
| Puppy Setup | default, error, pending-write | Local draft; future date validation |
| Tracker Selection | default, error | Limit state for 6th tracker |
| Plan Reveal | default | Static carve-out |
| Today | all except revoked/expired | Offline-read and pending-write are P0 |
| Quick Log Sheet | loading, error, offline-read, pending-write, permission-denied | Pending event is not skeleton |
| Quick Log Details | loading, error, offline-read, pending-write, permission-denied | Optional details never block initial save |
| Timeline | loading, empty, error, offline-read, pending-write, permission-denied | Failed rows show Retry/Delete |
| Health | loading, empty, error, offline-read, pending-write, permission-denied | Calm recordkeeping tone only |
| Health Record Edit | loading, error, pending-write, permission-denied | No medical advice copy |
| Reminders | loading, empty, error, offline-read, pending-write, permission-denied | Denied notifications render calm state |
| Reminder Edit | loading, error, pending-write, permission-denied | Reminder entity can exist without push permission |
| Family Sharing | loading, empty, error, offline-read, pending-write, permission-denied | Viewer write actions hidden/disabled by role |
| Family Invite | loading, error, pending-write, permission-denied | Account required before sending invite |
| Trainer Scope Selector | loading, error, pending-write, permission-denied | Preview must match server projection |
| Trainer Preview (owner) | loading, empty, error, offline-read, pending-write, permission-denied, revoked/expired-share | Link-first; preview must match server projection; health summary excludes private fields |
| Trainer Web View (recipient) | loading, empty (per scope), error, revoked/expired-share | Browser `WebFrame`, no account, live projection; ADR-0018 |
| Share Link View (web) | loading, empty, error, revoked/expired-share | One neutral unavailable state for expired/revoked/used/invalid |
| Sitter Invite Accept | loading, error, pending-write, permission-denied, revoked/expired-share | Recoverable identity only; reuses §3.1.4 accept; ADR-0018 |
| Shared-Access Home / Switcher | loading, empty, error, offline-read | Shared puppy badged; one account, many memberships |
| Sitter Checklist (reduced) | loading, empty, error, offline-read, pending-write | Deadline strip; completion-push to owner |
| More | loading, empty, error, offline-read, permission-denied | Paywall shell hidden/off in beta |
| Privacy/About | default, permission-denied if applicable | Static carve-out |

## Enforcement

Tests must assert key screens render their required states. A missing state is a beta blocker for Today, Quick Log, Timeline, Health, Sharing Preview, and Reminders.

