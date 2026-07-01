# V2 design reference — recovered from the Miro design-freeze export

**This is the canonical visual + token source of truth for the V2 redesign.**
Everything here was extracted losslessly from the user's Miro board export
(`Imported HTML.html`, board `uXjVHA5hn48=` — "PuppyPlan V2 — Design Freeze Canvas").
The screens were stored gzip+base64 inside the export's bundler manifest; they are
decompressed here into readable source. This is higher fidelity than screenshots:
exact JSX, inline styles, token usage, and every state.

> Provenance note: the good "Clay" design state the team feared was overwritten in
> Codex/Open Design is **intact** and preserved here. Treat these files as read-only
> reference — do not hand-edit; re-extract from the export if the board changes.

## Files

| File | What it is |
|------|-----------|
| `miro-prototype.full.html` | The complete, self-rendering prototype (1.6 MB). Open in a browser → all 32 screens at original size/quality. Use for visual verification. |
| `tokens.reference.css` | The canonical Clay token system (139 `--pp-*` vars): surfaces, text, primary/accent/sage ramps, semantic + status-pill fills, spacing, radii, elevation, fonts. **Source of truth for the `design-tokens.json` migration.** |
| `diary-create.screens.jsx` | Section 2 (Diary, 9 screens) + Section 3 (Create/Quick Log/Schedule, incl. native time pickers, permission, routine success). |
| `pet.screens.jsx` | Section 4 (Pet tab + states). |
| `more-reminders-paywall.screens.jsx` | Section 5 (More, Routines list, Reminders, delete confirm, Paywall). |
| `sharing.screens.jsx` | Section 6 (Family + Trainer sharing, invite/preview/accepted/revoked). |

## Canonical Clay tokens (summary — see `tokens.reference.css` for all 139)

- **Surface** base `#F6EFE3` · raised `#FFFCF6` · sunken `#ECE3D4` · overlay `rgba(255,252,246,.96)` · scrim `rgba(40,30,22,.34)`
- **Text** primary `#2C2824` · secondary `#6B6256` · tertiary `#8A7E6C` · disabled `#A99E8C` · on-primary `#FFF7EF` · link `#B26A3C`
- **Primary (Clay)** 50 `#FBF2EA` · 500 `#C77F4F` · 600 `#B26A3C` · 700 `#8C5028` · 800 `#5E3318`
- **Accent (Honey)** 100 `#FBEFD9` · 500 `#E3A53C` · 700 `#B07A1E`  ·  **Sage** 100 `#E8EEDD` · 500 `#84A06A` · 700 `#5E7A3E`
- **Semantic** success `#5C7A45` · warning `#A87A2A` · danger `#A24A3C` · info (mauve) `#6E5862` (+ `*-tint`)
- **Status pills** template · needs-vet-review · confirmed · completed · pending · failed · urgent (each a fill+text pair)
- **Spacing** 4/8/12/16/20/24/32/40/56 · **Radii** sm 10 · md 14 · lg 20 · xl 28 · full 999 · **Elev** 1/2/3
- **Fonts** body Nunito · display Lora · mono SF Mono

## Screen map (section → artboard → component → file)

**2 — Diary** (`diary-create.screens.jsx`): `ScreenDiaryDay` (4·populated) · `ScreenDiaryPast` (5) · `ScreenDiaryHistory` (5b) · `ScreenDiaryColdStart` (6) · `ScreenDiaryEmpty` (6b) · `ScreenDiaryAllDone` (6c) · `ScreenDiaryStates` (7) · `ScreenWeekSelectedDifferent` (7b) · `ScreenFirstDiaryAfterOnboarding` (15).
**3 — Create** (`diary-create.screens.jsx`): `ScreenAddChooser` (8·Add chooser/Quick Log) · `ScreenSchedule` (9·routine setup) · `ScreenNativeTimePickerIOS` (9b) · `ScreenNativeTimePickerAndroid` (9c) · `ScreenPermissionPrimer` (10) · `ScreenFirstRoutineSuccess` (10b) · `ScreenRoutineMenu` (11) · `ScreenPausedRoutineRecovery` (11c) · `ScreenComponentContracts` (0b).
**4 — Pet** (`pet.screens.jsx`): `ScreenPetTab` (12·profile) · `ScreenPetStates` (13).
**5 — More** (`more-reminders-paywall.screens.jsx`): `ScreenMore` (14) · `ScreenRoutinesList` (11b) · `ScreenReminders` · `ScreenReminderPush` · `ScreenDeleteConfirm` · `ScreenPaywall`.
**6 — Sharing** (`sharing.screens.jsx`): `ScreenFamilyList` (15) · `ScreenFamilyInvite` (16) · `ScreenFamilyInviteSent` (17) · `ScreenTrainerScope` (18) · `ScreenTrainerPreview` (19) · `ScreenTrainerAccepted` (20) · `ScreenRevokedExpired` (21).

## Shared primitives to build (defined inside the modules)

Diary/Create: `DiaryHeader` `WeekStrip` `InfoHero` `RoutineCard` `FactCard` `DayDivider`
`ChooserSlab` `RepeatPill` `IconChip` `StarterAction` `HistoryEvent` `HistoryFilterBar`
`NativeTimeRow` `IOSWheelColumn` `AndroidClockFace` `CheckCircle` `FeedbackNote` `TimeGutter`.
Pet: `PetHero` `PetMetric` `HealthLine`. More: `PillButton2` `PlanCard`
`RoutineManagementRow` `PermissionInline`. Sharing: `SimpleHeader` `SummaryRow` `BulletRow`.
Base primitives (`Phone` `Icon` `Avatar` `TabBar` `Pill`) live in the bundle's shared
module inside `miro-prototype.full.html` — read there if exact base styles are needed.

## How to use this

- **Building a screen:** read its component in the module file for exact anatomy, tokens,
  spacing, and states; open `miro-prototype.full.html` to see it rendered. Follow the
  design-fidelity pipeline (lock spec card → primitives → build → anatomy tests → compare).
- **Token migration:** port `tokens.reference.css` into `design-tokens.json` (still cold),
  regenerate `src/design/tokens.ts`, then `npm run tokens:check`.
