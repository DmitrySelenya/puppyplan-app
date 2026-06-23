# Sharing And Permissions

## Access Models

There are two different access models:

- household membership: `owner`, `caregiver`, `viewer`;
- scoped external sharing: `share_link` + `share_scope` for trainer/viewer-style access.

`trainer_viewer` is not normal household membership in MVP. It is a scoped share/link access model.

Trusted Sitter Mode is a view over accepted caregiver membership, not a new role.

Render context (ADR-0018): the trainer/share recipient surface is a **public, read-only web view** served from the sanitized projection — no account, no app install — and the card "revocable link" recipient uses the same web surface. The sitter surface is **in-app**: accepting an invite adds a `caregiver` membership flagged `sitter`, and the shared puppy appears alongside the invitee's own puppies (one account holds many memberships), badged and switchable. Recipient web views never embed app chrome and collapse expired/revoked/used/invalid into one neutral unavailable state.

## Server Enforcement

UI guards are convenience only. Real enforcement is:

- RLS for household-scoped data;
- Edge Functions for privileged operations;
- `share_link_view` or equivalent sanitized projection for scoped share views.

Trainer/share flows must never directly SELECT unrestricted `event_log` or `health_record` base rows.

## Share Projections

`health_summary` returns only:

- title;
- status;
- scheduled/completed date;
- source/template/confirmed status.

Excluded by default:

- notes;
- provider_name;
- media/photos;
- private comments;
- billing/account data.

`selected_timeline_range` and `routine_summary` are whitelist projections. They do not include notes unless the exact scope and per-item shareable flag allow it.

Projection implementation must be one of:

- SQL views with RLS-safe predicates and no sensitive columns;
- SECURITY DEFINER RPCs in `app_private` that return a typed response shape;
- Edge Function responses built from the same SQL/RPC projection.

Do not implement sharing by fetching base rows and filtering private fields only in React components.

Baseline projection contract:

| Scope | Included | Excluded |
| --- | --- | --- |
| `routine_summary` | event type, occurred date/time bucket, generic actor role, count/pattern summary | notes, raw payload free text, exact private comments, media |
| `selected_timeline_range` | owner-selected event types in selected range, event type, occurred_at, generic actor role or approved display label | events outside range, deleted events, private notes, media, account/billing metadata |
| `training_notes` | training event topics, duration bucket, owner-selected notes marked shareable | non-training notes, health notes, photos unless explicitly selected |
| `health_summary` | title, status, scheduled/completed date, source/template/confirmed status | notes, provider_name, medication details, media/photos, private comments |

Permission preview and shared view must use the same projection path. A duplicated client-side preview mapper is not enough.

## Base Table Access

Trainer/share access must not directly SELECT unrestricted `event_log`, `health_record`, `media_asset`, `household_membership`, or billing/entitlement rows.

RLS/pgTAP tests must cover:

- valid share token reads only projection output;
- expired/revoked share token reads nothing;
- trainer/share cannot read private notes, provider names, media URLs, raw health metadata, or token hashes;
- revoked household member loses base-row access immediately;
- anonymous user cannot create invite/share rows.

## Token Security

- Generate tokens only server-side.
- Store only Argon2id hashes plus `token_last4`.
- Plain token is shown/sent once.
- Never log raw tokens.
- Expiry required for all external scoped links.
- Revoked and expired links show the same neutral unavailable UI.

Argon2id baseline: `m=64MB`, `t=3`, `p=1`, unless ADR changes it.

## Permission Preview

The permission preview must be generated from the same projection rules used by the share view. Owner sees what trainer will see.

Every share screen must answer:

- who can see this;
- what fields are included;
- what fields are excluded;
- when access expires;
- how access can be revoked.
