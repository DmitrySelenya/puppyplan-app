# ADR-0018: Sharing Surface Split — Trainer Is A Web View, Sitter Is An In-App Share

Status: Accepted

## Context

The V2 design drew every recipient-facing sharing surface inside the iOS app frame,
including the trainer/kinologist "accepted view" (DESIGN.md §3.3.5). In practice a
trainer is a low-frequency, read-only, often-desktop recipient who will not install an
app to glance at a puppy's routine. Forcing an install + account is the wrong friction.
Conversely, a pet sitter actively logs care, needs attributed identity over days, and
benefits from being a real (reduced) participant in the same app.

ADR-0009 already mandates sanitized projections for scoped shares. ADR-0017 already
provides account/session/pending-intent. This ADR fixes *where each recipient surface
renders* and how the sitter is invited.

## Decision

Split recipient sharing surfaces by render context:

- **Trainer / kinologist = a public, read-only web page** opened from a signed link
  (`/share/[token]`). No account, no install. The page re-queries the sanitized
  projection on each open (live, bounded by scope + expiry + revoke). The card
  "revocable link" recipient view uses the **same** web surface (different projection);
  the card snapshot (image/file) artifact is unchanged. Owner-side trainer controls
  (scope selector, preview, revoke) stay in-app and become link-first ("Create link"
  primary; email optional).

- **Pet sitter = an in-app, reduced, badged share** of the existing household, modeled
  on smart-home device sharing. Accepting an invite (`/invite/[token]`) adds a
  `caregiver` `household_membership` flagged `sitter`; the puppy appears alongside the
  invitee's own puppies, badged and switchable. One account holds many memberships.
  The owner invites in one step ("Поделиться с пэтситтером": person + window +
  checklist + send). Sitter richness (time window, checklist, completion-push,
  auto-expire) is retained. The sitter must accept with a recoverable identity
  (real email / Apple / Google), never anonymous, so logout/reinstall is recoverable.

## Consequences

- A new public web-rendering surface (`WebFrame`) is introduced for trainer and
  card-link recipients; it must never embed app chrome, must be served only from the
  sanitized projection (no base-row SELECTs), and must collapse expired/revoked/used/
  invalid into one neutral state (privacy symmetry).
- The trainer projection's permission preview and the live web view must share one
  projection path (owner sees exactly what the trainer sees) — extends ADR-0009.
- The trainer no longer consumes an app install or account; "my clients" aggregation
  and a trainer account are explicitly deferred (Phase 2), with the web link as the
  growth superset.
- The sitter remains a household-membership view (no new role); the one-step invite is
  UI composition over the existing caregiver-invite + sitter-window primitives.
- RLS/pgTAP coverage (PUP-27/28/29) must add: link-only web read returns projection
  only; revoked/expired link reads nothing; sitter membership write scope; anonymous
  sitter-accept denial; sitter loses access immediately on revoke or window end.
- Supersedes the §3.3.5 in-app trainer-accepted view; DESIGN.md and the screen-states
  matrix are updated accordingly.
