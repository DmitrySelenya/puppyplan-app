# Data Model And RLS

## Schema Baseline

Use the ADR-0007 schema baseline / PRD §6 "Модель Данных" as the source of truth. Do not introduce schema splits or renames without ADR-0007.

MVP entities:

- `user`
- `household`
- `household_membership`
- `puppy`
- `event_log`
- `health_record`
- `reminder`
- `reminder_occurrence`
- `invite`
- `share_link`
- `share_scope`
- `device_push_token`
- `notification_preference`
- `notification_delivery_log`
- `trusted_sitter_completion_event`
- `subscription_entitlement`
- `media_asset`
- `content_version`

Approved additive profile fields:

- `public.puppy.quick_tracker_ids` stores the ordered selected Quick Log tracker ids for `PUP-21`. It is constrained to allowed ids, uniqueness, at least 1 entry, and at most 5 entries, and remains under existing `puppy` owner insert/update RLS.

Approved additive event vocabulary:

- `public.event_type` adds neutral `observation` for `PUP-31` under ADR-0022. Observation payloads
  use the strict version-2 application contract and remain excluded from training-note and broad
  routine-summary projections.

## Rejected Schema Changes

Rejected:

- `event_log` split into `event_notes`;
- `health_record` split into `health_record_notes`;
- `health_record_media` replacing generic `media_asset`;
- renaming `share_link/share_scope` to `external_share_links/share_link_scopes`.

Reasons:

- larger RLS surface;
- more joins on hot Today/Timeline paths;
- harder Quick Log idempotency;
- conflicts with the ADR-0007 schema baseline / PRD §6 "Модель Данных";
- privacy can be enforced with projections and RLS.

## Event Idempotency

`event_log` must have:

```sql
UNIQUE (household_id, client_event_id)
```

Retry insert uses `ON CONFLICT ... RETURNING *` semantics. `client_event_id` is generated before the optimistic write and queue insert.

## RLS Negative Tests

P0 pgTAP cases:

- non-member cannot read household data;
- viewer cannot write;
- caregiver cannot manage billing, owner settings, or share scopes;
- revoked member loses access immediately;
- anonymous user cannot create invites or external shares;
- expired/revoked share cannot read;
- trainer/share can only access projections, not base tables;
- `health_summary` excludes notes/provider/photos;
- user cannot read another user's push tokens;
- delivery logs store metadata only.
- `bootstrap_current_user` creates exactly one accepted owner membership for the current authenticated user, is idempotent, isolates users into distinct households, denies anon execution, and is SECURITY DEFINER with a pinned search path.

Policy shape requirements:

- `invite`, `share_link`, and `share_scope` direct client inserts/updates/deletes are denied by default.
- direct client inserts into `household` / `household_membership` remain denied for normal app bootstrap; new-user setup goes through `bootstrap_current_user`.
- invite/share create, accept, revoke, and scope changes happen through Edge Functions or SECURITY DEFINER helpers that check `auth.uid()`.
- anonymous auth may read only the narrow projection needed to resolve a valid invite/share token; it may not create invites or external shares.
- share projection tests must assert both allowed fields and forbidden fields. A test that only checks "some rows are returned" is insufficient.
- base-table tests must prove trainer/share access cannot directly read unrestricted `event_log` or `health_record` rows.

## Payload Versioning

`payload_version` supports `1` and `2`. Version 1 rows remain readable; detailed notes, sleep
actions, and neutral observations use the strict version-2 Zod union. The additive migration keeps
the database check aligned without rewriting historical rows.

No ad hoc version branching in UI components. Parse at the contract/data boundary.

ADR-0022 permits strict payload-version-2 event branches with an optional trimmed private note up
to 500 characters. Version-1 rows remain readable. Notes are not exposed through analytics, logs,
notifications, observability, or broad sharing projections.
