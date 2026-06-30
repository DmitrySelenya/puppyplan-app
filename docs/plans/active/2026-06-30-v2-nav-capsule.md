# V2 Floating Capsule Navigation + Morphing Add — Implementation Plan

> **For agentic workers (Codex):** REQUIRED SUB-SKILL: implement this plan task-by-task, TDD, one commit per task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not skip the "run the test and watch it fail" steps — they prove the test is real.

**Goal:** Replace the default full-width Expo tab bar + bottom-right FAB with the V2 floating capsule (Diary · Pet · More) plus a separate morphing Add button that opens a two-slab Quick Log / Schedule chooser.

**Architecture:** A single custom tab-bar component, `CapsuleTabBar`, is passed to expo-router via `<Tabs tabBar={...}>`. It owns three things sharing one Reanimated open/close progress value: (1) the floating 3-tab capsule, (2) the detached circular Add button, (3) the chooser overlay (scrim + two slabs + drag-handle). The chooser is **local component state**, not a route — so capsule-hide, the `+`→`×` morph, and the scrim are driven by one shared value and are unit-testable without mocking navigation. The slabs navigate to existing routes on press.

**Tech Stack:** React Native, expo-router (`Tabs` custom `tabBar`), react-native-reanimated 4, react-native-gesture-handler, react-native-safe-area-context, `@/design/tokens`, `@/design/primitives`, typed i18n (`@/lib/i18n`). Tests: jest + @testing-library/react-native.

**Canonical spec:** [`docs/design/v1/specs/01-navigation-add.md`](../../design/v1/specs/01-navigation-add.md) — the LOCKED behavior. Read it before Task 1. The plan implements that spec; if they ever disagree, the spec wins and this plan is wrong.

---

## Why this plan exists (diagnosis)

The prior WIP shipped the default Expo `<Tabs>` full-width bar with **five** tabs (two were leaked legacy redirect routes) and a separate absolute bottom-right FAB. None of the V2 nav anatomy was built: no floating capsule, no `+`→`×` morph, no capsule-hide on open, no two-slab chooser. Root cause: the nav spec under-specified the Add-open behavior, so the implementation drifted to a generic default. The fix is to make the spec **executable as tests** (the "Anatomy tests" below), so a correct implementation is the only way to green.

The phantom-tabs half of this was already fixed in commit `d068fb1` (legacy routes hidden via `href: null`). This plan covers the remaining structural redesign.

## Global craft rules (apply to every task; these are review gates)

1. **No hardcoded design values.** Colors, spacing, radii, shadows, durations, easings come from `@/design/tokens` only. No hex literals, no magic numbers for spacing/radius. (Enforced by `scripts/checks/text-hygiene.mjs` + review.)
2. **No raw RN primitives in feature/nav chrome.** Use `@/design/primitives` (`AppText`, `Touchable`, `AppIcon`, etc.) and `react-native-reanimated` `Animated.*`. No bare `Pressable`/`Text` with ad-hoc styling.
3. **Every user-facing string is a typed i18n key.** No string literals in JSX. Add keys under `tabs.*` / `nav.*` and use `t(...)`.
4. **Annotation ≠ content.** Never render internal/dev terms to users (no "Deferred", no "the five Add buttons", no raw route names).
5. **AA contrast.** Active-state must not rely on color alone (filled icon or pill + label). White-on-terracotta uses `primary/600` (`#A94F2F`).
6. **Reduced motion.** Honor `prefers-reduced-motion` via `@/design/motion`: cross-fade instead of slide/rotate.
7. **One commit per task**, message `feat(nav): <task>` or `test(nav): <task>`. Run the listed checks before each commit.

## File structure

- **Create:** `src/design/primitives/CapsuleTabBar.tsx` — the capsule + Add + chooser overlay. One responsibility: the V2 nav chrome.
- **Create:** `src/design/primitives/CapsuleTabBar.test.tsx` — anatomy tests T1–T7 (the executable spec).
- **Modify:** `app/(tabs)/_layout.tsx` — pass `tabBar={(props) => <CapsuleTabBar {...props} />}`; delete the absolute `<FAB>` and the `tabBarStyle`/`isFabLogSurfacePath` machinery.
- **Modify:** `src/contracts/navigation.ts` — add `scheduleAction` (the second slab destination) alongside `quickLogAction`.
- **Modify:** `src/test/tab-layout.render.test.tsx` — the old "persistent FAB bottom-right" assertions encode the V1 pattern and must be replaced with "delegates chrome to CapsuleTabBar" (see Task 7).
- **Add export:** `src/design/primitives/index.ts` — export `CapsuleTabBar`.
- **i18n:** add `tabs.add`, `tabs.add-close`, `nav.quick-log-slab`, `nav.schedule-slab`, `nav.schedule-fab-hint` keys to the locale files (mirror existing `tabs.*`).

---

## Anatomy tests (T1–T7) — the executable spec

These live in `CapsuleTabBar.test.tsx`. They are written against the component directly with a mock `BottomTabBarProps`. They are the contract; the implementation exists to make them green.

Shared test harness (top of the test file):

```tsx
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { primaryTabs, quickLogAction, scheduleAction } from '@/contracts/navigation';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import { CapsuleTabBar } from './CapsuleTabBar';

const mockNavigate = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (href: string) => mockRouterPush(href) },
}));

// Minimal BottomTabBarProps: index + the three primary routes, focused = Diary.
function makeTabBarProps(focusedIndex = 0) {
  const routes = primaryTabs.map((tab, i) => ({ key: `${tab.routeName}-${i}`, name: tab.routeName }));
  return {
    state: { index: focusedIndex, routes },
    navigation: { navigate: (name: string) => mockNavigate(name), emit: () => ({ defaultPrevented: false }) },
    descriptors: {},
  } as never;
}

function renderBar(focusedIndex = 0) {
  return render(
    <AppProviders>
      <CapsuleTabBar {...(makeTabBarProps(focusedIndex) as object)} />
    </AppProviders>,
  );
}

beforeEach(async () => {
  mockNavigate.mockClear();
  mockRouterPush.mockClear();
  await i18n.changeLanguage('en');
});
```

- **T1 — Exactly three tabs in a tablist, Add is not a tab.**
```tsx
it('renders exactly three tabs in one tablist and Add outside it', () => {
  renderBar();
  const tabs = screen.getAllByRole('tab');
  expect(tabs).toHaveLength(3);
  expect(tabs.map((t) => t.props.accessibilityState?.selected)).toEqual([true, false, false]);
  // Add exists as a button, never as a tab.
  const add = screen.getByRole('button', { name: i18n.t('tabs.add') });
  expect(add).toBeTruthy();
  expect(add.props.accessibilityRole).not.toBe('tab');
});
```

- **T2 — No default full-width tab bar chrome.** The capsule is detached, not edge-to-edge. The capsule container carries `testID="nav-capsule"` and must not stretch full width (no `left:0/right:0` spanning; it is centered/insets-padded).
```tsx
it('renders a detached capsule, not a full-width bar', () => {
  renderBar();
  const capsule = screen.getByTestId('nav-capsule');
  const style = require('react-native').StyleSheet.flatten(capsule.props.style);
  expect(style.alignSelf ?? 'auto').not.toBe('stretch');
  // It floats with a radius (pill) and a shadow — not a square top-border bar.
  expect(style.borderRadius).toBeGreaterThanOrEqual(tokens.radius.full ? 1 : 1);
});
```
> Implementer note: assert against the real tokenized values you use (e.g. `borderRadius === tokens.radius.full`, `backgroundColor === tokens.color.surface.raised`). Replace the placeholder expectation above with the concrete token before committing — T2 must pin the floating-pill shape.

- **T3 — Add opens the chooser; glyph morphs `+`→`×`; label flips.**
```tsx
it('opens the chooser and morphs Add into a close control', () => {
  renderBar();
  expect(screen.queryByTestId('nav-chooser')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
  expect(screen.getByTestId('nav-chooser')).toBeTruthy();
  // Same button, now labelled Close (the morph): Add label is gone, Close present.
  expect(screen.queryByRole('button', { name: i18n.t('tabs.add') })).toBeNull();
  expect(screen.getByRole('button', { name: i18n.t('tabs.add-close') })).toBeTruthy();
});
```

- **T4 — Capsule disappears while the chooser is open.**
```tsx
it('removes the three-tab capsule while the chooser is open', () => {
  renderBar();
  expect(screen.getByTestId('nav-capsule')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
  expect(screen.queryByTestId('nav-capsule')).toBeNull();
  expect(screen.queryAllByRole('tab')).toHaveLength(0);
});
```

- **T5 — Scrim + two slabs + drag-handle; scrim closes.**
```tsx
it('shows a scrim, a drag handle, and two slabs; scrim tap closes', () => {
  renderBar();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
  expect(screen.getByTestId('nav-scrim')).toBeTruthy();
  expect(screen.getByTestId('nav-drag-handle')).toBeTruthy();
  expect(screen.getByRole('button', { name: i18n.t('nav.quick-log-slab') })).toBeTruthy();
  expect(screen.getByRole('button', { name: i18n.t('nav.schedule-slab') })).toBeTruthy();
  fireEvent.press(screen.getByTestId('nav-scrim'));
  expect(screen.queryByTestId('nav-chooser')).toBeNull();
  expect(screen.getByTestId('nav-capsule')).toBeTruthy(); // capsule returns
});
```

- **T6 — Slabs navigate to the right routes and close the chooser.**
```tsx
it('routes Quick Log and Schedule slabs to their destinations', () => {
  renderBar();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
  fireEvent.press(screen.getByRole('button', { name: i18n.t('nav.quick-log-slab') }));
  expect(mockRouterPush).toHaveBeenCalledWith(quickLogAction.href);
  expect(screen.queryByTestId('nav-chooser')).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
  fireEvent.press(screen.getByRole('button', { name: i18n.t('nav.schedule-slab') }));
  expect(mockRouterPush).toHaveBeenCalledWith(scheduleAction.href);
});
```

- **T7 — Tab press navigates via the native navigation prop (routing stays native).**
```tsx
it('navigates to a tab route via the navigation prop on press', () => {
  renderBar();
  fireEvent.press(screen.getByRole('tab', { name: i18n.t(primaryTabs[1].labelKey) }));
  expect(mockNavigate).toHaveBeenCalledWith(primaryTabs[1].routeName);
});
```

> Add `import { tokens } from '@/design/tokens';` for T2.

---

## Tasks

### Task 0: Add the Schedule chooser destination to the navigation contract

**Files:** Modify `src/contracts/navigation.ts`; Test `src/test/navigation-contract.test.ts`.

- [x] **Step 1 — Write the failing test.** In `navigation-contract.test.ts`, add:
```ts
it('exposes a schedule chooser action distinct from quick log', () => {
  expect(scheduleAction.href).not.toBe(quickLogAction.href);
  expect(modalRoutes).toContain(scheduleAction.href);
});
```
(Import `scheduleAction` at the top.)
- [x] **Step 2 — Run it, watch it fail.** `npx jest src/test/navigation-contract.test.ts` → FAIL (`scheduleAction` undefined).
- [x] **Step 3 — Implement.** In `navigation.ts`, after `quickLogAction`, add:
```ts
export const scheduleAction = {
  id: 'schedule',
  href: '/quick-log/schedule',
  labelKey: 'nav.schedule-slab',
  accessibilityHintKey: 'nav.schedule-fab-hint',
} as const satisfies {
  id: string;
  href: string;
  labelKey: I18nKey;
  accessibilityHintKey: I18nKey;
};
```
Then add `scheduleAction.href` to the `modalRoutes` array.
- [x] **Step 4 — Run, watch it pass.** Same command → PASS.
- [x] **Step 5 — Add i18n keys** `nav.schedule-slab`, `nav.schedule-fab-hint`, `nav.quick-log-slab`, `tabs.add`, `tabs.add-close` to every locale file (mirror the existing `tabs.diary` shape). Run `node scripts/checks/check-i18n.mjs` → PASS.
- [x] **Step 6 — Commit.** `git add -A && git commit -m "feat(nav): add schedule chooser action to navigation contract"`

Task 0 evidence (2026-06-30): RED `npm run test:unit -- --runTestsByPath src/test/navigation-contract.test.ts` failed on missing `scheduleAction.href`; GREEN targeted test passed 9/9; `node scripts/checks/check-i18n.mjs` passed; `npm run check` passed.

> Note: `/quick-log/schedule` may not have a screen yet. If routing there 404s in the running app, add a minimal sheet route `app/(sheets)/quick-log/schedule/index.tsx` that renders a placeholder Screen with a localized title. Do this only if needed to avoid a dead link; it is not required for T0–T7 to pass.

### Task 1: Capsule skeleton — three tabs + Add, wired into the layout (T1, T2, T7)

**Files:** Create `src/design/primitives/CapsuleTabBar.tsx`, `src/test/capsule-tab-bar.render.test.tsx`; Modify `src/design/primitives/index.ts`, `app/(tabs)/_layout.tsx`.

- [x] **Step 1 — Write failing tests T1, T2, T7** (and the shared harness) into `CapsuleTabBar.test.tsx` exactly as listed above.
- [x] **Step 2 — Run, watch fail.** `npx jest src/design/primitives/CapsuleTabBar.test.tsx` → FAIL (module not found).
- [x] **Step 3 — Implement the resting capsule.** Create `CapsuleTabBar.tsx`. Real skeleton (fill animation in Task 5):
```tsx
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { primaryTabs, quickLogAction, scheduleAction } from '@/contracts/navigation';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Touchable } from './Touchable';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

const TAB_ICON: Record<string, 'book' | 'paw' | 'more'> = {
  'diary/index': 'book',
  'pet/index': 'paw',
  'more/index': 'more',
};

export function CapsuleTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = React.useState(false);
  const focusedRouteName = state.routes[state.index]?.name;

  return (
    <View pointerEvents="box-none" style={[styles.root, { paddingBottom: insets.bottom + tokens.space[2] }]}>
      {!open && (
        <View testID="nav-capsule" accessibilityRole="tablist" style={styles.capsule}>
          {primaryTabs.map((tab) => {
            const selected = tab.routeName === focusedRouteName;
            return (
              <Touchable
                key={tab.routeName}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={t(tab.labelKey)}
                onPress={() => navigation.navigate(tab.routeName as never)}
                style={styles.tab}>
                <AppIcon name={TAB_ICON[tab.routeName]} filled={selected}
                  color={selected ? tokens.color.primary[700] : tokens.color.text.secondary} size={24} />
                <AppText variant="caption"
                  color={selected ? tokens.color.primary[700] : tokens.color.text.secondary}>
                  {t(tab.labelKey)}
                </AppText>
              </Touchable>
            );
          })}
        </View>
      )}

      <Touchable
        testID="nav-add"
        accessibilityRole="button"
        accessibilityLabel={open ? t('tabs.add-close') : t('tabs.add')}
        onPress={() => setOpen((v) => !v)}
        style={styles.add}>
        <AppIcon name={open ? 'close.x' : 'action.add'} color={tokens.color.text.onPrimary} size={28} />
      </Touchable>

      {open && (
        <Chooser
          onClose={() => setOpen(false)}
          onQuickLog={() => { setOpen(false); router.push(quickLogAction.href); }}
          onSchedule={() => { setOpen(false); router.push(scheduleAction.href); }}
        />
      )}
    </View>
  );
}
```
Add a `Chooser` sub-component in the same file (Task 4 fills it; Task 1 may stub it returning `null` so T1/T2/T7 pass without the overlay). Add `styles` via `StyleSheet.create` using ONLY tokens: capsule `backgroundColor: tokens.color.surface.raised`, `borderRadius: tokens.radius.full`, `flexDirection: 'row'`, `alignSelf: 'center'`, elevation via the project's `elevationStyle`/`elevation.2`; add `backgroundColor: tokens.color.primary[600]`, `borderRadius: tokens.radius.full`, width/height 56 for `.add`; `.root` is `position:'absolute', left:0, right:0, bottom:0, alignItems:'center'` with `flexDirection:'row', justifyContent:'center', gap: tokens.space[5]` so the Add sits ~20pt right of the capsule.
- [x] **Step 4 — Wire into the layout.** In `app/(tabs)/_layout.tsx`: add `tabBar={(props) => <CapsuleTabBar {...props} />}` to `<Tabs>`, delete the `<FAB>` block, the `quickLog` style, `isFabLogSurfacePath`, `useSnackbarActive`, and `tabBarStyle`. Keep `headerShown:false` and the three `Tabs.Screen` + the two `href:null` legacy screens. Export `CapsuleTabBar` from `index.ts`.
- [x] **Step 5 — Run, watch pass.** `npx jest src/design/primitives/CapsuleTabBar.test.tsx` → T1/T2/T7 PASS.
- [x] **Step 6 — Commit.** `git commit -m "feat(nav): floating capsule tab bar with detached Add"`

Task 1 evidence (2026-06-30): initial RED at `src/design/primitives/CapsuleTabBar.test.tsx` produced Jest `No tests found`, so the same T1/T2/T7 anatomy tests were moved to the repo's active Jest surface `src/test/capsule-tab-bar.render.test.tsx`; RED then failed on missing `@/design/primitives/CapsuleTabBar`; GREEN targeted tests passed (`capsule-tab-bar`, `tab-layout`, `navigation-contract`, 16/16) and `npm run typecheck` passed. The V1 FAB assertions from Task 7 were retired early in `tab-layout.render.test.tsx` because deleting the FAB in this task otherwise made the required pre-commit gate fail against a known-stale V1 contract.

### Task 2: Add morph + label flip (T3)
- [x] **Step 1** — Un-skip / add T3 to the test file. **Step 2** — run, watch fail (chooser/`nav-chooser` absent). **Step 3** — give `Chooser` a real root `View testID="nav-chooser"` (still minimal). The `+`→`×` glyph swap and label flip are already wired via `open` in Task 1; T3 should pass once `nav-chooser` renders. **Step 4** — run, watch pass. **Step 5** — commit `feat(nav): add-open morphs Add into close and reveals chooser`.

Task 2 evidence (2026-06-30): RED `npm run test:unit -- --runTestsByPath src/test/capsule-tab-bar.render.test.tsx` failed because `nav-chooser` was absent after pressing Add; GREEN passed 4/4 after adding the minimal chooser root; `npm run typecheck` passed.

### Task 3: Capsule hides on open (T4)
- [x] Add T4, run/fail/pass (the `{!open && <capsule/>}` from Task 1 already satisfies it — T4 locks it so it can't regress). Commit `test(nav): lock capsule-hide while chooser open`.

Task 3 evidence (2026-06-30): added T4 to `src/test/capsule-tab-bar.render.test.tsx`; because Task 1 already implemented the hide condition, RED was verified mutation-style by temporarily forcing the capsule to stay mounted while open, which failed on `nav-capsule` still being present; after restoring `!open`, the capsule suite passed 5/5 and production diff was empty.

### Task 4: Scrim + drag-handle + two slabs (T5, T6)
**Files:** Modify `CapsuleTabBar.tsx` (the `Chooser`), `CapsuleTabBar.test.tsx`.
- [x] **Step 1** — Add T5, T6. **Step 2** — run, watch fail. **Step 3** — implement `Chooser`:
```tsx
function Chooser({ onClose, onQuickLog, onSchedule }: {
  onClose: () => void; onQuickLog: () => void; onSchedule: () => void;
}) {
  const { t } = useAppTranslation();
  return (
    <View testID="nav-chooser" style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Touchable testID="nav-scrim" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: tokens.color.surface.scrim }]} />
      <View style={styles.sheet}>
        <View testID="nav-drag-handle" style={styles.dragHandle} />
        <Touchable accessibilityRole="button" accessibilityLabel={t('nav.quick-log-slab')}
          onPress={onQuickLog} style={styles.slab}>
          <AppText variant="headline">{t('nav.quick-log-slab')}</AppText>
        </Touchable>
        <Touchable accessibilityRole="button" accessibilityLabel={t('nav.schedule-slab')}
          onPress={onSchedule} style={styles.slab}>
          <AppText variant="headline">{t('nav.schedule-slab')}</AppText>
        </Touchable>
      </View>
    </View>
  );
}
```
Style `sheet` (bottom-anchored, `backgroundColor: tokens.color.surface.raised`, `borderTopLeftRadius/Right: tokens.component.bottomSheet.radiusTop`, elevation `2`, padding `tokens.space[4]`, `gap: tokens.space[3]`), `dragHandle` (`width: tokens.component.bottomSheet.dragHandle.width`, height `…height`, `borderRadius: tokens.radius.full`, `backgroundColor: tokens.color.stroke.strong`, `alignSelf:'center'`), `slab` (full-width, `minHeight` ≥ 64, `borderRadius: tokens.radius.lg`, `backgroundColor: tokens.color.surface.base`, centered).
- [x] **Step 4** — run, watch pass (T5, T6). **Step 5** — commit `feat(nav): two-slab Quick Log / Schedule chooser with scrim and handle`.

Task 4 evidence (2026-06-30): RED `npm run test:unit -- --runTestsByPath src/test/capsule-tab-bar.render.test.tsx` failed on missing `nav-scrim` and missing Quick Log slab; GREEN passed 7/7 after adding scrim, drag handle, Quick Log/Schedule slabs, scrim close, and slab routing. Scrim is a non-accessible press target (`accessible={false}`) so the Add/Close button remains the single accessibility close control while the test can still press the scrim by testID.

### Task 5: Reanimated motion + reduced-motion fallback
**Files:** Modify `CapsuleTabBar.tsx`; add `CapsuleTabBar.test.tsx` reduced-motion test.
- [x] **Step 1 — Test:** with reduced motion enabled (mock `@/design/motion`'s reduced-motion hook to return `true`), the chooser still opens and closes (cross-fade path), and no error is thrown:
```tsx
it('still opens and closes the chooser under reduced motion', () => {
  // mock the project's reduced-motion hook to true at top of file
  renderBar();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
  expect(screen.getByTestId('nav-chooser')).toBeTruthy();
  fireEvent.press(screen.getByTestId('nav-scrim'));
  expect(screen.queryByTestId('nav-chooser')).toBeNull();
});
```
- [x] **Step 2** — run/fail. **Step 3** — Drive open/close with a Reanimated shared value `progress` (0→1), `useAnimatedStyle` for: capsule opacity+translateY out, sheet translateY in, scrim opacity, Add glyph rotation/cross-fade. Read `@/design/motion` for the existing reduced-motion hook + duration/easing tokens; under reduced motion use opacity cross-fade only (no translate/rotate). Keep the conditional `{!open && capsule}` mount so T4 stays valid; layer the animation on the mounted/unmounting nodes (Reanimated `entering`/`exiting`). **Step 4** — run/pass. Re-run T1–T7 to confirm no regression. **Step 5** — commit `feat(nav): animate capsule/Add/chooser with reduced-motion fallback`.
- [x] **Step 6 — Haptic:** fire a light haptic from `@/design/haptics` on Add open and a selection haptic on tab change (per `tokens.haptic`). Manual check only.

Task 5 evidence (2026-06-30): RED capsule suite failed on `useReducedMotion` not being called and no haptics for Add/tab press; GREEN added Reanimated shared `progress`, animated Add glyph/scrim/sheet styles, reduced-motion no-transform branch, token-derived emphasized easing, `haptic('tapConfirm')` for Add and `haptic('selection')` for tab changes. `src/test/capsule-tab-bar.render.test.tsx` uses a local Reanimated mock and mocked `useReducedMotion` to keep Jest deterministic; targeted `capsule-tab-bar`, `tab-layout`, and `navigation-contract` tests passed 22/22; `npm run typecheck` passed. The Reanimated-heavy `CapsuleTabBar` remains imported directly by `app/(tabs)/_layout.tsx` and intentionally is not exported from the broad `src/design/primitives/index.ts` barrel, so unrelated screen tests that import the barrel do not initialize Worklets.

### Task 6: Manual native verification (simulator)
- [x] Run on iOS sim (see "Running the app" in the kickoff). Verify against the spec's States Covered: resting capsule, each active tab, Add-open (capsule gone, `×`, scrim, two slabs + handle), scrim-tap close. Compare to Open Design boards `Split navigation` and `Add chooser overlay`. Capture a screenshot of each state into the PR description. No code change unless a state is wrong.

Task 6 evidence (2026-06-30): launched the already-installed `com.dmitry-selenya.puppyplan-app` on `Grith iPhone SE 3 iOS 26.3` via JS-over-Metro, then captured synthetic screenshots in `output/v2-nav-capsule-screenshots/`: `01-diary-resting.jpg`, `02-pet-resting.jpg`, `03-more-resting.jpg`, `04-add-open.jpg`, `05-after-scrim-close.jpg`. Runtime snapshots confirmed Add-open exposes `Quick Log`, `Schedule`, and `Close`, with the tab capsule removed from the target tree. Manual visual review found two spec defects: the sheet visually covered the morphed Add/Close control, and the rendered glyph stayed visually `+` because a `close` glyph was also rotated. RED tests were added to `src/test/capsule-tab-bar.render.test.tsx` for both defects; GREEN fixed token-derived nav layering and changed the morph to rotate the original plus glyph into `×`. Updated `04-add-open.jpg` now shows the visible `×` above the chooser sheet; scrim tap returns to the resting More state.

### Task 7: Retire the V1 FAB test assertions
**Files:** Modify `src/test/tab-layout.render.test.tsx`.
- [ ] The suite still asserts the V1 "persistent FAB bottom-right" (`positions Quick Log above the tab bar`, `keeps Quick Log as a persistent FAB`, `limits the Quick Log FAB…`). These describe the deleted pattern. Replace them with a single test that `TabLayout` delegates chrome to `CapsuleTabBar` (e.g. mock `CapsuleTabBar` and assert it is rendered inside `<Tabs tabBar>`), keeping the "renders only the primary tab screens" + "legacy routes hidden" + icon/active-tint tests (those still hold). Do NOT delete coverage — move the Quick-Log-open behavior assertions into `CapsuleTabBar.test.tsx` (T3/T5/T6 already cover it). Run `npx jest src/test/tab-layout.render.test.tsx src/design/primitives/CapsuleTabBar.test.tsx` → PASS. Commit `test(nav): retire V1 FAB assertions, delegate to CapsuleTabBar`.

---

## Definition of done

- [ ] T1–T7 + reduced-motion test green; `tab-layout.render.test.tsx` updated and green.
- [ ] `npm run check` green (lint + typecheck + test + scaffold + tokens + i18n + privacy + text-hygiene).
- [ ] No hardcoded colors/spacing/radii/durations; all from tokens.
- [ ] No user-facing string literals; all typed i18n keys.
- [x] Manual sim verification screenshots for all five states captured locally in `output/v2-nav-capsule-screenshots/` for review before Task 7.
- [ ] No default full-width tab bar and no absolute bottom-right FAB anywhere in `app/(tabs)`.

## Out of scope (separate follow-up plans)

Pet empty-state, dev-copy leaks ("Adjust the five Add buttons", "Deferred" rows), Pet/More duplication, the teal "Done" status pill. Tracked in the design-correction backlog, not here. This plan is nav-only so it ships as one coherent, testable unit.

---

## Kickoff prompt for Codex

> Paste this to start the implementation session.

```
You are RESUMING the PuppyPlan V2 redesign on branch `redesign-v2-nav-codex-wip`.
You stopped mid-task last time when you hit usage limits, leaving uncommitted changes in
your working tree. Before writing ANY code, orient yourself — DO NOT just continue:

  1. Run `git status` and `git log --oneline -8`. The branch HEAD already contains your
     earlier mid-flight work, checkpointed as commit 501d670 ("checkpoint: V2 nav redesign
     WIP"), PLUS newer refinements committed on top of it:
       - c0bcbad  Terracotta Clay design tokens
       - d068fb1  legacy tabs hidden via href:null (app/(tabs)/_layout.tsx) + test
       - a11cb41  tightened nav spec + this capsule plan
       - b112c5a  expo packages aligned to SDK 55 expected versions
       - ceb0973  screen-polish backlog
  2. If your working tree still has leftover uncommitted changes from the interrupted run,
     DO NOT commit or push them on top. They are STALE — older than the commits above — and
     committing them would REVERT those fixes (tokens, app/(tabs)/_layout.tsx, package.json).
     The committed branch is the source of truth. Inspect with `git status` / `git diff`;
     your slice is already captured by 501d670. Discard the stale working-tree changes
     (`git restore .`) so you start from a clean tree at HEAD. Only preserve a change if a
     diff proves it is genuinely new work not present in any commit above — if unsure, ask.
  3. Do not push. Pushing/PRs are the human's call (Release Guardrail).
  4. Only once your working tree is clean and matches HEAD do you start the plan below.

Implement docs/plans/active/2026-06-30-v2-nav-capsule.md task-by-task, TDD.

Read first, in order:
1. docs/design/v1/specs/01-navigation-add.md   (the LOCKED nav spec — source of truth)
2. docs/design/v1/specs/00-foundation-contracts.md
3. AGENTS.md + docs/agents/design-fidelity-pipeline.md
4. The plan itself.

Rules (non-negotiable):
- One commit per task. Run the "watch it fail" step before implementing — a test that
  passes before you write code is a broken test; fix it.
- Tokens only: no hex/rgb literals, no magic spacing/radii/durations. Use @/design/tokens.
- Primitives only: no bare Pressable/Text in the nav chrome. Use @/design/primitives + Reanimated.
- Typed i18n keys only: no string literals in JSX.
- Never weaken a check to make it pass: no eslint-disable / ts-ignore / @ts-expect-error / any,
  no deleting or skipping tests, no editing tsconfig/jest/lint config. Fix the code.
- Do NOT touch the design tokens, ios/ or android/ native files, or the design spec cards.
- Treat the anatomy tests T1–T7 as the contract. If you think a test is wrong, STOP and say so
  rather than changing it to match your implementation.

STOP after Task 5 and post the simulator screenshots for review before continuing to Task 7.

Running the app — IMPORTANT, the from-scratch native build is currently BLOCKED, do not burn
limits on it:
  - expo-sqlite does not compile under this machine's Xcode 26.2 / Swift 6.2.3 (missing
    session-extension symbols + an UnsafePointer.baseAddress source mismatch). `pod install`
    and `expo install --fix` were already done and did NOT fix it — it's an upstream issue.
  - Use the JS-over-Metro path instead (this whole plan is JS/Reanimated, no new native modules):
      npx expo start
    then launch the already-installed PuppyPlan.app in the booted iOS simulator — it loads the
    current JS bundle from Metro. Sign in with "Use debug account".
  - The Supabase Dev project (olymqppxsadsxfrcyskh) must be un-paused/awake for sign-in to work.
  - If you add a NEW native module at any point, the native build must be fixed first — STOP and
    flag it rather than trying to work around the sqlite failure.

After this plan, the next work is docs/plans/active/2026-06-30-v2-screen-polish-backlog.md.
```

---

## Self-review (run by author before handing over)

- **Spec coverage:** resting capsule (T1, T2) ✓; three tabs Diary/Pet/More (T1) ✓; detached Add 16–20pt (Task 1 `.root` gap = `space[5]`) ✓; Add opens chooser (T3) ✓; `+`→`×` morph + label flip (T3) ✓; capsule disappears (T4) ✓; scrim+dim (T5) ✓; two slabs Quick Log/Schedule + drag-handle (T5, T6) ✓; close via scrim (T5) and via × (Task 1 toggle) ✓; tablist a11y + Add-outside + focus order (T1; focus order is DOM order in `.root` → ensure capsule rendered before Add) ✓; reduced motion (Task 5) ✓; native routing preserved (T7) ✓; no full-width bar / no absolute FAB (Definition of done) ✓.
- **Placeholder scan:** T2's token expectation is intentionally flagged for the implementer to pin to the concrete token — every other step has concrete code/commands.
- **Type consistency:** `scheduleAction` shape mirrors `quickLogAction`; `CapsuleTabBar` consumes `BottomTabBarProps` (`state`, `navigation`); icon names (`book`/`paw`/`more`/`action.add`/`close.x`) match `tokens.icon` inventory — implementer must confirm `action.add` and `close.x` resolve in `AppIcon` (they are in `tokens.icon.coreMvp`/`utility`); if `AppIcon` uses different keys, map accordingly.
