# Sharing / Sitter / Trainer V2 Design Lock

Date: 2026-06-23
Status: Locked (design intent) · implementation = PUP-27/28/29 (Phase 4)

> Design lock for the recipient-facing and owner-facing sharing surfaces, reflecting
> the agreed access model in `docs/design/v2/decisions/2026-06-23-sharing-access-model.md`.
> Same role as the other `*-v2.md` locks: it is the structural contract Cloud Design and
> native implementation must match.

## Sources

- `docs/design/v2/decisions/2026-06-23-sharing-access-model.md` (the agreement)
- `docs/design/v2/raw/screens/sharing.jsx`, `sitter.jsx`, `cards.jsx`, `more.jsx`
- `docs/design/v2/raw/uploads/DESIGN.md` Part 3 (§3.1–3.5)
- `docs/design/v2/raw/uploads/puppyplan-prd-v2.md` (Family / Trainer Sharing, Onboarding)
- `docs/architecture/09-sharing-and-permissions.md`, `adr/0009-sharing-projections.md`,
  `adr/0018-sharing-surface-split-web-trainer-app-sitter.md`,
  `05-navigation-and-deeplinks.md`, `screen-states-matrix.md`

## The single structural rule

Recipient surfaces split by **render context**:

- **`Phone` (in-app):** owner sharing controls, sitter accept, sitter home, sitter
  checklist. These are the same iOS app.
- **`WebFrame` (browser):** trainer live view, card "revocable link" recipient view,
  and their shared revoked/expired state. **No iOS tab bar, no FAB, no "app" chrome,
  responsive (desktop + mobile browser), "no account needed."** Anything a non-member
  recipient sees lives here — never inside `Phone`.

`ScreenTrainerAccepted` (currently `Phone`) is the canonical example of the bug we are
fixing: the trainer never opens the app.

## Locked anatomy

### A. New web primitive — `WebFrame`
- Browser window chrome (address bar showing the share host), responsive container.
- Header band: puppy name + "доступ от {owner}", small "PuppyPlan" watermark,
  a read-only marker, and "Активно до {date}".
- Footer: soft "Get PuppyPlan" hook (not a wall, not a gate).
- One neutral unavailable state `WebShareUnavailable` for expired/revoked/used/invalid,
  identical copy in all four cases (privacy symmetry, DESIGN.md §3.3.6 / §3.5).

### B. Trainer (web) — replaces in-app §3.3.5
- `WebTrainerShare`: `WebFrame` + scoped header card (included scopes, compact) +
  routine summary (7-day) + training notes, exactly the projection from
  `09-sharing-and-permissions.md`. No write controls.
- Explicit live-data line: "Эта страница обновляется по мере того, как {owner}
  записывает активность."
- Explicit no-account / read-only line: "Только просмотр. Аккаунт не нужен. Закрыть
  доступ может только владелец."
- Empty-per-scope, loading, and unavailable states per the matrix.

### C. Trainer owner-side — link-first (§3.3.2 / §3.3.3 stay in `Phone`)
- Scope selector unchanged (ScopeToggleRow, included/excluded, `health_summary` off
  by default).
- Preview's **primary action = "Создать ссылку" / "Скопировать ссылку"**; "Отправить
  на email" demoted to optional. After creation: a link card with Copy / Share /
  Revoke / expiry / `token_last4` (reuses the §3.3.4 active-share controls).
- Hard-locked copy (header "Этот доступ включает:", excluded "Не включено:",
  "Вы можете закрыть доступ в любой момент") preserved.

### D. Sitter (in-app) — rich PRD model, one-step entry, badged home
- **One-step "Поделиться с пэтситтером":** one flow collects person (email/link) +
  window + checklist, then sends an invite link. Replaces the old "invite caregiver
  first, then enable sitter mode" sequence (§3.2.1 `no-caregiver` state retired).
- **Invitee accept (extends §3.1.4):** "Вы будете помогать с {puppy}" → thin sign-in
  (email code / Apple / Google, one tap) → "Готово" → lands in the sitter checklist.
  Recoverable identity only (no anonymous accept).
- **Shared-access home + switcher (NEW):** the shared puppy appears alongside the
  sitter's own puppies, in a "Вы подсиживаете" group, with a distinct tint + a "Sitter"
  badge. The nav puppy name is a tappable switcher (puppy list with role labels). This
  is the "sitter already has a pet" case, made visible.
- **Reduced sitter window = the checklist view (§3.2.2)** with the deadline strip; no
  settings, billing, sharing, or health-edit. Completion-push to owner stays (§3.2.3).
- Owner status + exit (§3.2.3 / §3.2.4) unchanged.

### E. Cards (in-app builder, web recipient)
- Builder / preview / share-options / list (§3.4) unchanged in `Phone`.
- The "Ссылка с возможностью закрыть" recipient view renders through the **same
  `WebFrame`** as the trainer (different projection). The snapshot (image/file)
  artifact is unchanged and stays non-revocable.

### F. More entry-point IA (more.jsx)
- Under "Sharing", split the single "Trainer / sitter" row into distinct rows:
  `Family & sitter` (in-app people) and `Trainer link` (web), plus `Shared cards`.

## Out of scope

- No native implementation (PUP-27/28/29 own it, trust layers before UI).
- No trainer account or "my clients" aggregation (Phase 2).
- No new data-model changes beyond the existing `sitter` membership flag and
  `share_scope` projection layer.
- No paywall, no separate sitter/trainer onboarding wizard beyond the accept flow.

## Gate (when built)

- `WebFrame` recipient artboards must NOT render iOS tab bar / FAB / app chrome.
- Permission preview must be generated from the same projection as `WebTrainerShare`
  (owner sees exactly what the trainer will see).
- Trainer/card web views never SELECT base rows; projection only (RLS/Edge enforced).
- Revoked/expired/used/invalid all reach one identical neutral web state.
- Sitter accept refuses anonymous identity; sitter window/checklist/completion-push
  preserved; shared puppy is badged and switchable.

## Allowed deviations

- `V2-SHARE-WEBFRAME-NEW`: `WebFrame` and the web recipient artboards are net-new and
  have no prior V2 atlas PNG; the in-app `Phone` trainer-accepted artboard is retired,
  not matched.
- `V2-SITTER-ONESTEP-MERGE`: the §3.2.1 enable flow is merged with invite creation;
  the standalone "no-caregiver → invite first" state is intentionally removed.
