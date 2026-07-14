import * as React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  noteAction,
  primaryTabs,
  quickLogAction,
  scheduleAction,
} from '@/contracts/navigation';
import * as haptics from '@/design/haptics';
import * as motion from '@/design/motion';
import { tokens } from '@/design/tokens';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import {
  CapsuleTabBar,
  type CapsuleTabBarProps,
} from '@/design/primitives/CapsuleTabBar';
import { Touchable } from '@/design/primitives/Touchable';

const mockNavigate = jest.fn();
const mockRouterPush = jest.fn();
let mockFontScale = 1;

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperty(Object.create(actual) as typeof actual, 'useWindowDimensions', {
    value: () => ({
      fontScale: mockFontScale,
      height: 667,
      scale: 2,
      width: 375,
    }),
  });
});

jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
    },
    Easing: {
      bezier: () => 'bezier',
      linear: 'linear',
    },
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value,
  };
});

jest.mock('@/design/motion', () => {
  const actual = jest.requireActual<typeof import('@/design/motion')>('@/design/motion');

  return {
    ...actual,
    useReducedMotion: jest.fn(() => false),
  };
});

jest.mock('expo-router', () => ({
  router: { push: (href: string) => mockRouterPush(href) },
}));

function makeTabBarProps(focusedIndex = 0): CapsuleTabBarProps {
  const routes = primaryTabs.map((tab, index) => ({
    key: `${tab.routeName}-${index}`,
    name: tab.routeName,
  }));

  return {
    navigation: {
      emit: () => ({ defaultPrevented: false }),
      navigate: (name: string) => mockNavigate(name),
    },
    state: {
      index: focusedIndex,
      routes,
    },
  };
}

function renderBar(focusedIndex = 0) {
  return render(
    <AppProviders>
      <CapsuleTabBar {...makeTabBarProps(focusedIndex)} />
    </AppProviders>,
  );
}

function getPrimaryActions() {
  return primaryTabs.map((tab) => screen.getByLabelText(i18n.t(tab.labelKey)));
}

function expectPrimaryActionsUnmounted() {
  for (const tab of primaryTabs) {
    expect(screen.queryByLabelText(i18n.t(tab.labelKey))).toBeNull();
  }
}

describe('CapsuleTabBar', () => {
  beforeEach(async () => {
    mockFontScale = 1;
    mockNavigate.mockClear();
    mockRouterPush.mockClear();
    jest.mocked(motion.useReducedMotion).mockReturnValue(false);
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('AC-P33-DOG-NAV-AX exposes iOS primary navigation as separate selected buttons', () => {
    renderBar();

    const capsule = screen.getByTestId('nav-capsule');
    expect(capsule.props.accessible).not.toBe(true);
    expect(capsule.props.accessibilityRole).toBeUndefined();
    expect(screen.queryByRole('tablist')).toBeNull();
    const labels = primaryTabs.map((tab) => i18n.t(tab.labelKey));
    const primaryTouchables = screen.UNSAFE_getAllByType(Touchable).filter(
      (touchable) => labels.includes(touchable.props.accessibilityLabel),
    );
    expect(primaryTouchables).toHaveLength(3);
    expect(primaryTouchables.map((action) => action.props.accessible)).toEqual([true, true, true]);
    expect(primaryTouchables.map((action) => action.props.accessibilityRole)).toEqual([
      'button',
      'button',
      'button',
    ]);
    expect(primaryTouchables.map((action) => action.props.accessibilityLabel)).toEqual(labels);
    expect(primaryTouchables.map((action) => action.props.accessibilityState?.selected)).toEqual([
      true,
      false,
      false,
    ]);

    const add = screen.getByRole('button', { name: i18n.t('tabs.add') });
    expect(add).toBeTruthy();
    expect(labels).not.toContain(add.props.accessibilityLabel);
  });

  it('AC-AX-2 AC-AX-4: keeps localized visual labels below font scale 2', () => {
    mockFontScale = 1.999;

    renderBar();

    expect(primaryTabs.map((tab) => screen.getByText(i18n.t(tab.labelKey)).props.children)).toEqual(
      primaryTabs.map((tab) => i18n.t(tab.labelKey)),
    );
  });

  it('AC-AX-2 AC-AX-4: visually removes tab labels at exact font scale 2', () => {
    mockFontScale = 2;

    renderBar();

    for (const tab of primaryTabs) {
      expect(screen.queryByText(i18n.t(tab.labelKey))).toBeNull();
    }
  });

  it('AC-AX-3: preserves localized primary-action order, selection, and navigation at font scale 2', () => {
    mockFontScale = 2;

    renderBar(1);

    const actions = getPrimaryActions();
    expect(actions.map((action) => action.props.accessibilityLabel)).toEqual(
      primaryTabs.map((tab) => i18n.t(tab.labelKey)),
    );
    expect(actions.map((action) => action.props.accessibilityState?.selected)).toEqual([
      false,
      true,
      false,
    ]);
    expect(screen.getByRole('button', { name: i18n.t('tabs.add') })).toBeTruthy();

    fireEvent.press(actions[2]);
    expect(mockNavigate).toHaveBeenCalledWith(primaryTabs[2].routeName);
  });

  it('marks the active tab with a structural tint pill, not color-only', () => {
    renderBar(1);

    const [diary, pet, more] = getPrimaryActions()
      .map((action) => StyleSheet.flatten(action.props.style));

    expect(pet.backgroundColor).toBe(tokens.color.primary[50]);
    expect(pet.borderRadius).toBe(tokens.radius.full);
    expect(diary.backgroundColor).toBeUndefined();
    expect(more.backgroundColor).toBeUndefined();
  });

  it('renders a detached capsule, not a full-width bar', () => {
    renderBar();

    const capsule = screen.getByTestId('nav-capsule');
    const style = StyleSheet.flatten(capsule.props.style);

    expect(style.alignSelf).toBe('center');
    expect(style.backgroundColor).toBe(tokens.color.surface.raised);
    expect(style.borderRadius).toBe(tokens.radius.full);
    expect(style.elevation).toBe(tokens.elevation[2].androidElevation);
    expect(style.left).toBeUndefined();
    expect(style.right).toBeUndefined();
  });

  it('opens the chooser and morphs Add into a close control', () => {
    renderBar();

    expect(screen.queryByTestId('nav-chooser')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    expect(screen.getByTestId('nav-chooser')).toBeTruthy();
    expect(screen.queryByRole('button', { name: i18n.t('tabs.add') })).toBeNull();
    expect(screen.getByRole('button', { name: i18n.t('tabs.add-close') })).toBeTruthy();
  });

  it('keeps the morphed close control visually above the chooser layer', () => {
    renderBar();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    const chooserStyle = StyleSheet.flatten(screen.getByTestId('nav-chooser').props.style);
    const addStyle = StyleSheet.flatten(screen.getByTestId('nav-add').props.style);

    expect(addStyle.zIndex).toBeGreaterThan(chooserStyle.zIndex);
  });

  it('keeps a non-accessible capsule slot mounted so the morphed Add stays in place', () => {
    renderBar();

    expect(screen.getByTestId('nav-capsule-slot')).toBeTruthy();
    expect(screen.getByTestId('nav-add-slot')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    expect(screen.getByTestId('nav-capsule-slot')).toBeTruthy();
    expect(screen.getByTestId('nav-add-slot')).toBeTruthy();
    expect(screen.queryByTestId('nav-capsule')).toBeNull();
    expectPrimaryActionsUnmounted();
  });

  it('morphs the original plus glyph instead of rotating a close glyph back into a plus', () => {
    const rendered = renderBar();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    const tree = JSON.stringify(rendered.toJSON());
    expect(tree).toContain('M12 5v14M5 12h14');
    expect(tree).not.toContain('M6 6l12 12M18 6L6 18');
  });

  it('removes the three-tab capsule while the chooser is open', () => {
    renderBar();

    expect(screen.getByTestId('nav-capsule')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    expect(screen.queryByTestId('nav-capsule')).toBeNull();
    expectPrimaryActionsUnmounted();
  });

  it('shows a scrim, a drag handle, and three slabs; scrim tap closes', () => {
    renderBar();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    expect(screen.getByTestId('nav-scrim')).toBeTruthy();
    expect(screen.getByTestId('nav-drag-handle')).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('nav.quick-log-slab') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('nav.note-slab') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('nav.schedule-slab') })).toBeTruthy();

    fireEvent.press(screen.getByTestId('nav-scrim'));

    expect(screen.queryByTestId('nav-chooser')).toBeNull();
    expect(screen.getByTestId('nav-capsule')).toBeTruthy();
  });

  it('AC-QN-SLAB: keeps the locked slab order Quick Log, Quick note, Schedule', () => {
    renderBar();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    expect(
      screen.getAllByTestId('nav-slab').map((slab) => slab.props.accessibilityLabel),
    ).toEqual([
      i18n.t('nav.quick-log-slab'),
      i18n.t('nav.note-slab'),
      i18n.t('nav.schedule-slab'),
    ]);
  });

  it('renders each slab with a subtitle and a chevron, not title-only', () => {
    renderBar();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    expect(screen.getByText(i18n.t('nav.quick-log-slab-subtitle'))).toBeTruthy();
    expect(screen.getByText(i18n.t('nav.note-slab-subtitle'))).toBeTruthy();
    expect(screen.getByText(i18n.t('nav.schedule-slab-subtitle'))).toBeTruthy();
    expect(
      screen.getAllByTestId('nav-slab-chevron', { includeHiddenElements: true }),
    ).toHaveLength(3);
  });

  it('AC-QN-SLAB: keeps the last slab clear of the morphed close control', () => {
    renderBar();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    const sheetStyle = StyleSheet.flatten(screen.getByTestId('nav-chooser-sheet').props.style);

    // The close control sits above the sheet, so slab content must not extend under it.
    expect(sheetStyle.paddingBottom).toBeGreaterThanOrEqual(tokens.component.fab.size);
  });

  it('AC-QN-SLAB: keeps every slab at or above the thumb-zone tap target', () => {
    renderBar();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));

    for (const slab of screen.getAllByTestId('nav-slab')) {
      const style = StyleSheet.flatten(slab.props.style);

      expect(style.minHeight).toBeGreaterThanOrEqual(tokens.layout.tapTargetThumbZone);
    }
  });

  it('AC-P33-DOG-FAST routes tap 2 into Quick Log while preserving Quick note and Schedule', () => {
    renderBar();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('nav.quick-log-slab') }));

    expect(mockRouterPush).toHaveBeenCalledWith(quickLogAction.href);
    expect(screen.queryByTestId('nav-chooser')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('nav.note-slab') }));

    expect(mockRouterPush).toHaveBeenCalledWith(noteAction.href);
    expect(screen.queryByTestId('nav-chooser')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('nav.schedule-slab') }));

    expect(mockRouterPush).toHaveBeenCalledWith(scheduleAction.href);
  });

  it('still opens and closes the chooser under reduced motion', () => {
    const reducedMotion = jest.mocked(motion.useReducedMotion).mockReturnValue(true);

    renderBar();

    expect(reducedMotion).toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
    expect(screen.getByTestId('nav-chooser')).toBeTruthy();
    fireEvent.press(screen.getByTestId('nav-scrim'));
    expect(screen.queryByTestId('nav-chooser')).toBeNull();
  });

  it('fires haptics for Add open and tab selection', () => {
    const haptic = jest.spyOn(haptics, 'haptic').mockResolvedValue(undefined);

    renderBar();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add') }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('tabs.add-close') }));
    fireEvent.press(screen.getByLabelText(i18n.t(primaryTabs[1].labelKey)));

    expect(haptic).toHaveBeenCalledWith('tapConfirm');
    expect(haptic).toHaveBeenCalledWith('selection');
  });

  it('navigates to a tab route via the navigation prop on press', () => {
    renderBar();

    fireEvent.press(screen.getByLabelText(i18n.t(primaryTabs[1].labelKey)));

    expect(mockNavigate).toHaveBeenCalledWith(primaryTabs[1].routeName);
  });
});
