# Sharing Access Model — Agreed Decisions (Sitter & Trainer)

Date: 2026-06-23
Status: Agreed (product owner), pending implementation in PUP-27/28/29 (Phase 4)
Owner: Dmitry (product) · drafted with Claude Code

> Standalone record of what we agreed about **how a pet sitter (пэтситтер) and a
> trainer/kinologist (кинолог) interact with PuppyPlan.** It is the source for the
> design spec (`docs/design/v2/specs/sharing-sitter-trainer-v2.md`), the canonical
> doc edits listed at the bottom, and the Cloud Design handoff prompt.

---

## The core idea (one sentence)

**Access is account-shaped, not puppy-shaped, and split by who writes vs who reads:**
a sitter is *inside the same app* as a reduced, badged guest (the smart-home
device-share pattern); a trainer is *outside the app* looking at a live, read-only
web page opened from a link.

| | **Pet sitter (пэтситтер)** | **Trainer / kinologist (кинолог)** |
|---|---|---|
| Where | The same standard PuppyPlan app | A web page in their browser |
| Account | Yes — thin account, real email/social | **No account, no install** |
| Mechanism | Caregiver household-membership, flagged `sitter` | Scoped `share_link` + sanitized projection |
| Entry | Invite link → accept → puppy appears in their app, **badged** | Owner sends a link → trainer opens it anytime |
| Data | Reads + writes (logs care) within scope | **Read-only**, live re-query on each open |
| Re-entry | Re-login same email; access persists server-side | Re-open the same link until expiry/revoke |
| Model | A (grant bound to account; link consumed at accept) | B (link is the credential; expiring, revocable) |

---

## Locked decisions

1. **Sitter = "share the puppy like a second owner, but reduced + badged," in-app.**
   The pet sitter uses the same app. The shared puppy appears alongside their own
   puppies (if any), visually distinct (badge + tint, "Вы подсиживаете"), in a
   "Shared with you" group. Tapping it opens a reduced, track-focused window
   (the sitter checklist view). This is the established smart-home device-share
   pattern (Apple/Google Home account-share, Mi Home/Roborock link/QR share).

2. **One account, many puppies, many roles — the "sitter already has a pet" case is free.**
   A Supabase Auth user is not tied to one puppy. Accepting a sitter invite adds a
   second `household_membership`; their own puppy is untouched. The app shows a
   **puppy switcher** with role labels ("Puppy A — мой", "Puppy B — подсиживаю").

3. **Sitter richness stays at the PRD level.** *(decided 2026-06-23)*
   Keep the time-windowed sitter window, the checklist, owner completion-push, and
   auto-expire (DESIGN.md §3.2 as written). We are **not** simplifying these away.

4. **Owner invites a sitter in ONE step.** *(decided 2026-06-23)*
   A direct "Поделиться с пэтситтером" action collects person + window + checklist
   on one flow and sends an invite link. Under the hood it is still
   caregiver-membership + sitter window. This replaces the old two-step requirement
   ("first invite a caregiver, then enable sitter mode").

5. **Accept mechanism = invite link (primary), short code (fallback).**
   Owner shares a deep link via any channel; the invitee opens it, signs in with any
   email/Apple/Google, and the puppy appears. This is our existing `/invite/[token]`
   pending-intent flow — no new architecture. A manual short code is an optional
   "I have a code" fallback. Account-targeted (type the invitee's email) is a later
   optional path. Link security unchanged: single-use, expiring, bound at first
   accept, Argon2id hash server-side.

6. **Sitter must use a recoverable identity (real email / Apple / Google), not anonymous.**
   So logout / reinstall / new phone is recoverable: re-login with the same email →
   server-held membership reappears. The only thing the sitter must remember is which
   email they used.

7. **Trainer = a LIVE, read-only web page, no account, no app.** *(decided 2026-06-23)*
   The trainer opens a signed link in a browser. The page re-queries the sanitized
   projection on each open, so a week later it shows current data — bounded by scope,
   expiry, and revoke. The page states this explicitly ("обновляется по мере того,
   как владелец записывает активность"; "аккаунт не нужен"). This replaces the old
   in-app trainer-accepted view (DESIGN.md §3.3.5 was drawn inside the iOS app).

8. **Owner-side trainer flow stays in-app and becomes link-first.**
   Scope selector and permission preview stay in the app (DESIGN.md §3.3.2/§3.3.3),
   but the primary action becomes **"Create link" / "Copy link"** (matching the
   sitter's "save the link in a chat/table" use case). Sending to an email stays as
   an optional convenience, not the primary path.

9. **One shared web surface for all recipient web views.** *(resolved 2026-06-23)*
   The trainer page and the card "revocable link" recipient page render through the
   same browser template (`WebFrame`): browser chrome, "read-only," and a single
   neutral "доступ недоступен" state on expiry/revoke. Only the content (which
   projection) differs. The card snapshot (image/file) artifact is unchanged.

---

## What this is NOT (kept out of scope)

- No separate "sitter app" or "trainer app"; no "register as sitter/trainer" role
  the registrant self-selects (the role is fixed by the owner's invite).
- No trainer "my clients" aggregation or trainer account — deferred to Phase 2
  (clinic/trainer pilots); the web-link superset can grow into it later.
- No change to the data model beyond a `sitter` flag/marker already implied by
  Trusted Sitter Mode and the existing `share_scope` projection layer.
- No native implementation in this pass — these decisions feed PUP-27/28/29.

---

## Documents updated to match these decisions

- `docs/design/v2/specs/sharing-sitter-trainer-v2.md` — new design lock (the spec).
- `docs/design/v2/raw/uploads/DESIGN.md` — §3.2.1 (one-step sitter), new shared-access
  home/switcher note, §3.3.3 (link-first), §3.3.5 (trainer view → web), §3.3.6 (web).
- `docs/architecture/09-sharing-and-permissions.md` — trainer = public web view; sitter
  = in-app device-style standing share; shared web surface.
- `docs/architecture/05-navigation-and-deeplinks.md` — `/share/[token]` renders a web
  page (not an in-app phone screen); one-step sitter invite via `/invite/[token]`.
- `docs/architecture/screen-states-matrix.md` — sitter accept, shared-access home,
  reduced sitter window, trainer web view, web share-unavailable rows.
- `docs/architecture/adr/0018-sharing-surface-split-web-trainer-app-sitter.md` — new ADR.
- `docs/design/v2/raw/uploads/puppyplan-prd-v2.md` — Trainer/Sitter sections reconciled.
- `docs/plans/active/2026-06-22-redesign-v2-intake.md` and
  `docs/plans/active/2026-06-17-redesign-resequencing.md` — Phase 4 / PUP-28/29 notes.

Cloud Design handoff: `docs/design/v2/cloud-design-prompt-sharing.md`.
