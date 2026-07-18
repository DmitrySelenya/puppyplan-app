# PuppyPlan Dogfood Core Loop — Native Design Override

This page override supersedes the generic generated master where it conflicts with the
PuppyPlan V2 native design freeze. It is the visual contract for the Stage 0 dogfood slice.

## Creative direction

**Quiet confidence:** an editorial, warm-light care journal that feels at home on iOS. The
quality signal comes from hierarchy, restraint, tactile feedback, and excellent empty/error
states—not decorative effects. The surface should feel like a beautifully printed field journal
with native controls, never a dashboard or a toy.

## Tokens

- Canvas: `#F6EFE3`; raised surface: `#FFFCF6`; sunken surface: `#ECE3D4`.
- Primary Clay: `#B26A3C`; pressed Clay: `#8C5028`; primary tint: `#FBF2EA`.
- Sage completion: `#5E7A3E` on `#E8EEDD`; Honey fact: `#B07A1E` on `#FBEFD9`.
- Text: `#2C2824` / `#6B6256` / `#8A7E6C`; no low-contrast placeholder copy.
- Display: Lora. UI/body: Nunito. Dynamic Type remains uncapped by fixed-height cards.
- Spacing: 4/8/12/16/20/24/32/40/56. Radius: 10/14/20/28.
- Elevation: one restrained raised shadow for cards and one sheet shadow; no floating glass.

## Interaction contract

- Every target is at least 44pt; primary Add is 56pt. Keep 8pt minimum between adjacent targets.
- Use platform-native time/date pickers. Never imitate an iOS wheel in React Native.
- Fast lane remains one tap for simple trackers; detail lane progressively discloses time, note,
  and variant fields. Preserve drafts on validation/network failure.
- Use one calm transition at a time (150–250ms); use opacity/cross-fade under Reduced Motion.
- Status always combines icon + label; color never carries meaning alone.
- Notes are represented by a private-note indicator in dense cards; never preview raw text.

## Stage 0 surfaces

- Detailed composer: title + event chips, time row, optional note field, event-specific controls,
  neutral inline validation, and a single save action. Viewer state is visibly read-only.
- Schedule: event, native time, repeat, optional amount/duration/note, and save. Permission primer
  appears after successful save, never on mount.
- Diary: mixed plan/fact chronology, planned and actual times together, neutral “Not logged”,
  clear check-off affordance, and explicit pending/error/retry states.
- Permission: warm primer before OS prompt; denied state keeps routines usable and offers Settings;
  authorized return confirms the actual OS state.

## Quality bar

- WCAG AA contrast for all retained text, VoiceOver labels for every action, and a tested XXL state.
- No gradients, emoji icons, full-screen blur, shame language, streaks, or bright red warnings.
- Reference fixtures contain synthetic labels only (`Sample puppy`, `Puppy`, and generic notes).
