# PUP-42 Household Invite — Two-Device Owner Checklist

**Status:** All four invite/bootstrap migrations and the final approved-SE Release bundle are
installed on non-production dev. Initial owner/invitee acceptance and repeated post-migration cold
starts passed on the approved SE; the full physical two-device matrix remains owner-run.
**Scope:** Non-production Supabase project, the approved SE simulator, and two physical iPhones
**Privacy:** Use synthetic accounts and a synthetic puppy only. Never paste an invite link,
email address, puppy name, OTP, or screenshot containing those values into repository evidence,
Linear, logs, or a PR.

## Approval gate

Do not start until the owner has separately approved and completed all of the following:

- [x] apply `20260724111630_household_invite_rpcs.sql` to the named non-production Supabase
  project;
- [x] apply follow-up migration
  `20260724132557_household_invite_already_member_outcome.sql` to that same project;
- [x] apply follow-up migration
  `20260724193951_bootstrap_current_user_membership_resolution.sql` to that same project;
- [x] apply follow-up migration
  `20260724205949_bootstrap_current_user_serialization.sql` to that same project;
- [x] install the fresh PuppyPlan Release bundle on the approved SE simulator;
- [ ] install the same PuppyPlan build on both physical devices;
- [ ] confirm both devices point to that same non-production project.

The follow-up migration was applied only after separate exact owner approval. No production
project was changed.

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
- [ ] Before opening any deep link, perform a clean Account A sign-in. Confirm normal first entry
      does not display the invite/manual-code screen and lands in Account A's existing household.

## Scenario 0 — existing owner opens their own unused link

- [ ] As Account A, create one fresh invite and share it only through a private channel.
- [ ] While still signed in as Account A, open that link and tap Accept.
- [ ] Confirm the result says the account is already in this household. It must not show the
      caregiver role row, caregiver access preview, or owner-revocation disclosure.
- [ ] Tap **Open**. Confirm the same household and synthetic puppy remain selected.
- [ ] Open More → Family. Confirm Account A is still **Owner**, not Caregiver.
- [ ] Open Quick Log details, add a synthetic note, and save it. Confirm no “ask the owner” or
      read-only message appears for Account A.
- [ ] Without generating another invite, privately open the same link as signed-out Account B and
      complete OTP. Confirm Account B joins as Caregiver.

Expected invariant: opening an unused link as an existing owner changes neither their membership
nor role and does not consume the link intended for the second account.

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
- [ ] Return to More → Family on Device B. Confirm the current role is Caregiver, the subtitle
      says the owner manages access, and no invitations section or Invite action is rendered.
- [ ] Close and reopen PuppyPlan on Device B. Confirm it still opens the owner's household and
      never shows an empty household.
- [ ] Reopen the already-used link as Account B. Confirm the retry is idempotent and still lands
      in the same household through the already-member state and **Open** action.

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
- [ ] Repeat the explicit fallback from a valid, not-yet-accepted invite. Confirm no acceptance RPC
      runs and the account follows normal bootstrap instead of being forced into Caregiver.

## Authorization and privacy negatives

- [ ] As a caregiver, confirm no invitations section or Invite action is rendered and no link can
      be generated.
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
- [ ] Already-member and unavailable states hide the caregiver offer/preview; already-member has
      one **Open** action and unavailable retains manual replacement plus explicit create-own.
- [ ] Family loading/error/empty states show only the header and state card, never a fabricated
      **You / Owner** row or Invite action.
- [ ] Quick Log shows permission-denied only for a verified Viewer. Missing household/write
      context uses the technical error state and keeps Save disabled.
- [ ] Check default text and one larger Dynamic Type setting in EN, RU, and ES.
- [ ] Confirm the manual field masks its value and remains pasteable.
- [ ] Confirm VoiceOver announces errors/status changes and identifies Accept, Copy, manual
      submit, and Create your own household controls.

## Result table

| Scenario | Result | Observed (no private values) | Follow-up issue |
| --- | --- | --- | --- |
| 0 — existing owner / unused-link preservation | NOT RUN | | |
| A — existing household and same puppy | NOT RUN | | |
| B — manual replacement | NOT RUN | | |
| C — unavailable and explicit fallback | NOT RUN | | |
| Authorization/privacy negatives | NOT RUN | | |
| Native Stage 4 / accessibility | NOT RUN | | |

## Approved-SE preflight evidence — 2026-07-24

| Check | Result | Observed (no private values) |
| --- | --- | --- |
| New account can enter as owner without inviting itself | PASS | OTP reached normal owner setup; no invite/manual-code gate appeared. |
| Owner opens own unused invite | PASS | `already_member` preserved Owner and did not consume the link. |
| Distinct account initial acceptance | PASS | Invitee initially reached the owner's populated household as Caregiver. |
| Invitee cold Release launch | PASS | Two full process restarts restored the populated shared household; no empty household was selected. |
| Caregiver household role badge | PASS | The live screen reported Caregiver. |
| Caregiver access copy and owner controls | PASS | The live screen says the owner manages access and renders no invitations section or Invite action. |
| Final serialized-bootstrap Release restart | PASS | A fresh Hermes v96 bundle restored the same populated shared household after a full process restart; Family & Access remained honestly Caregiver. |

The earlier cold-start and caregiver-honesty failures were rerun after the dev migrations and now
pass on the approved SE. The bootstrap RPC now also serializes concurrent first-session resolution
for one user before membership lookup. The broader physical-device, manual-fallback,
unavailable-link, accessibility, and cross-device refresh rows remain separate owner-run checks.

## Completion rule

PUP-42 device acceptance is complete only when Scenario A is `PASS`, including the same-puppy
and cross-device event checks, and all negative/privacy cases are either `PASS` or linked to a
named follow-up. A local green test suite is implementation evidence, not a substitute for this
owner-run verification.
