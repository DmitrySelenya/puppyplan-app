# 01 — Navigation & Add
Route: root tabs / Add overlay   Atlas: Open Design V2 boards `Split navigation`, `Add chooser overlay`
Device sizes: iOS 390x844, Android 412x900, SE compact for native verification
Allowed deviations: custom-rendered tab bar is permitted only for the bar chrome; routing and accessibility remain native.

## Anatomy

- Floating left capsule with exactly three tabs: Diary, Pet, More.
- Separate circular Add button to the right, visually detached by 16-20pt gap.
- Add opens a two-slab chooser: Quick Log and Schedule.
- Add may morph to close while chooser is open.
- Nav remains pinned and separated from scrolling content by shadow/backdrop.

## Tokens

- Capsule: raised cream surface, pill radius, warm floating shadow.
- Add: filled `primary/600`, 56-64pt.
- Active tab: filled icon or structural pill plus terracotta label; color alone is not enough.

## States Covered

- Resting nav, active tab examples, Add open overlay, scrim/close state.

## Accessibility

- Capsule is one `tablist` with three tabs.
- Add is a separate button outside the tablist, not a fourth tab.
- Focus order: Diary, Pet, More, Add.

## Notes / Deferred

- No centered Add between tabs and no full-width solid tab bar in V2 screens.
