# dogfood.notification.permission — Reminder primer and fallback

Route: post-save primer + `/(tabs)/more/notifications` fallback
Atlas: `dogfood.permission.01`
Screenshot: `docs/design/v2/screenshots/dogfood-core-loop/permission-primer-reference.png`
Source board: `ScreenPermissionPrimer` / `10-permission-primer`
Device sizes: iPhone SE 3 compact portrait (primary)
Status: proposed Stage 0 extension; user approval pending.

Allowed deviations: primer appears only after explicit first-routine save; denied fallback uses the
actual OS status; authorized return removes denied copy and shows enabled state.

## Anatomy (top → bottom)

- Centered reminder icon and `Remind you?` title.
- Short privacy-safe explanation: only planned routines, no private title/note content.
- Primary Continue (requests OS permission only here).
- Secondary Not now (routine remains enabled in Diary).
- Denied variant: calm inline status + Open Settings; no repeated OS request.
- Authorized-return variant: enabled confirmation and Done, without a denied card.

## Tokens

- Raised modal/card, info tint for explanation, primary CTA, secondary ghost action, 44pt minimum.

## States covered

- not determined; denied; authorized after Settings return; loading OS state; recoverable error.

## Accessibility

- Primer is a modal with ordered heading/body/actions; permission state is announced as text.
- Open Settings and Not now are explicit buttons; no status depends on icon/color alone.

## Notes / deferred

- Notification title/body use canonical event label and scheduled time only.
- Screenshot is a fresh rerendered primer board; denied/authorized-return exports remain required
  before their UI implementation.
