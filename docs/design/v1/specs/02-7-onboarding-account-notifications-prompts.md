# 2.7 - Onboarding Account / Notifications Prompts
Route: post-first-value onboarding prompts   Atlas: no standalone v1 PNG artboard; source is `DESIGN.md` §2.1.7 plus Open Design V2 notification overlay anatomy.
Device sizes: SE compact primary, 393x852 atlas family
Allowed deviations: these prompts are post-first-value surfaces only. They must not block Welcome, Puppy Setup, Tracker Selection, Plan Reveal, or First Log. The old v1 PNG atlas has no separate 2.7 artboard, so Stage 4 must compare against a fresh native capture plus the Open Design V2 modal/sheet anatomy instead of an existing PNG.

## Anatomy (top -> bottom)
- Account prompt sheet - modal/sheet surface with calm icon bubble, title `onboarding.account-wall.title`, body, Apple / Google / Email actions, and tertiary `Not now`.
- Notification prompt sheet - modal/sheet surface with bell/info icon bubble, title `onboarding.notifications-prompt.title`, body, primary enable action, and tertiary `Not now`.
- Trigger rule - both prompts happen only after first value. Account prompt is triggered by invite, premium, or multi-device intent. Notification prompt appears after first reminder or first log trigger, not immediately at first app open.

## Tokens
- SheetSurface uses raised surface, top radius/elevation, and default drag handle.
- Icon bubbles use `status.infoTint` / `status.info` for calm permission/account context.
- Primary action uses `Button` primary; alternate auth actions use secondary; `Not now` uses tertiary.

## States covered
- account prompt - production preview anatomy.
- notification prompt - production preview anatomy.
- system permission dialog handoff - deferred to platform runtime; the in-app prompt remains testable here.

## Accessibility
- Each sheet has a modal accessibility label.
- Icon-only visuals are decorative; action buttons expose localized labels.
- Prompt copy is explicit that skipping is allowed and does not punish the user.

## Notes / deferred
- The 48-hour re-prompt scheduler and actual OS notification permission request are product/runtime behavior and remain deferred.
