# 14.2 — Puppy Profile Settings
Route: `/settings/puppy-profile`   Atlas: `docs/design/v1/screenshots/more/14-2-default.png`, `14-2-editing.png`
Device sizes: SE compact primary; atlas baseline 393x852
Allowed deviations: atlas route `/more/puppy-profile` is implemented as `/settings/puppy-profile` under the V2 Pet/More IA. Photo change, breed picker/search, sex picker, optional weight/microchip/note editing, native DatePicker replacement, and durable pending/error/offline data wiring beyond the current save mutation remain deferred. Deterministic loading/pending/error/offline/permission state templates are synthetic handoff states until full profile data wiring is broadened.

## Anatomy (top -> bottom)
- Modal header — back affordance to More/Pet, title `more.puppy-profile.screen-title`, trailing Edit or Save action.
- Avatar hero — circular avatar, edit badge, disabled Change photo affordance.
- Saved view sections — About and Optional groups with settings rows, chevrons on deferred editable rows, and the privacy hint card.
- Editing form — name field, age/birth-date segmented control, age/date input, deferred optional rows, and save/cancel actions.
- State templates — primitive card with status pill, icon, title, and body for loading, pending write, error, offline read, and permission denied.

## Tokens
- screen spacing: existing `Screen` / `Stack` rhythm.
- avatar edit badge: `surface.raised`, `stroke.default`, `radius.full`.
- state cards: shared `Card`, `StatusPill`, `AppIcon`, `AppText`; offline uses muted surface.

## States covered
- Saved profile view — production shell with synthetic or live puppy profile metadata.
- Editing form — production shell for durable name / age / birth-date save.
- Loading, pending write, load/save error, offline read, and permission denied — deterministic synthetic handoff states.
- Breed picker/search, photo edit, sex picker, optional field editors, native DatePicker, and offline queue — deferred.

## Accessibility
- Header actions are buttons with localized labels.
- Change photo is exposed as a disabled button until photo editing exists.
- State cards use stable `puppy-profile-state-*` test IDs. Loading and pending write announce politely; error and permission denied use alert semantics.
- State copy must not expose raw puppy names, notes, emails, provider names, photos, tokens, or private contact data.

## Notes / deferred
- Stage 4 for saved/editing atlas states is already covered by the route's existing evidence. This card adds deterministic global-state handoff coverage.
