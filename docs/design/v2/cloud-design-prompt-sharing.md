# Cloud Design handoff prompt — Sitter & Trainer rework

> Paste the block below into the Cloud Design (claude.ai/design) chat for the
> PuppyPlan_V2 board. It is self-contained, but **the more of our docs you attach,
> the more faithful the result.** Recommended attachments, in priority order:
>
> 1. `docs/design/v2/specs/sharing-sitter-trainer-v2.md` (the design lock)
> 2. `docs/design/v2/decisions/2026-06-23-sharing-access-model.md` (the agreement)
> 3. `docs/design/v2/raw/uploads/DESIGN.md` Part 3 (§3.1–3.5 — anatomy, copy, tokens)
> 4. `docs/architecture/09-sharing-and-permissions.md` (exact projection fields)
> 5. The current `sharing.jsx`, `sitter.jsx`, `cards.jsx`, `more.jsx` are already in
>    the board — reference them by filename.
>
> Tell the agent to follow the design lock spec where any detail conflicts with this
> prompt.

---

## PROMPT

You are editing the PuppyPlan_V2 design-canvas board. Keep the existing design DNA
(warm beige base, Calm Teal primary, Ember-Coral accent, Lora display + Nunito body,
muted statuses, iOS HIG patterns) and all existing tokens. This is a surgical rework of
the sharing surfaces, not a redesign. Where this prompt and the attached
`sharing-sitter-trainer-v2.md` lock disagree, follow the lock.

### The one structural rule
Recipient sharing surfaces split by render context:
- **In-app (`Phone`):** owner sharing controls, sitter accept, sitter home, sitter
  checklist.
- **Browser (`WebFrame` — NEW):** trainer live view and the card "revocable link"
  recipient view, plus their shared revoked/expired state. No iOS tab bar, no FAB, no
  app chrome; responsive; "no account needed."
A trainer never opens the app. The current in-app `ScreenTrainerAccepted` is the bug to fix.

### 1. New primitive — `WebFrame`
Create a `WebFrame` artboard wrapper (sibling to `Phone`): browser-window chrome with a
visible share host in the address bar, responsive content column, a header band (puppy
name + "доступ от {owner}", small PuppyPlan watermark, a read-only marker, "Активно до
{date}"), and a soft "Get PuppyPlan" footer (not a wall). Also create one
`WebShareUnavailable` state inside `WebFrame`: centered neutral "Этот доступ больше
недоступен" + "Свяжитесь с владельцем, если нужен новый доступ." — identical for
expired/revoked/used/invalid.

### 2. Trainer — move from app to web
- Replace `ScreenTrainerAccepted` (in `sharing.jsx`, currently inside `Phone`) with
  `WebTrainerShare` rendered in `WebFrame`. Same content as today (scoped header card,
  routine summary last 7 days, training notes, "view only" footer) but as a web page.
- Add two explicit lines: "Эта страница обновляется по мере того, как {owner}
  записывает активность." and "Только просмотр. Аккаунт не нужен. Закрыть доступ может
  только владелец."
- Keep `ScreenTrainerScope` (8.1) as-is. In `ScreenTrainerPreview` (8.2): make the
  primary action **"Создать ссылку"**, demote email sending to an optional field, and
  add a follow-up "link created" card with Copy / Share / Revoke / expiry.

### 3. Sitter — one-step invite, accept flow, badged home
- Add an owner one-step flow "Поделиться с пэтситтером" that collects person + window +
  checklist on one screen and sends an invite link (merge the §3.2.1 enable screen with
  invite creation; drop the "no-caregiver → invite first" empty state).
- Add the invitee accept flow (3 small `Phone` states): "Вы будете помогать с {puppy}"
  → thin sign-in (email code / Apple / Google, one tap) → "Готово" → lands in the sitter
  checklist (`ScreenSitterChecklist`).
- Add a shared-access home (`Phone`): the sitter's puppy list with their own puppies
  plus a "Вы подсиживаете" group where the shared puppy is tinted differently and
  carries a "Sitter" badge. Make the nav puppy name a tappable switcher (small sheet
  listing puppies with role labels "мой" / "подсиживаю").
- Keep `ScreenSitterChecklist`, `ScreenSitterOwnerStatus`, `ScreenSitterExit` as-is
  (rich PRD model: deadline strip, checklist, completion update, exit confirm).

### 4. Cards — reuse the web surface
- Keep the builder / preview / share-sheet / list (`cards.jsx`) as-is.
- Add a `WebCardView` recipient artboard rendered in the **same `WebFrame`** (card
  fields projection). The snapshot/image option is unchanged and stays non-revocable.

### 5. More entry points (`more.jsx`)
Split the single "Trainer / sitter" sharing row into: `Family & sitter` (in-app people),
`Trainer link` (web), and `Shared cards`.

### Output
Add the new artboards to the existing sharing sections, preserve canvas arrangement,
and keep every screen's loading / empty / error / revoked-or-expired states consistent
with the rest of the board. Do not introduce new colors, fonts, or token values.
