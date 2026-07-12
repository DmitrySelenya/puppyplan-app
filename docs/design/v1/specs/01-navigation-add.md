# 01 — Navigation & Add
Route: root tabs / Add overlay   Atlas: Open Design V2 boards `Split navigation`, `Add chooser overlay`
Device sizes: iOS 390x844, Android 412x900, SE compact for native verification
Allowed deviations: custom-rendered capsule chrome is permitted; routing and accessibility remain native (expo-router tabs + native roles).

## Anatomy — resting state

- **Floating left capsule** with exactly three tabs: Diary, Pet, More. Detached from the screen edges (does not span full width), sitting above content on a warm floating shadow.
- **Separate circular Add button** to the right of the capsule, visually detached by a **16–20pt gap**. It is NOT a fourth tab and NOT centered between tabs.
- Nav floats above scrolling content, separated by shadow/backdrop. No full-width solid tab bar.

## Anatomy — Add-open state (LOCKED — this is where prior builds drifted)

When Add is pressed, the chooser opens and ALL of the following happen together:

1. **The three-tab capsule disappears entirely** — it is removed (faded/slid out), not merely dimmed. While the chooser is open there is no visible tab capsule.
2. **The Add button morphs in place from `+` to `×`** — same position and size, the glyph cross-fades/rotates from plus to close. It does not move and is not replaced by a separate close control elsewhere.
3. **Background dims** — a scrim sits over the page content behind the overlay. Blur is a progressive enhancement (requires `expo-blur`); scrim alone is the baseline and ships first.
4. **Two slabs rise from the bottom**: `Quick Log` and `Schedule`. Each is a large, full-width tappable slab (not a small tile), stacked with clear separation. A **drag-handle** sits at the top of the sheet.

Closing (tap `×`, tap the scrim, or drag the sheet down) reverses all four: slabs descend, scrim+blur clear, the capsule fades back in, and `×` morphs back to `+`.

## Tokens

- Capsule: raised cream surface (`color.surface.raised`), pill radius (`radius.full`), warm floating shadow (`elevation.2`).
- Add: filled `primary/600`, 56–64pt, white glyph.
- Active tab: filled icon (or structural pill) **plus** terracotta label — color alone is never the only active signal.
- Scrim: `color.surface.scrim`. Slabs: `color.surface.raised`, top radius `bottomSheet.radiusTop`, `elevation.2`. Drag-handle: `bottomSheet.dragHandle`.
- Motion: open/close on `motion.duration.base` with `motion.easing.emphasized`. Morph uses the same duration.

## States Covered

- Resting nav; each active-tab example (Diary / Pet / More); Add-open overlay (capsule hidden, `×`, scrim+blur, two slabs + handle); closing/scrim-tap.

## Accessibility

- Capsule is one `tablist` containing exactly three tabs.
- Add is a separate button outside the tablist — never a fourth tab. Label `Add` when resting, `Close` (or localized equivalent) when the chooser is open.
- Resting focus order: Diary, Pet, More, Add.
- At `fontScale >= 2`, the three tabs switch to icon-only visual chrome; each localized tab name
  remains on its tab through `accessibilityLabel`, with selected state and focus order unchanged.
- When the chooser is open: the capsule is removed from the accessibility tree, focus moves into the sheet, and the two slabs are buttons. Closing returns focus to the Add button.

## Reduced motion

- Honor `prefers-reduced-motion` (`motion.reducedMotion`): cross-fade the sheet instead of slide-up; cross-fade the `+`/`×` glyph instead of rotating; no parallax.

## Notes / Deferred

- No centered Add between tabs and no full-width solid tab bar in V2 screens.
- A persistent absolute bottom-right FAB is a V1 pattern and is explicitly NOT the V2 Add. (Prior WIP shipped this by mistake.)
