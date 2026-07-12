import type {
  StyleProp,
  ViewStyle,
} from 'react-native';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';
import { SafeAreaView } from 'react-native-safe-area-context';
import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { AppText, type AppTextVariant } from '@/design/primitives/AppText';
import { AppIcon } from '@/design/primitives/AppIcon';
import { Avatar } from '@/design/primitives/Avatar';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { EmptyState } from '@/design/primitives/EmptyState';
import { FAB } from '@/design/primitives/FAB';
import { DesignFontGate, designFontFamilies } from '@/design/fonts';
import { IconButton } from '@/design/primitives/IconButton';
import { ListGroup } from '@/design/primitives/ListGroup';
import { ListRow } from '@/design/primitives/ListRow';
import { PendingDot } from '@/design/primitives/PendingDot';
import { Screen } from '@/design/primitives/Screen';
import { ScreenHeader } from '@/design/primitives/ScreenHeader';
import { SegmentedControl } from '@/design/primitives/SegmentedControl';
import { SectionHeader } from '@/design/primitives/SectionHeader';
import { SheetHeader } from '@/design/primitives/SheetHeader';
import { SheetSurface } from '@/design/primitives/SheetSurface';
import {
  SNACKBAR_BOTTOM_OFFSET_WITH_FAB,
  SNACKBAR_DEFAULT_DURATION_MS,
  SnackbarProvider,
  useSnackbar,
  type SnackbarController,
} from '@/design/primitives/Snackbar';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill } from '@/design/primitives/StatusPill';
import { Touchable } from '@/design/primitives/Touchable';
import { TrackerTile } from '@/design/primitives/TrackerTile';
import {
  DEFAULT_HIT_SLOP,
  MIN_TOUCH_TARGET_BY_PLATFORM,
  MIN_TOUCH_TARGET,
  THUMB_TOUCH_TARGET,
  getHitSlopForVisualSize,
} from '@/design/a11y/touch-targets';
import { configureDesignHaptics, haptic } from '@/design/haptics';
import { motionPresets, pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { tokens } from '@/design/tokens';

let mockFontScale = 1;

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperty(Object.create(actual) as typeof actual, 'useWindowDimensions', {
    value: () => ({ fontScale: mockFontScale, height: 667, scale: 2, width: 375 }),
  });
});

function primitiveTypeContractChecks() {
  return (
    <>
      {/* @ts-expect-error active Button controls require an onPress handler */}
      <Button label="Missing action" />
      {/* @ts-expect-error active IconButton controls require an onPress handler */}
      <IconButton accessibilityLabel="Missing icon action" icon={<View />} />
      {/* @ts-expect-error active TrackerTile controls require an onPress handler */}
      <TrackerTile label="Missing tracker action" />
      {/* @ts-expect-error status pills require a non-null decorative icon node */}
      <StatusPill accessibilityLabel="No icon" icon={null} label="No icon" tone="pending" />
      {/* @ts-expect-error status pills require a visible decorative icon node */}
      <StatusPill accessibilityLabel="False icon" icon={false} label="False icon" tone="pending" />
      {/* @ts-expect-error status pills require an explicit decorative icon node */}
      <StatusPill accessibilityLabel="Missing icon" icon={undefined} label="Missing icon" tone="pending" />
      {/* @ts-expect-error static cards cannot opt into the interactive elevation variant */}
      <Card variant="interactive">
        <AppText>Static interactive card</AppText>
      </Card>
    </>
  );
}

void primitiveTypeContractChecks;

type MaybePressableStyle =
  | StyleProp<ViewStyle>
  | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);

function flattenViewStyle(style: MaybePressableStyle, pressed = false) {
  return StyleSheet.flatten(
    typeof style === 'function' ? style({ pressed }) : style,
  );
}

function PressedMotionProbe() {
  const reducedMotion = useReducedMotion();

  return (
    <View
      style={pressedScaleStyle(true, reducedMotion)}
      testID="pressed-motion-probe"
    />
  );
}

function ReducedMotionListenerProbe() {
  return (
    <>
      <PressedMotionProbe />
      <PressedMotionProbe />
      <PressedMotionProbe />
    </>
  );
}

function createAccessibilitySubscription() {
  const emitter = new EventEmitter();

  return emitter.addListener('reduceMotionChanged', jest.fn());
}

function SnackbarControllerProbe({
  onReady,
}: {
  onReady: (controller: SnackbarController) => void;
}) {
  const snackbar = useSnackbar();

  onReady(snackbar);

  return null;
}

describe('design primitives', () => {
  beforeEach(() => {
    mockFontScale = 1;
  });

  afterEach(() => {
    configureDesignHaptics(null);
  });

  it('AC-DT-1 AC-DT-3 AC-DT-4 applies the exact scalable ceiling policy to every text variant', () => {
    const expectedCeilings: Record<AppTextVariant, number> = {
      body: 2,
      bodyEmph: 2,
      callout: 2,
      caption: 1.5,
      code: 1.5,
      display: 1.8,
      footnote: 1.5,
      headline: 1.8,
      label: 1.5,
      subheadline: 2,
      title: 1.8,
      title1: 1.8,
      title2: 1.8,
      title3: 1.8,
    };

    render(
      <>
        {Object.entries(expectedCeilings).map(([variant]) => (
          <AppText key={variant} variant={variant as AppTextVariant}>{variant}</AppText>
        ))}
      </>,
    );

    for (const [variant, ceiling] of Object.entries(expectedCeilings)) {
      const text = screen.getByText(variant);
      expect(text.props.allowFontScaling).toBe(true);
      expect(text.props.maxFontSizeMultiplier).toBe(ceiling);
    }
  });

  it('AC-DT-1 AC-DT-3 preserves an explicit ceiling override without disabling scaling', () => {
    render(<AppText maxFontSizeMultiplier={1.6}>Fixed chrome override</AppText>);

    expect(screen.getByText('Fixed chrome override').props).toEqual(expect.objectContaining({
      allowFontScaling: true,
      maxFontSizeMultiplier: 1.6,
    }));
  });

  it('AC-DT-1 AC-DT-3 applies the body policy to the default variant', () => {
    render(<AppText>Default body copy</AppText>);

    expect(screen.getByText('Default body copy').props).toEqual(expect.objectContaining({
      allowFontScaling: true,
      maxFontSizeMultiplier: 2,
    }));
  });

  it('keeps AppText token styling for Dynamic Type readiness', () => {
    render(<AppText variant="title">Shell title</AppText>);

    const title = screen.getByText('Shell title');
    const style = StyleSheet.flatten(title.props.style);

    expect(title.props.allowFontScaling).toBe(true);
    expect(title.props.maxFontSizeMultiplier).toBe(1.8);
    expect(style.color).toBe(tokens.color.text.primary);
    expect(style.fontSize).toBe(tokens.typography.scale.title1.fontSize);
    expect(style.letterSpacing).toBe(0);
  });

  it('maps AppText variants and tones to generated token values', () => {
    render(
      <>
        <AppText tone="secondary" variant="headline">
          Row headline
        </AppText>
        <AppText tone="tertiary" variant="caption">
          Quiet metadata
        </AppText>
        <AppText variant="label">
          Compact label
        </AppText>
      </>,
    );

    const headline = StyleSheet.flatten(screen.getByText('Row headline').props.style);
    const caption = StyleSheet.flatten(screen.getByText('Quiet metadata').props.style);
    const label = StyleSheet.flatten(screen.getByText('Compact label').props.style);

    expect(headline.color).toBe(tokens.color.text.secondary);
    expect(headline.fontSize).toBe(tokens.typography.scale.headline.fontSize);
    expect(headline.fontWeight).toBe(String(tokens.typography.scale.headline.fontWeight));
    expect(headline.letterSpacing).toBe(0);
    expect(caption.color).toBe(tokens.color.text.tertiary);
    expect(caption.fontSize).toBe(tokens.typography.scale.caption.fontSize);
    expect(label.fontSize).toBe(tokens.typography.scale.caption.fontSize);
    expect(label.fontWeight).toBe(String(tokens.typography.scale.caption.fontWeight));
  });

  it('maps V2 AppText families and numeric text to the loaded design fonts', () => {
    render(
      <>
        <AppText variant="display">Display copy</AppText>
        <AppText variant="headline">Headline copy</AppText>
        <AppText variant="body">Body copy</AppText>
        <AppText variant="bodyEmph">Body emphasis</AppText>
        <AppText numeric variant="code">12:30</AppText>
      </>,
    );

    const display = StyleSheet.flatten(screen.getByText('Display copy').props.style);
    const headline = StyleSheet.flatten(screen.getByText('Headline copy').props.style);
    const body = StyleSheet.flatten(screen.getByText('Body copy').props.style);
    const bodyEmph = StyleSheet.flatten(screen.getByText('Body emphasis').props.style);
    const code = StyleSheet.flatten(screen.getByText('12:30').props.style);

    expect(display.fontFamily).toBe(designFontFamilies.display.semibold);
    expect(display.fontWeight).toBe('600');
    expect(headline.fontFamily).toBe(designFontFamilies.display.semibold);
    expect(body.fontFamily).toBe(designFontFamilies.text.regular);
    expect(bodyEmph.fontFamily).toBe(designFontFamilies.text.bold);
    expect(code.fontFamily).toBe(tokens.typography.fontFamily.mono[0]);
    expect(code.fontVariant).toEqual(['tabular-nums']);
  });

  it('gates the app tree until design fonts are deterministically ready', () => {
    const loading = render(
      <DesignFontGate useDesignFontsForTest={() => ({ error: null, loaded: false })}>
        <AppText>Loaded app</AppText>
      </DesignFontGate>,
    );

    expect(loading.queryByText('Loaded app')).toBeNull();
    loading.unmount();

    render(
      <DesignFontGate useDesignFontsForTest={() => ({ error: null, loaded: true })}>
        <AppText>Loaded app</AppText>
      </DesignFontGate>,
    );

    expect(screen.getByText('Loaded app')).toBeTruthy();
  });

  it('reports design font load failures while rendering the fallback app tree', async () => {
    const fontError = new Error('Design font load failed');
    const observability = {
      captureException: jest.fn(),
    };

    render(
      <DesignFontGate
        observability={observability}
        useDesignFontsForTest={() => ({ error: fontError, loaded: true })}>
        <AppText>Loaded app</AppText>
      </DesignFontGate>,
    );

    expect(screen.getByText('Loaded app')).toBeTruthy();
    await waitFor(() => {
      expect(observability.captureException).toHaveBeenCalledWith(fontError, {
        area: 'design',
        operation: 'load_fonts',
        tags: {
          font_family_display: 'Lora',
          font_family_text: 'Nunito',
        },
      });
    });
  });

  it('renders Screen content inside the scaffold surface', () => {
    const { UNSAFE_getByType } = render(
      <Screen>
        <AppText>Screen body</AppText>
      </Screen>,
    );
    const safeAreaView = UNSAFE_getByType(SafeAreaView);
    const scrollView = UNSAFE_getByType(ScrollView);
    const contentStyle = StyleSheet.flatten(scrollView.props.contentContainerStyle);

    expect(screen.getByText('Screen body')).toBeTruthy();
    expect(safeAreaView.props.edges).toEqual(['top']);
    expect(contentStyle.paddingVertical).toBe(tokens.layout.screenPaddingY);
  });

  it('renders fixed Screen content without a ScrollView', () => {
    const { UNSAFE_getByType, UNSAFE_queryByType } = render(
      <Screen contentStyle={{ paddingBottom: tokens.space[8] }} edges={['top', 'left']} scroll={false}>
        <AppText>Fixed body</AppText>
      </Screen>,
    );
    const fixedContent = UNSAFE_getByType(View);
    const fixedContentStyle = StyleSheet.flatten(fixedContent?.props.style);

    expect(screen.getByText('Fixed body')).toBeTruthy();
    expect(UNSAFE_queryByType(ScrollView)).toBeNull();
    expect(fixedContentStyle.flex).toBe(1);
    expect(fixedContentStyle.paddingBottom).toBe(tokens.space[8]);
  });

  it('exports token-backed accessibility, motion, and haptic boundaries', async () => {
    const adapter = jest.fn();

    configureDesignHaptics(adapter);

    expect(MIN_TOUCH_TARGET).toBe(tokens.layout.tapTargetMin);
    expect(MIN_TOUCH_TARGET_BY_PLATFORM.ios).toBe(tokens.layout.tapTargetMin);
    expect(MIN_TOUCH_TARGET_BY_PLATFORM.android).toBe(48);
    expect(THUMB_TOUCH_TARGET).toBe(tokens.layout.tapTargetThumbZone);
    expect(tokens.layout.bottomInsetFab).toBe(120);
    expect(DEFAULT_HIT_SLOP).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
    expect(getHitSlopForVisualSize(tokens.icon.specs.size)).toEqual(DEFAULT_HIT_SLOP);
    expect(motionPresets.tap.durationMs).toBe(tokens.motion.duration.fast);
    expect(motionPresets.sheet.durationMs).toBe(tokens.motion.duration.base);

    await haptic('warning');

    expect(adapter).toHaveBeenCalledWith('warning', tokens.haptic.warning);
  });

  it('contains haptic adapter failures inside the design boundary', async () => {
    const adapter = jest.fn().mockRejectedValue(new Error('native haptic failed'));

    configureDesignHaptics(adapter);

    await expect(haptic('tapConfirm')).resolves.toBeUndefined();
    expect(adapter).toHaveBeenCalledWith('light', tokens.haptic.light);
  });

  it('removes pressed scale motion while the initial Reduce Motion probe is pending', () => {
    const subscription = createAccessibilitySubscription();
    const isReduceMotionEnabled = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    const addEventListener = jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue(subscription);

    const { unmount } = render(<PressedMotionProbe />);
    const pressedStyle = StyleSheet.flatten(screen.getByTestId('pressed-motion-probe').props.style);

    expect(pressedStyle?.transform).toBeUndefined();

    unmount();
    addEventListener.mockRestore();
    isReduceMotionEnabled.mockRestore();
  });

  it('shares one native Reduce Motion listener across primitive consumers', () => {
    const subscription = createAccessibilitySubscription();
    const removeSubscription = jest.spyOn(subscription, 'remove');
    const isReduceMotionEnabled = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    const addEventListener = jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue(subscription);

    const { unmount } = render(<ReducedMotionListenerProbe />);

    expect(addEventListener).toHaveBeenCalledTimes(1);

    unmount();

    expect(removeSubscription).toHaveBeenCalledTimes(1);

    addEventListener.mockRestore();
    isReduceMotionEnabled.mockRestore();
  });

  it('ignores Reduce Motion listener callbacks after all consumers unmount', () => {
    const subscription = createAccessibilitySubscription();
    const removeSubscription = jest.spyOn(subscription, 'remove');
    const isReduceMotionEnabled = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    const addEventListener = jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue(subscription);

    const { unmount } = render(<PressedMotionProbe />);
    const reducedMotionListener = addEventListener.mock.calls[0]?.[1];

    unmount();

    expect(removeSubscription).toHaveBeenCalledTimes(1);
    expect(reducedMotionListener).toEqual(expect.any(Function));
    expect(() => {
      if (typeof reducedMotionListener === 'function') {
        Reflect.apply(reducedMotionListener, undefined, [true]);
      }
    }).not.toThrow();

    addEventListener.mockRestore();
    isReduceMotionEnabled.mockRestore();
  });

  it('removes pressed scale motion when Reduce Motion is enabled', async () => {
    const subscription = createAccessibilitySubscription();
    const removeSubscription = jest.spyOn(subscription, 'remove');
    const isReduceMotionEnabled = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    const addEventListener = jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue(subscription);

    expect(StyleSheet.flatten(pressedScaleStyle(true, false))?.transform).toEqual([
      { scale: motionPresets.tap.pressedScale },
    ]);

    const { unmount } = render(<PressedMotionProbe />);

    await waitFor(() => {
      const pressedStyle = StyleSheet.flatten(screen.getByTestId('pressed-motion-probe').props.style);

      expect(pressedStyle?.transform).toBeUndefined();
    });

    unmount();

    expect(addEventListener).toHaveBeenCalledWith('reduceMotionChanged', expect.any(Function));
    expect(removeSubscription).toHaveBeenCalledTimes(1);

    addEventListener.mockRestore();
    isReduceMotionEnabled.mockRestore();
  });

  it('renders touchables with enforced targets and explicit accessibility state', () => {
    const onPress = jest.fn();

    render(
      <>
        <Touchable
          accessibilityLabel="Default target"
          accessibilityRole="button"
          onPress={onPress}>
          <AppText>Default target</AppText>
        </Touchable>
        <Touchable
          accessibilityLabel="Thumb target"
          accessibilityRole="button"
          minTarget="thumb"
          onPress={onPress}>
          <AppText>Thumb target</AppText>
        </Touchable>
        <Touchable
          accessibilityLabel="Visual only"
          accessibilityRole="button"
          minTarget="none"
          onPress={onPress}>
          <AppText>Visual only</AppText>
        </Touchable>
        <Touchable
          accessibilityLabel="Busy control"
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          blockPresses
          onPress={onPress}>
          <AppText>Busy control</AppText>
        </Touchable>
      </>,
    );

    expect(
      flattenViewStyle(screen.getByRole('button', { name: 'Default target' }).props.style)
        .minHeight,
    ).toBe(MIN_TOUCH_TARGET);
    expect(
      flattenViewStyle(screen.getByRole('button', { name: 'Thumb target' }).props.style)
        .minHeight,
    ).toBe(THUMB_TOUCH_TARGET);
    expect(
      flattenViewStyle(screen.getByRole('button', { name: 'Visual only' }).props.style)
        .minHeight,
    ).toBeUndefined();

    const busyControl = screen.getByRole('button', { name: 'Busy control' });

    expect(busyControl.props.accessibilityState).toMatchObject({ disabled: false });
    expect(busyControl.props.accessibilityState).toMatchObject({ busy: true });
    expect(busyControl.props.onPress).toBeFalsy();

    expect(onPress).not.toHaveBeenCalled();
  });

  it('applies Touchable pressedStyle callbacks only for active presses', () => {
    const onPress = jest.fn();
    const activeTouchable = Touchable({
      accessibilityLabel: 'Callback press style',
      accessibilityRole: 'button',
      children: <AppText>Callback press style</AppText>,
      onPress,
      pressedStyle: ({ pressed }) => ({ opacity: pressed ? 0.5 : 1 }),
      style: { backgroundColor: tokens.color.surface.raised },
    });
    const blockedTouchable = Touchable({
      accessibilityLabel: 'Blocked press style',
      accessibilityRole: 'button',
      blockPresses: true,
      children: <AppText>Blocked press style</AppText>,
      onPress,
      pressedStyle: ({ pressed }) => ({ opacity: pressed ? 0.5 : 1 }),
      style: { backgroundColor: tokens.color.surface.raised },
    });

    expect(
      flattenViewStyle(activeTouchable.props.style, true).opacity,
    ).toBe(0.5);
    expect(
      flattenViewStyle(blockedTouchable.props.style, true).opacity,
    ).toBeUndefined();
  });

  it('renders buttons with token variants, accessibility state, and touch targets', async () => {
    const user = userEvent.setup();
    const onPrimaryPress = jest.fn();
    const onDisabledPress = jest.fn();
    const onLoadingPress = jest.fn();

    render(
      <>
        <Button
          accessibilityHint="Saves and closes the panel."
          label="Save"
          onPress={onPrimaryPress}
        />
        <Button
          disabled
          label="Delete"
          loading
          onPress={onDisabledPress}
          variant="destructive"
        />
        <Button
          label="Submitting"
          loading
          onPress={onLoadingPress}
          variant="secondary"
        />
      </>,
    );

    const primaryButton = screen.getByRole('button', { name: 'Save' });
    const primaryStyle = flattenViewStyle(primaryButton.props.style);

    expect(primaryButton.props.accessibilityHint).toBe('Saves and closes the panel.');
    expect(primaryButton.props.accessibilityState).toMatchObject({
      busy: false,
      disabled: false,
    });
    expect(primaryStyle.backgroundColor).toBe(tokens.color.primary[600]);
    expect(primaryStyle.minHeight).toBe(MIN_TOUCH_TARGET);
    expect(primaryStyle.minWidth).toBe(MIN_TOUCH_TARGET);
    expect(motionPresets.tap.pressedScale).toBeLessThan(1);
    expect(StyleSheet.flatten(screen.getByText('Save').props.style).color).toBe(
      tokens.color.text.onPrimary,
    );

    const disabledButton = screen.getByRole('button', { name: 'Delete' });

    expect(disabledButton.props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });

    const loadingButton = screen.getByRole('button', { name: 'Submitting' });

    expect(loadingButton.props.accessibilityState).toMatchObject({
      busy: true,
      disabled: false,
    });
    expect(
      screen.getAllByTestId('button-loading-indicator', { includeHiddenElements: true }),
    ).toHaveLength(2);
    expect(disabledButton.props.onPress).toBeFalsy();
    expect(loadingButton.props.onPress).toBeFalsy();

    await user.press(primaryButton);
    await user.press(disabledButton);
    await user.press(loadingButton);

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
    expect(onDisabledPress).not.toHaveBeenCalled();
    expect(onLoadingPress).not.toHaveBeenCalled();
  });

  it('lets button labels and tracker tiles grow for Dynamic Type', () => {
    const onPress = jest.fn();

    render(
      <>
        <Button
          label="Save updated reminder configuration"
          onPress={onPress}
        />
        <TrackerTile
          label="Morning potty outside"
          onPress={onPress}
        />
      </>,
    );

    const buttonLabel = screen.getByText('Save updated reminder configuration');
    const tracker = screen.getByRole('button', { name: 'Morning potty outside' });
    const trackerStyle = flattenViewStyle(tracker.props.style);

    expect(buttonLabel.props.numberOfLines).toBeUndefined();
    expect(buttonLabel.props.maxFontSizeMultiplier).toBe(1.8);
    expect(trackerStyle.height).toBeUndefined();
    expect(trackerStyle.minHeight).toBe(tokens.component.trackerTile.threeCol.height);
    expect(trackerStyle.width).toBe(tokens.component.trackerTile.threeCol.width);
  });

  it.each([
    { fontScale: 1.999, expectedCompactWidth: undefined, expectedLines: 3, expectedThreeColumnWidth: tokens.component.trackerTile.threeCol.width },
    { fontScale: 2, expectedCompactWidth: '100%', expectedLines: undefined, expectedThreeColumnWidth: '100%' },
  ])('AC-DT-2A AC-DT-2B AC-DT-2E adapts tracker choices at fontScale $fontScale', ({
    expectedCompactWidth,
    expectedLines,
    expectedThreeColumnWidth,
    fontScale,
  }) => {
    mockFontScale = fontScale;
    render(
      <>
        <TrackerTile
          accessibilityLabel="Feeding choice"
          label="Feeding"
          onPress={jest.fn()}
          selected
          size="threeColumn"
          testID="fast-lane-choice"
        />
        <TrackerTile
          accessibilityLabel="Observation routine choice"
          label="Observation"
          onPress={jest.fn()}
          selected={false}
          size="compact"
          testID="routine-choice"
        />
      </>,
    );

    expect(flattenViewStyle(screen.getByTestId('fast-lane-choice').props.style).width)
      .toBe(expectedThreeColumnWidth);
    expect(flattenViewStyle(screen.getByTestId('routine-choice').props.style).width)
      .toBe(expectedCompactWidth);
    expect(screen.getByText('Feeding').props.numberOfLines).toBe(expectedLines);
    expect(screen.getByText('Observation').props.numberOfLines).toBe(expectedLines);
    expect(screen.getByRole('button', { name: 'Feeding choice' }).props.accessibilityState)
      .toEqual(expect.objectContaining({ disabled: false, selected: true }));
    expect(screen.getByRole('button', { name: 'Observation routine choice' }).props.accessibilityState)
      .toEqual(expect.objectContaining({ disabled: false, selected: false }));
  });

  it.each([
    { fontScale: 1.999, expectedDirection: 'row', expectedTitleLines: 1 },
    { fontScale: 2, expectedDirection: 'column', expectedTitleLines: undefined },
  ])('AC-DT-2C AC-DT-2E adapts ScreenHeader without losing controls at fontScale $fontScale', ({
    expectedDirection,
    expectedTitleLines,
    fontScale,
  }) => {
    mockFontScale = fontScale;
    render(
      <ScreenHeader
        backLabel="More"
        onBack={jest.fn()}
        testID="adaptive-header"
        title="Reminders"
        trailing={<IconButton accessibilityLabel="Add reminder" icon={<View />} onPress={jest.fn()} />}
      />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('adaptive-header').props.style).flexDirection)
      .toBe(expectedDirection);
    expect(screen.getByRole('header', { name: 'Reminders' }).props.numberOfLines)
      .toBe(expectedTitleLines);
    expect(screen.getByRole('button', { name: 'More' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add reminder' })).toBeTruthy();
  });

  it.each([
    { fontScale: 1.999, expectedDirection: 'row', expectedTitleLines: 2 },
    { fontScale: 2, expectedDirection: 'column', expectedTitleLines: undefined },
  ])('AC-DT-2C AC-DT-2E preserves a complete reminder row at fontScale $fontScale', ({
    expectedDirection,
    expectedTitleLines,
    fontScale,
  }) => {
    mockFontScale = fontScale;
    const title = 'ОченьДлинноеНазваниеРутиныДляЩенка';
    render(
      <ListRow
        accessibilityActions={[{ name: 'delete' }]}
        accessibilityLabel={`${title}. Every day`}
        onAccessibilityAction={jest.fn()}
        onPress={jest.fn()}
        subtitle="Every day"
        title={title}
        titleNumberOfLines={2}
        trailing={(
          <View
            accessibilityLabel="Toggle routine"
            accessibilityRole="switch"
            accessibilityState={{ checked: true }}
            testID="toggle-routine"
          />
        )}
        variant="settings"
      />,
    );

    const row = screen.getByRole('button', { name: `${title}. Every day` });
    expect(flattenViewStyle(row.props.style).flexDirection).toBe(expectedDirection);
    expect(screen.getByText(title).props.children).toBe(title);
    expect(screen.getByText(title).props.numberOfLines).toBe(expectedTitleLines);
    expect(row.props.accessibilityActions).toEqual([{ name: 'delete' }]);
    expect(screen.getByTestId('toggle-routine', { includeHiddenElements: true }).props)
      .toEqual(expect.objectContaining({
        accessibilityLabel: 'Toggle routine',
        accessibilityRole: 'switch',
        accessibilityState: { checked: true },
      }));
  });

  it('renders card, list row, tracker, status, segmented, and sheet surfaces from tokens', () => {
    const onRowPress = jest.fn();
    const onTrackerPress = jest.fn();
    const onSegmentChange = jest.fn();

    render(
      <>
        <Card testID="hero-card" variant="hero">
          <AppText>Hero content</AppText>
        </Card>
        <ListRow
          accessibilityLabel="Vaccination record"
          meta="Template"
          onPress={onRowPress}
          subtitle="Needs review"
          title="Vaccination"
        />
        <TrackerTile
          accessibilityHint="Saves this event now."
          accessibilityLabel="Log water"
          label="Water"
          onPress={onTrackerPress}
        />
        <StatusPill
          accessibilityLabel="Confirmed status"
          icon={<AppText accessibilityElementsHidden>✓</AppText>}
          label="Confirmed"
          tone="confirmed"
        />
        <SegmentedControl
          accessibilityLabel="Health record filter"
          onValueChange={onSegmentChange}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Vaccines', value: 'vaccines' },
          ]}
          value="all"
        />
        <SheetSurface accessibilityLabel="Quick actions">
          <AppText>Sheet body</AppText>
        </SheetSurface>
      </>,
    );

    const cardStyle = StyleSheet.flatten(screen.getByTestId('hero-card').props.style);
    const row = screen.getByRole('button', { name: 'Vaccination record' });
    const rowStyle = flattenViewStyle(row.props.style);
    const tracker = screen.getByRole('button', { name: 'Log water' });
    const trackerStyle = flattenViewStyle(tracker.props.style);
    const status = screen.getByLabelText('Confirmed status');
    const statusStyle = StyleSheet.flatten(status.props.style);
    const tabList = screen.getByLabelText('Health record filter');
    const selectedSegment = screen.getByRole('tab', { name: 'All' });
    const selectedSegmentStyle = flattenViewStyle(selectedSegment.props.style);
    const sheet = screen.getByLabelText('Quick actions');
    const sheetStyle = StyleSheet.flatten(sheet.props.style);

    expect(cardStyle.backgroundColor).toBe(tokens.color.surface.raised);
    expect(cardStyle.borderRadius).toBe(tokens.radius.md);
    expect(rowStyle.minHeight).toBeGreaterThanOrEqual(tokens.component.listItem.minHeight);
    expect(rowStyle.paddingHorizontal).toBe(tokens.layout.cardPadding);
    expect(tracker.props.accessibilityHint).toBe('Saves this event now.');
    expect(trackerStyle.minHeight).toBeGreaterThanOrEqual(tokens.component.trackerTile.min.height);
    expect(trackerStyle.minWidth).toBeGreaterThanOrEqual(tokens.component.trackerTile.min.width);
    expect(statusStyle.backgroundColor).toBe(tokens.color.pill.confirmed.fill);
    expect(statusStyle.minHeight).toBe(tokens.component.pill.height);
    expect(tabList.props.accessibilityRole).toBe('tablist');
    expect(selectedSegment.props.accessibilityState).toMatchObject({ selected: true });
    expect(selectedSegmentStyle.backgroundColor).toBe(tokens.color.surface.raised);
    expect(StyleSheet.flatten(screen.getByText('All').props.style).color).toBe(
      tokens.color.text.primary,
    );
    expect(screen.getByText('Vaccines').props.maxFontSizeMultiplier).toBe(2);
    expect(screen.getByText('Vaccines').props.numberOfLines).toBe(2);
    expect(sheet.props.accessibilityViewIsModal).toBe(true);
    expect(sheet.props.importantForAccessibility).toBe('yes');
    expect(sheet.props.accessible).not.toBe(true);
    expect(screen.getByTestId('sheet-drag-handle', { includeHiddenElements: true })).toBeTruthy();
    expect(sheetStyle.elevation).toBe(tokens.elevation[2].androidElevation);
    expect(sheetStyle.borderTopLeftRadius).toBe(tokens.radius.lg);

    fireEvent.press(row);
    fireEvent.press(tracker);
    fireEvent.press(screen.getByRole('tab', { name: 'Vaccines' }));

    expect(onRowPress).toHaveBeenCalledTimes(1);
    expect(onTrackerPress).toHaveBeenCalledTimes(1);
    expect(onSegmentChange).toHaveBeenCalledWith('vaccines');
  });

  it('keeps segmented options compact enough for four atlas labels on narrow phones', () => {
    render(
      <SegmentedControl
        accessibilityLabel="Health filters"
        onValueChange={jest.fn()}
        options={[
          { label: 'All', value: 'all' },
          { label: 'Vaccinations', value: 'vaccinations' },
          { label: 'Treatments', value: 'treatments' },
          { label: 'Visits', value: 'visits' },
        ]}
        value="all"
      />,
    );

    const vaccinationsTab = screen.getByRole('tab', { name: 'Vaccinations' });
    const tabStyle = flattenViewStyle(vaccinationsTab.props.style);

    expect(tabStyle.paddingHorizontal).toBeLessThanOrEqual(tokens.space[1]);
  });

  it('keeps health row metadata in the copy column so long titles are not squeezed', () => {
    render(
      <ListRow
        leading={<AppIcon name="docText" />}
        meta="Confirmed · Done May 12"
        title="Parasite treatment"
        variant="health"
      />,
    );

    const title = screen.getByText('Parasite treatment');
    const meta = screen.getByText('Confirmed · Done May 12');

    expect(title.props.numberOfLines).toBeUndefined();
    expect(meta.props.numberOfLines).toBe(2);
  });

  it('renders atlas-aligned grouped settings rows, section headers, avatar, and sheet header affordances', () => {
    const onProfilePress = jest.fn();
    const onClose = jest.fn();

    render(
      <>
        <SectionHeader title="Puppy" />
        <ListGroup testID="puppy-settings-group">
          <ListRow
            accessory="chevron"
            leading={<Avatar label="Puppy avatar" initials="PP" size="sm" />}
            meta="2 fields"
            onPress={onProfilePress}
            title="Puppy profile"
            variant="settings"
          />
          <ListRow
            accessory="chevron"
            leading={<AppIcon name="sliders" />}
            title="Quick trackers"
            variant="settings"
          />
        </ListGroup>
        <SheetHeader
          closeAccessibilityLabel="Close quick log"
          onClose={onClose}
          title="What happened?"
        />
      </>,
    );

    const sectionTitle = screen.getByRole('header', { name: 'Puppy' });
    const sectionStyle = StyleSheet.flatten(sectionTitle.props.style);
    const groupStyle = StyleSheet.flatten(screen.getByTestId('puppy-settings-group').props.style);
    const profileRow = screen.getByRole('button', { name: 'Puppy profile' });
    const profileRowStyle = flattenViewStyle(profileRow.props.style);
    const avatar = screen.getByLabelText('Puppy avatar');
    const avatarStyle = StyleSheet.flatten(avatar.props.style);
    const sheetTitle = screen.getByRole('header', { name: 'What happened?' });
    const closeButton = screen.getByRole('button', { name: 'Close quick log' });
    const closeStyle = flattenViewStyle(closeButton.props.style);

    expect(sectionStyle.color).toBe(tokens.color.text.secondary);
    expect(sectionStyle.fontSize).toBe(tokens.typography.scale.subheadline.fontSize);
    expect(groupStyle.backgroundColor).toBe(tokens.color.surface.raised);
    expect(groupStyle.borderRadius).toBe(tokens.radius.md);
    expect(groupStyle.borderColor).toBe(tokens.color.stroke.default);
    expect(profileRowStyle.minHeight).toBeGreaterThanOrEqual(tokens.component.listItem.minHeight);
    expect(profileRowStyle.paddingHorizontal).toBe(tokens.layout.cardPadding);
    expect(screen.getAllByTestId('list-row-chevron', { includeHiddenElements: true })).toHaveLength(2);
    expect(avatarStyle.width).toBe(32);
    expect(avatarStyle.height).toBe(32);
    expect(avatarStyle.borderRadius).toBe(tokens.radius.full);
    expect(screen.getByText('PP')).toBeTruthy();
    expect(StyleSheet.flatten(sheetTitle.props.style).fontSize).toBe(
      tokens.typography.scale.title2.fontSize,
    );
    expect(closeStyle.minHeight).toBe(MIN_TOUCH_TARGET);
    expect(closeStyle.minWidth).toBe(MIN_TOUCH_TARGET);

    fireEvent.press(profileRow);
    fireEvent.press(closeButton);

    expect(onProfilePress).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders neutral empty states and pending dots without relying on color alone', () => {
    const onPrimaryPress = jest.fn();
    const onSecondaryPress = jest.fn();

    render(
      <>
        <EmptyState
          body="Add the first record to keep history in one place."
          icon={<AppIcon name="docText" />}
          primaryAction={{
            label: 'Add record',
            onPress: onPrimaryPress,
          }}
          secondaryAction={{
            label: 'View templates',
            onPress: onSecondaryPress,
          }}
          title="No records yet"
        />
        <View testID="pending-row-probe">
          <PendingDot accessibilityLabel="Saving changes" />
          <AppText>Saving changes</AppText>
        </View>
      </>,
    );

    expect(screen.getByRole('header', { name: 'No records yet' })).toBeTruthy();
    expect(screen.getByText('Add the first record to keep history in one place.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add record' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View templates' })).toBeTruthy();

    const pendingDot = screen.getByLabelText('Saving changes');
    const pendingDotStyle = StyleSheet.flatten(pendingDot.props.style);

    expect(pendingDotStyle.width).toBe(8);
    expect(pendingDotStyle.height).toBe(8);
    expect(pendingDotStyle.borderRadius).toBe(tokens.radius.full);
    expect(pendingDotStyle.backgroundColor).toBe(tokens.color.status.info);
    expect(screen.getByText('Saving changes')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Add record' }));
    fireEvent.press(screen.getByRole('button', { name: 'View templates' }));

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
    expect(onSecondaryPress).toHaveBeenCalledTimes(1);
  });

  it('covers atlas row, health, more, and tracker icons through AppIcon', () => {
    render(
      <>
        <AppIcon name="close" testID="icon-close" />
        <AppIcon name="docText" testID="icon-doc-text" />
        <AppIcon name="gear" testID="icon-gear" />
        <AppIcon name="home" testID="icon-home" />
        <AppIcon name="infoCircle" testID="icon-info" />
        <AppIcon name="lock" testID="icon-lock" />
        <AppIcon name="paw" testID="icon-paw" />
        <AppIcon name="personCluster" testID="icon-cluster" />
        <AppIcon name="sliders" testID="icon-sliders" />
        <AppIcon name="stethoscope" testID="icon-stethoscope" />
        <AppIcon name="trainingPaw" testID="icon-training-paw" />
        <AppIcon name="vaccine" testID="icon-vaccine" />
        <AppIcon name="weight" testID="icon-weight" />
        <AppIcon name="pottyInside" testID="icon-potty-inside" />
        <AppIcon name="book" filled testID="icon-book-filled" />
      </>,
    );

    [
      'icon-close',
      'icon-doc-text',
      'icon-gear',
      'icon-home',
      'icon-info',
      'icon-lock',
      'icon-paw',
      'icon-cluster',
      'icon-sliders',
      'icon-stethoscope',
      'icon-training-paw',
      'icon-vaccine',
      'icon-weight',
    ].forEach((testID) => {
      const icon = screen.getByTestId(testID, { includeHiddenElements: true });

      expect(icon.props.width).toBe(22);
      expect(icon.props.height).toBe(22);
      expect(icon.props.strokeWidth).toBe(tokens.icon.specs.stroke);
      expect(icon.props.accessibilityElementsHidden).toBe(true);
    });

    const pottyInside = screen.getByTestId('icon-potty-inside', { includeHiddenElements: true });

    expect(pottyInside.props.strokeWidth).toBe(tokens.icon.specs.stroke);
    expect(pottyInside.props.fill).toBe('none');
    expect(pottyInside.props.accessibilityElementsHidden).toBe(true);

    const bookFilled = screen.getByTestId('icon-book-filled', { includeHiddenElements: true });

    expect(bookFilled.props.fill).toBe(tokens.color.text.primary);
    expect(bookFilled.props.stroke).toBe('none');
    expect(bookFilled.props.accessibilityElementsHidden).toBe(true);
  });

  it('renders Stack layout spacing through the design boundary', () => {
    render(
      <Stack direction="horizontal" gap="sm" testID="stack-probe" wrap>
        <AppText>First</AppText>
        <AppText>Second</AppText>
      </Stack>,
    );

    const stackStyle = StyleSheet.flatten(screen.getByTestId('stack-probe').props.style);

    expect(stackStyle.flexDirection).toBe('row');
    expect(stackStyle.flexWrap).toBe('wrap');
    expect(stackStyle.gap).toBe(tokens.space[2]);
  });

  it('does not emit segmented value changes when re-selecting the current segment', () => {
    const onSegmentChange = jest.fn();

    render(
      <SegmentedControl
        accessibilityLabel="Current filter"
        onValueChange={onSegmentChange}
        options={[
          { label: 'All', value: 'all' },
          { label: 'Vaccines', value: 'vaccines' },
        ]}
        value="all"
      />,
    );

    fireEvent.press(screen.getByRole('tab', { name: 'All' }));

    expect(onSegmentChange).not.toHaveBeenCalled();
  });

  it('renders SheetSurface without a drag handle when requested', () => {
    render(
      <SheetSurface accessibilityLabel="Static panel" showDragHandle={false}>
        <AppText>Static panel body</AppText>
      </SheetSurface>,
    );

    expect(screen.getByLabelText('Static panel')).toBeTruthy();
    expect(screen.queryByTestId('sheet-drag-handle')).toBeNull();
  });

  it('keeps disabled row, tile, and segmented options from firing', () => {
    const onRowPress = jest.fn();
    const onTrackerPress = jest.fn();
    const onSegmentChange = jest.fn();

    render(
      <>
        <ListRow
          disabled
          onPress={onRowPress}
          selected
          title="Disabled row"
        />
        <TrackerTile
          disabled
          label="Disabled tile"
          onPress={onTrackerPress}
          recent
          selected
        />
        <SegmentedControl
          accessibilityLabel="Disabled filter"
          onValueChange={onSegmentChange}
          options={[
            { label: 'Enabled', value: 'enabled' },
            { disabled: true, label: 'Option disabled', value: 'option-disabled' },
          ]}
          value="enabled"
        />
        <SegmentedControl
          accessibilityLabel="Wrapper disabled filter"
          disabled
          onValueChange={onSegmentChange}
          options={[
            { label: 'All disabled', value: 'all-disabled' },
            { label: 'Also disabled', value: 'also-disabled' },
          ]}
          value="all-disabled"
        />
      </>,
    );

    const row = screen.getByRole('button', { name: 'Disabled row' });
    const tracker = screen.getByRole('button', { name: 'Disabled tile' });
    const optionDisabled = screen.getByRole('tab', { name: 'Option disabled' });
    const wrapperDisabledOption = screen.getByRole('tab', { name: 'Also disabled' });

    expect(row.props.accessibilityState).toMatchObject({ disabled: true, selected: true });
    expect(flattenViewStyle(row.props.style).backgroundColor).toBe(tokens.color.primary[50]);
    expect(tracker.props.accessibilityState).toMatchObject({ disabled: true, selected: true });
    expect(flattenViewStyle(tracker.props.style).borderColor).toBe(tokens.color.primary[600]);
    expect(flattenViewStyle(tracker.props.style).backgroundColor).toBe(tokens.color.primary[50]);
    expect(optionDisabled.props.accessibilityState).toMatchObject({ disabled: true });
    expect(wrapperDisabledOption.props.accessibilityState).toMatchObject({ disabled: true });
    expect(row.props.onPress).toBeFalsy();
    expect(tracker.props.onPress).toBeFalsy();
    expect(optionDisabled.props.onPress).toBeFalsy();
    expect(wrapperDisabledOption.props.onPress).toBeFalsy();

    expect(onRowPress).not.toHaveBeenCalled();
    expect(onTrackerPress).not.toHaveBeenCalled();
    expect(onSegmentChange).not.toHaveBeenCalled();
  });

  it('exposes ListRow radio and checkbox selection semantics without changing default rows', () => {
    render(
      <>
        <ListRow
          onPress={jest.fn()}
          selected
          selectionRole="radio"
          title="Selected tracker"
        />
        <ListRow
          onPress={jest.fn()}
          selected={false}
          selectionRole="checkbox"
          title="Optional scope"
        />
      </>,
    );

    expect(screen.getByRole('radio', { name: 'Selected tracker' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByRole('checkbox', { name: 'Optional scope' }).props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('keeps card variants isolated and applies elevation from interactivity', () => {
    const onHeroPress = jest.fn();
    const onMutedPress = jest.fn();

    render(
      <>
        <Card accessibilityLabel="Hero card" onPress={onHeroPress} testID="interactive-hero" variant="hero">
          <AppText>Interactive hero</AppText>
        </Card>
        <Card accessibilityLabel="Muted card" onPress={onMutedPress} testID="interactive-muted" variant="mutedTemplate">
          <AppText>Interactive muted</AppText>
        </Card>
        <Card testID="muted-card" variant="mutedTemplate">
          <AppText>Muted card</AppText>
        </Card>
      </>,
    );

    const heroBaseStyle = flattenViewStyle(
      screen.getByRole('button', { name: 'Hero card' }).props.style,
    );
    const pressedHeroStyle = flattenViewStyle(
      screen.getByRole('button', { name: 'Hero card' }).props.style,
      true,
    );
    const mutedPressStyle = flattenViewStyle(
      screen.getByRole('button', { name: 'Muted card' }).props.style,
      true,
    );
    const mutedStyle = StyleSheet.flatten(screen.getByTestId('muted-card').props.style);

    expect(heroBaseStyle.elevation).toBe(tokens.elevation[1].androidElevation);
    expect(pressedHeroStyle.padding).toBe(tokens.space[5]);
    expect(pressedHeroStyle.shadowRadius).toBe(tokens.elevation[1].blur);
    expect(mutedPressStyle.backgroundColor).toBe(tokens.color.surface.sunken);
    expect(mutedPressStyle.elevation).toBe(tokens.elevation[1].androidElevation);
    expect(mutedStyle.backgroundColor).toBe(tokens.color.surface.sunken);
    expect(mutedStyle.elevation).toBeUndefined();

    fireEvent.press(screen.getByRole('button', { name: 'Hero card' }));
    fireEvent.press(screen.getByRole('button', { name: 'Muted card' }));

    expect(onHeroPress).toHaveBeenCalledTimes(1);
    expect(onMutedPress).toHaveBeenCalledTimes(1);
  });

  it('keeps labelled static Card containers from collapsing nested controls', () => {
    render(
      <Card accessibilityLabel="Form section" testID="labelled-static-card">
        <Button label="Nested action" onPress={jest.fn()} />
      </Card>,
    );

    expect(screen.getByTestId('labelled-static-card').props.accessible).not.toBe(true);
    expect(screen.getByRole('button', { name: 'Nested action' })).toBeTruthy();
  });

  it('renders IconButton with hitSlop, disabled state, and token targets', () => {
    const onPress = jest.fn();

    render(
      <>
        <IconButton
          accessibilityLabel="Open menu"
          disabled
          icon={<View />}
          onPress={onPress}
          variant="tinted"
        />
        <IconButton
          accessibilityLabel="Close panel"
          hitSlop={{ bottom: 4, left: 4, right: 4, top: 4 }}
          icon={<View />}
          onPress={onPress}
        />
      </>,
    );

    const button = screen.getByRole('button', { name: 'Open menu' });
    const customHitSlopButton = screen.getByRole('button', { name: 'Close panel' });
    const style = flattenViewStyle(button.props.style);

    expect(button.props.hitSlop).toEqual(DEFAULT_HIT_SLOP);
    expect(customHitSlopButton.props.hitSlop).toEqual({ bottom: 4, left: 4, right: 4, top: 4 });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(style.minHeight).toBe(MIN_TOUCH_TARGET);
    expect(style.backgroundColor).toBe(tokens.color.primary[50]);

    fireEvent.press(customHitSlopButton);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps non-interactive ListRow semantics flattened unless callers provide a label', () => {
    render(
      <>
        <ListRow title="Plain row" />
        <ListRow accessibilityLabel="Static summary" title="Labelled static row" />
      </>,
    );

    expect(screen.queryByRole('button', { name: 'Plain row' })).toBeNull();
    expect(screen.queryByLabelText('Plain row')).toBeNull();
    expect(screen.getByLabelText('Static summary').props.accessible).toBe(true);
  });

  it.each([
    'template',
    'needsVetReview',
    'completed',
    'pending',
    'failed',
    'urgent',
  ] as const)('renders %s StatusPill tone with icon and text', (tone) => {
    render(
      <StatusPill
        accessibilityLabel={`${tone} status`}
        icon={<AppText accessibilityElementsHidden>i</AppText>}
        label={tone}
        tone={tone}
      />,
    );

    const status = screen.getByLabelText(`${tone} status`);
    const statusStyle = StyleSheet.flatten(status.props.style);

    expect(statusStyle.backgroundColor).toBe(tokens.color.pill[tone].fill);
    expect(screen.getByText(tone)).toBeTruthy();
  });

  it('keeps the Quick Log FAB accessible and at least 56pt', () => {
    const onPress = jest.fn();

    render(
      <FAB
        accessibilityHint="Double tap to open."
        accessibilityLabel="Quick log"
        onPress={onPress}
      />,
    );

    const button = screen.getByRole('button', { name: 'Quick log' });
    const baseStyle = flattenViewStyle(button.props.style);

    expect(button.props.accessibilityHint).toBe('Double tap to open.');
    expect(baseStyle.height).toBeGreaterThanOrEqual(56);
    expect(baseStyle.width).toBeGreaterThanOrEqual(56);
    expect(baseStyle.height).toBe(tokens.component.fab.size);
    expect(baseStyle.elevation).toBe(tokens.elevation[2].androidElevation);
    expect(baseStyle.shadowColor).toBe(tokens.elevation[2].color);
    expect(baseStyle.shadowOffset).toEqual({
      height: tokens.elevation[2].y,
      width: tokens.elevation[2].x,
    });
    expect(baseStyle.shadowOpacity).toBe(0.1);
    expect(baseStyle.shadowRadius).toBe(tokens.elevation[2].blur);
    const fabSymbol = screen.getByTestId('fab-symbol', { includeHiddenElements: true });
    expect(fabSymbol.props.width).toBe(28);
    expect(fabSymbol.props.height).toBe(28);

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders snackbar status with icon, text, tone, actions, and polite accessibility', async () => {
    const user = userEvent.setup();
    const onUndo = jest.fn();
    let snackbar: SnackbarController | null = null;

    render(
      <SnackbarProvider>
        <SnackbarControllerProbe onReady={(controller) => {
          snackbar = controller;
        }} />
      </SnackbarProvider>,
    );

    act(() => {
      snackbar?.showSnackbar({
        accessibilityLabel: 'Logged: feeding. Available actions: undo.',
        id: 'quick-log:evt_00000000-0000-4000-8000-000000000301',
        message: 'Logged · Feeding',
        primaryAction: {
          label: 'Undo',
          onPress: onUndo,
        },
        tone: 'success',
      });
    });

    const snackbarStatus = screen.getByLabelText('Logged: feeding. Available actions: undo.');
    const icon = screen.getByTestId('snackbar-tone-icon', {
      includeHiddenElements: true,
    });

    expect(snackbarStatus.props.testID).toBe('snackbar-status');
    expect(snackbarStatus.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByTestId('snackbar-surface').props.accessible).not.toBe(true);
    expect(screen.getByText('Logged · Feeding')).toBeTruthy();
    expect(icon.props.accessibilityElementsHidden).toBe(true);
    expect(StyleSheet.flatten(screen.getByTestId('snackbar-host').props.style).bottom).toBe(
      SNACKBAR_BOTTOM_OFFSET_WITH_FAB,
    );
    expect(StyleSheet.flatten(screen.getByTestId('snackbar-surface').props.style).backgroundColor).toBe(
      tokens.color.status.successTint,
    );

    await user.press(screen.getByRole('button', { name: 'Undo' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('anchors snackbar overlays in a full-height provider root', () => {
    let snackbar: SnackbarController | null = null;

    render(
      <SnackbarProvider>
        <SnackbarControllerProbe onReady={(controller) => {
          snackbar = controller;
        }} />
      </SnackbarProvider>,
    );

    act(() => {
      snackbar?.showSnackbar({
        accessibilityLabel: 'Logged: feeding.',
        id: 'quick-log:evt_00000000-0000-4000-8000-000000000301',
        message: 'Logged · Feeding',
        tone: 'success',
      });
    });

    const providerRootStyle = StyleSheet.flatten(screen.getByTestId('snackbar-provider-root').props.style);

    expect(providerRootStyle.flex).toBe(1);
    expect(screen.getByTestId('snackbar-host')).toBeTruthy();
  });

  it('renders snackbar host inside a full-window overlay above native-stack screens', () => {
    let snackbar: SnackbarController | null = null;

    render(
      <SnackbarProvider>
        <SnackbarControllerProbe onReady={(controller) => {
          snackbar = controller;
        }} />
      </SnackbarProvider>,
    );

    act(() => {
      snackbar?.showSnackbar({
        accessibilityLabel: 'Logged: feeding.',
        id: 'quick-log:evt_00000000-0000-4000-8000-000000000301',
        message: 'Logged · Feeding',
        tone: 'success',
      });
    });

    expect(screen.getByTestId('snackbar-window-overlay')).toBeTruthy();
    expect(screen.getByTestId('snackbar-host')).toBeTruthy();
  });

  it('triggers the snackbar haptic feedback contract when a message is shown', async () => {
    const hapticAdapter = jest.fn();
    let snackbar: SnackbarController | null = null;

    configureDesignHaptics(hapticAdapter);

    render(
      <SnackbarProvider>
        <SnackbarControllerProbe onReady={(controller) => {
          snackbar = controller;
        }} />
      </SnackbarProvider>,
    );

    const messageWithHaptic = {
      accessibilityLabel: 'Logged: feeding.',
      hapticEvent: 'saveSuccess',
      id: 'quick-log:evt_00000000-0000-4000-8000-000000000301',
      message: 'Logged · Feeding',
      tone: 'success',
    } satisfies Parameters<SnackbarController['showSnackbar']>[0] & {
      hapticEvent: 'saveSuccess';
    };

    act(() => {
      snackbar?.showSnackbar(messageWithHaptic);
    });

    await waitFor(() => {
      expect(hapticAdapter).toHaveBeenCalledWith('success', tokens.haptic.success);
    });
  });

  it('replaces snackbar messages by id instead of stacking stale status', () => {
    let snackbar: SnackbarController | null = null;

    render(
      <SnackbarProvider>
        <SnackbarControllerProbe onReady={(controller) => {
          snackbar = controller;
        }} />
      </SnackbarProvider>,
    );

    act(() => {
      snackbar?.showSnackbar({
        accessibilityLabel: 'Logged: feeding.',
        clientEventId: 'evt_00000000-0000-4000-8000-000000000301',
        id: 'quick-log:evt_00000000-0000-4000-8000-000000000301',
        message: 'Logged · Feeding',
        tone: 'success',
      });
      snackbar?.replaceSnackbar({
        accessibilityLabel: 'Could not save feeding. Available actions: retry or discard.',
        clientEventId: 'evt_00000000-0000-4000-8000-000000000301',
        id: 'quick-log:evt_00000000-0000-4000-8000-000000000301',
        message: "Couldn't save. Try again?",
        primaryAction: {
          label: 'Try again',
          onPress: jest.fn(),
        },
        secondaryAction: {
          label: 'Discard',
          onPress: jest.fn(),
        },
        tone: 'error',
      });
    });

    expect(screen.queryByText('Logged · Feeding')).toBeNull();
    expect(screen.getByText("Couldn't save. Try again?")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeTruthy();
  });

  it('does not replace a newer snackbar with a stale id and auto-dismisses after 4 seconds', () => {
    jest.useFakeTimers();
    let snackbar: SnackbarController | null = null;

    render(
      <SnackbarProvider>
        <SnackbarControllerProbe onReady={(controller) => {
          snackbar = controller;
        }} />
      </SnackbarProvider>,
    );

    act(() => {
      snackbar?.showSnackbar({
        accessibilityLabel: 'Logged first.',
        id: 'quick-log:first',
        message: 'Logged · Feeding',
        tone: 'success',
      });
      snackbar?.showSnackbar({
        accessibilityLabel: 'Logged second.',
        id: 'quick-log:second',
        message: 'Logged · Sleep',
        tone: 'success',
      });
      snackbar?.replaceSnackbar({
        accessibilityLabel: 'First failed.',
        id: 'quick-log:first',
        message: "Couldn't save first.",
        tone: 'error',
      });
    });

    expect(screen.queryByText("Couldn't save first.")).toBeNull();
    expect(screen.getByText('Logged · Sleep')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(SNACKBAR_DEFAULT_DURATION_MS);
    });

    expect(screen.queryByText('Logged · Sleep')).toBeNull();

    jest.useRealTimers();
  });
});
