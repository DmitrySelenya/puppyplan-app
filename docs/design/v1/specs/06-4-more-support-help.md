# 06.4 — More Support / Help
Route: `/settings/help`   Atlas: Open Design V2 More/support board, no v1 PNG
Device sizes: SE compact primary; iOS 390x844 and Android 412x900 in the V2 handoff
Allowed deviations: no live support ticket submission, email composer, or diagnostic upload in this slice. The screen is a privacy-safe native help shell only.

## Anatomy (top -> bottom)
- Modal header — back to More, title `more.help.screen-title`.
- Intro card — calm info icon, short body, no private data request.
- Help topics group — three chevron rows: Quick Log, sharing, data/privacy.
- Diagnostic group — app version row, support code placeholder, copy/open contact row.
- Privacy note — explains not to include puppy names, notes, emails, provider names, photos, tokens, or private health text.

## Tokens
- Surface: `surface.raised` cards and settings rows.
- Info/support emphasis: `status.infoTint` and `status.info`.
- Content bottom padding: `layout.tabBarHeight + space[6]`.

## States covered
- Default support shell — production.
- Live ticket submission, uploads, mail composer, and async send states — deferred.

## Accessibility
- Help row in More is an active button with a chevron.
- Each topic/contact row has a visible label and button role.
- Privacy warning is visible text, not color-only.

## Notes / deferred
- This route must not collect, log, or upload private support diagnostics in this slice.
- If a future slice sends diagnostics, it must go through PII-scrubbing observability wrappers and explicit user confirmation.
