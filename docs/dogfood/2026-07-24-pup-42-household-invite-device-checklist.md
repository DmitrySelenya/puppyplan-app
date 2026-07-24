# PUP-42 Household Invite — Two-Device Owner Checklist

**Status:** Owner-run; not executed by the implementation agent
**Scope:** Non-production Supabase project and two physical iPhones
**Privacy:** Use synthetic accounts and a synthetic puppy only. Never paste an invite link,
email address, puppy name, OTP, or screenshot containing those values into repository evidence,
Linear, logs, or a PR.

## Approval gate

Do not start until the owner has separately approved and completed all of the following:

- apply `20260724083905_household_invite_rpcs.sql` to the named non-production Supabase project;
- install the same PuppyPlan build on both devices;
- confirm both devices point to that same non-production project.

Applying the migration to a remote project is not authorized by the implementation approval and
was not performed while building PUP-42.

## Evidence header

Record only non-private metadata:

| Field | Value |
| --- | --- |
| Date | |
| App build/version | |
| Non-production project label | |
| Owner device model / OS | |
| Invitee device model / OS | |
| Tester initials | |

Use result values `PASS`, `FAIL`, or `NOT RUN`. In Observed, describe behavior without copying
private values.

## Setup

- [ ] Create two synthetic auth accounts: Account A (owner) and Account B (invitee).
- [ ] On Device A, Account A has one existing household with one synthetic puppy.
- [ ] Log one synthetic Diary event on Device A and note its event type/time without recording
      the puppy name.
- [ ] On Device B, sign out and close PuppyPlan.
- [ ] Confirm no invite link or OTP appears in screen recording, screenshots, console output, or
      written evidence.

## Scenario A — valid link joins the existing household

- [ ] On Device A, open More → Family and confirm the existing synthetic puppy is visible in the
      app before creating an invite.
- [ ] Tap **Invite** once. Confirm a `puppyplan://invite/<redacted>` link appears with a last-four
      confirmation and a copy action.
- [ ] Tap Copy. Confirm the success state. Share the link privately to Device B; do not retain it
      in evidence.
- [ ] On signed-out Device B, open the link. Confirm the invite screen appears before OTP.
- [ ] Tap Accept. Confirm PuppyPlan opens the existing email OTP flow.
- [ ] Complete OTP as Account B. Confirm the app leaves OTP and lands in Diary without onboarding
      or a create-puppy prompt.
- [ ] Confirm Device B shows the same synthetic puppy and the pre-existing Diary event from
      Device A.
- [ ] On Device B, add one synthetic care event. Confirm Device A sees that event after normal
      refresh.
- [ ] Return to More → Family on Device B. Confirm the current role is Caregiver and Invite is
      unavailable to that role.
- [ ] Close and reopen PuppyPlan on Device B. Confirm it still opens the owner's household and
      never shows an empty household.
- [ ] Reopen the already-used link as Account B. Confirm the retry is idempotent and still lands
      in the same household.

Expected invariant: Account B sees Account A's existing puppy; no stray empty household is
created during the valid invite flow.

## Scenario B — manual paste fallback

- [ ] Generate a fresh invite on Device A; this invalidates the previous unused active link.
- [ ] On Device B, open an intentionally malformed PuppyPlan invite route that contains no
      private token material.
- [ ] Confirm the neutral unavailable state appears and does not reveal why the link failed.
- [ ] Paste the fresh link into the masked **Invite link or code** field.
- [ ] Submit the replacement, tap Accept, and confirm Device B remains in the same owner
      household.
- [ ] Confirm the pasted token is not rendered back onto the screen or included in evidence.

## Scenario C — unavailable invite and explicit create-your-own fallback

Run each unavailable case with a fresh synthetic Account B/C as needed:

- [ ] Expired link: confirm the neutral unavailable state.
- [ ] Revoked/replaced link: create a link, create another link, then confirm the first one shows
      the same neutral unavailable state.
- [ ] Used link opened by a different account: confirm the same neutral unavailable state.
- [ ] In every case, confirm normal bootstrap does not run merely from opening the link or
      completing OTP.
- [ ] Tap **Create your own household** explicitly. Confirm only this action enters normal
      bootstrap and creates that account's own household.

## Authorization and privacy negatives

- [ ] As a caregiver, confirm the Invite action is disabled and no link can be generated.
- [ ] As the owner, generate two links in sequence and confirm the older unused link is rejected.
- [ ] Confirm the UI never shows an email address, token hash, provider name, or private note in
      invite status/member rows.
- [ ] Inspect only privacy-scrubbed app logs. Confirm no plaintext invite token or OTP is present.

## Native Design Fidelity Stage 4

On the approved lightweight SE device/profile:

- [ ] Owner default, create-pending, link-created, copy-success, and create/copy-error states
      preserve the family-screen hierarchy and touch targets.
- [ ] Invitee valid, accept-pending, unavailable, manual-input-invalid, and fallback-error states
      remain readable without clipped controls.
- [ ] Check default text and one larger Dynamic Type setting in EN, RU, and ES.
- [ ] Confirm the manual field masks its value and remains pasteable.
- [ ] Confirm VoiceOver announces errors/status changes and identifies Accept, Copy, manual
      submit, and Create your own household controls.

## Result table

| Scenario | Result | Observed (no private values) | Follow-up issue |
| --- | --- | --- | --- |
| A — existing household and same puppy | NOT RUN | | |
| B — manual replacement | NOT RUN | | |
| C — unavailable and explicit fallback | NOT RUN | | |
| Authorization/privacy negatives | NOT RUN | | |
| Native Stage 4 / accessibility | NOT RUN | | |

## Completion rule

PUP-42 device acceptance is complete only when Scenario A is `PASS`, including the same-puppy
and cross-device event checks, and all negative/privacy cases are either `PASS` or linked to a
named follow-up. A local green test suite is implementation evidence, not a substitute for this
owner-run verification.
