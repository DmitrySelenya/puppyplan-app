# Design Runtime

`src/design` is the only UI infrastructure zone.

PUP-2 keeps this area intentionally small: only the wrappers needed by the app shell live here. Token generation, full native primitive coverage, haptics, motion, accessibility helpers, and the dev component gallery remain owned by the PUP-7 follow-up phases.

`Screen` is scroll-first for placeholder shell content. Before real Quick Log sheets, FAB-overlaid fixed layouts, or other fixed-height flows land, add a design-owned non-scrolling variant instead of bypassing `src/design`.
