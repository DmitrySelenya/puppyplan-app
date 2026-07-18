---
name: ux-audit
description: Use when the user asks to review, audit, or "look at" the UX/UI of a feature or screen - runs an eyes-first audit of the live app the way a UX lead would, hunting visual and interaction defects that tests and atlas comparison structurally miss. Screenshots are the input, not the verification.
---

# PuppyPlan UX Audit

An audit answers **"what looks and feels broken in the running app?"** — not "does it match
the artboard?" (that is Stage 4 of `docs/agents/design-fidelity-pipeline.md`) and not "does the
code implement the intent?" (that is `review`). Run it per feature or screen, like a UX lead who
opens the build with no hypothesis and writes down everything that is off.

## The one hard rule

**No findings before screenshots exist.** Reading contracts, tests, specs, and i18n files is not a
UX review — those artifacts describe *intent*, and visual defects live in the gap between intent
and the rendered screen. A confident, detailed, code-derived "design review" is indistinguishable
from a real one on paper and worth nothing. If the app cannot be launched, the audit is BLOCKED;
say so instead of substituting code-reading.

Precedent (2026-07-15): a quick note rendered as a full-screen wall of Lora SemiBold. The contract
said "note becomes the title" — true. The test asserted it — green. Only a screenshot at the
owner's Dynamic Type size showed the defect, and the owner had to take it themselves.

## Setup (mechanics that silently invalidate the audit)

1. **Rebuild the bundle.** The installed sim app is a release build with an embedded
   `main.jsbundle`; it ignores Metro. Back up the original, `npx expo export:embed`, copy it in,
   relaunch. Restore the backup when done. Auditing a stale bundle audits last week's code.
2. **Device:** the approved SE profile from `AGENTS.md` "Mobile E2E" (`Grith iPhone SE 3 iOS 26.3`).
   No other device without explicit user approval.
3. **`idb` coordinates:** screenshots are pixels (750×1334), `idb ui tap/swipe` takes points
   (375×667) — halve. A tap that "did nothing" is usually this.
4. **Synthetic data only** in anything retained (screenshots, docs, Linear, PRs). Never raw puppy
   names, notes, or other private data — repo privacy rule.

## The capture matrix

Every screen/state in scope gets captured under **all** of these, because each axis has produced a
real shipped defect that the others hid:

| Axis | Values | Why |
| --- | --- | --- |
| Font scale | default AND accessibility size (fontScale ≥ 2) | the note-wall defect does not exist at default size |
| Data length | typical AND real-world-long (≈300-char note, long puppy/routine names) | 20-char synthetic fixtures cannot reveal a missing line clamp |
| States | default, empty, error, pending, plus every state the spec card lists | error/pending styling rots unseen |
| Flow | not just the screen — drive the flow through it (save, edit, cancel, scroll) | the both-wheels-open scroll trap was found by accident while driving, never by looking at stills |

Set the accessibility font scale via Settings app on the simulator (or
`simctl spawn booted defaults write -g UIPreferredContentSizeCategoryName UICTContentSizeCategoryAccessibilityL`
+ relaunch), and verify on-screen that it took effect before trusting captures.

## The sweep: whole screen, no hypothesis

For each capture, **look at the entire frame and enumerate everything that is off — including
regions unrelated to the feature under audit.** A screenshot taken to check X and only checked for
X is a probe, not a look; defects sitting in-frame have been missed this way (a card half-hidden
under the nav capsule, a three-line greeting — both visible, both unreported, because the capture
was "for" something else).

Sweep dimensions, in order:

1. **Typography roles** — the display face (Lora) belongs to headings and generated labels only;
   owner-written prose must be in the text face and clamped. Any user-supplied string sitting in a
   slot designed for our generated strings is suspect: check its `fontFamily` and `numberOfLines`.
2. **Truncation & overflow** — text under chrome, mid-word breaks in long names, missing ellipsis,
   content clipped by cards, horizontal overflow.
3. **Visible labels** — every control a sighted user must distinguish needs an on-screen label,
   not only an `accessibilityLabel`. `getByLabelText` passing proves nothing about the screen.
4. **Alignment & spacing** — edges that almost line up, inconsistent gaps between sibling cards,
   hand-coded paddings that drift from token-spaced neighbors.
5. **Hierarchy & consistency** — does the same concept look the same everywhere (one duration
   vocabulary, one time format)? Do primary/secondary/tertiary read correctly?
6. **Interaction** — touch targets on small controls, what scrolling does when expandable controls
   are open, what Save/Cancel actually navigates to, whether menus close when they should,
   keyboard behavior (never auto-pop — owner rule).
7. **State honesty** — does an error state say what is wrong and whether retrying can help? A
   validation problem surfaced as a sync failure is a defect even though a message appeared.

## Generic heuristics source

If the `ui-ux-pro-max` plugin is available, its `ux` domain search is a usable checklist of
generic heuristics (touch targets, form labels, error feedback):

```bash
python3 <plugin>/scripts/search.py "<topic>" --domain ux
```

**Never** apply its style/color/typography/landing domains: PuppyPlan's canon is the Clay tokens
and the atlas under `docs/design/` — a generic palette or font pairing suggestion is a break, not
an improvement. If the plugin is missing, the sweep dimensions above stand alone.

## Report — findings only, no fixes

The audit output is a numbered list, most severe first. Fixing anything mid-audit ends the sweep
early and anchors it on the first defect found; file findings first, fix after, separately (TDD:
a failing test reproducing the finding before the change).

Each finding:

- **What** — one sentence, in plain words, naming the screen and state.
- **Evidence** — the screenshot filename (kept in the session scratchpad; synthetic data only if
  it is to be retained anywhere).
- **Severity** — `broken` (unreadable, data-misleading, blocks a flow) / `off` (visibly wrong,
  flow survives) / `polish`.
- **Bug or decision?** — the auditor's call on whether this is objectively broken or needs the
  owner's ruling. Do not silently fix "decision" items; list them as questions.

Close the report with what was NOT covered (device sizes, locales, states skipped) — a silent gap
reads as "audited and clean".

## Relationship to other skills

- `design-fidelity` — build-time gate against the atlas, per-screen, pre-Done. The audit does not
  replace it and runs on *shipped or dogfooding* features, atlas or no atlas.
- `review` / `review-deep` — code review. The audit deliberately does not read code except to
  locate a defect it has already seen on screen.
- Findings that become fixes go through `tdd`.

`AGENTS.md`, `docs/agents/design-fidelity-pipeline.md`, repo docs, and exact user approvals
override this skill.
