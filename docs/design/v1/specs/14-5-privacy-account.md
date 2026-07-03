# 14.5 — Privacy & Account
Route: `/settings/privacy-account`   Atlas: `docs/design/v1/screenshots/more/14-5.png`, `14-6.png`
Device sizes: SE compact primary; atlas baseline 393x852
Allowed deviations: atlas route `/more/privacy` is implemented as `/settings/privacy-account` under the V2 More IA. Export and delete remain shell-only until backend jobs are scoped. Deterministic loading/pending/error/offline/permission state templates are synthetic handoff states, not live export/delete/account-job wiring.

## Anatomy (top -> bottom)
- Modal header — back affordance to More, title `more.privacy.screen-title`.
- Consent sections — analytics and error-report switch rows with privacy-safe helper copy.
- Data section — export row and local export-request notice.
- Account section — delete preview row and shared sign-out action.
- Delete confirm preview — typed confirmation field, disabled destructive action until localized confirmation word matches.
- State templates — primitive card with status pill, icon, title, and body for loading, pending write, error, offline read, and permission denied.

## Tokens
- screen spacing: existing `Screen` / `Stack` rhythm.
- state cards: shared `Card`, `StatusPill`, `AppIcon`, `AppText`; offline uses muted surface.
- danger affordance: design `status.danger` only on the delete row icon and confirm card border.

## States covered
- Default privacy/account shell — production UI-only settings surface.
- Delete confirm preview — local shell state; no live account deletion.
- Loading, pending write, load/save error, offline read, and permission denied — deterministic synthetic handoff states.
- Real export job, account deletion job, analytics/error-report persistence, schema/native modules, and native project edits — deferred.

## Accessibility
- Switches and actions use localized labels.
- Sign out remains the shared auth action with its existing localized feedback.
- State cards use stable `privacy-account-state-*` test IDs. Loading and pending write announce politely; error and permission denied use alert semantics.
- State copy must not expose raw puppy names, notes, emails, provider names, photos, tokens, diagnostics payloads, or private contact data.

## Notes / deferred
- Stage 4 for the default shell and sign-out anatomy is already covered by existing route evidence. This card adds deterministic global-state handoff coverage for the privacy/account surface.
