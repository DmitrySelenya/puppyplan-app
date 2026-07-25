import { ScrollView, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { designFontFamilies } from '@/design/fonts';
import {
  AppText,
  Button,
  CheckCircle,
  DayDivider,
  EmptyIllustration,
  FactCard,
  IconChip,
  InfoHero,
  RoutineCard,
  SwipeToDelete,
  TimeGutter,
  WeekStrip,
  type WeekStripDay,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { DiaryHeader } from '@/features/today/components/DiaryHeader';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

let mockFontScale = 1;

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperties(Object.create(actual) as typeof actual, {
    AccessibilityInfo: {
      value: {
        ...actual.AccessibilityInfo,
        isReduceMotionEnabled: jest.fn(() => new Promise<boolean>(() => {})),
      },
    },
    useWindowDimensions: {
      value: () => ({ fontScale: mockFontScale, height: 667, scale: 2, width: 375 }),
    },
  });
});

function flatten(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

const WEEK_DAYS: WeekStripDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
  (dow, index) => ({
    accessibilityLabel: `${dow} ${11 + index}`,
    day: 11 + index,
    dow,
    key: dow,
    testID: `week-day-${index}`,
  }),
);

function getWeekStripScrollToSpy() {
  return jest.mocked(ScrollView.prototype.scrollTo);
}

function getWeekStripScrollView() {
  return screen.UNSAFE_getByType(ScrollView);
}

function expectWeekStripNotScrollable() {
  const scrollView = screen.UNSAFE_queryByType(ScrollView);

  if (scrollView) {
    expect(scrollView.props.scrollEnabled).toBe(false);
  }
}

function measureWeekStripViewport(width: number) {
  const viewport = screen.getByTestId('week-strip');

  act(() => {
    viewport.props.onLayout?.({
      nativeEvent: { layout: { height: 58, width, x: 0, y: 0 } },
    });
  });
}

function measureWeekStripContent(width: number) {
  const content = screen.queryByTestId('week-strip-content');
  const scrollView = screen.UNSAFE_queryByType(ScrollView);

  act(() => {
    if (content?.props.onLayout) {
      content.props.onLayout({
        nativeEvent: { layout: { height: 58, width, x: 0, y: 0 } },
      });
      return;
    }

    scrollView?.props.onContentSizeChange?.(width, 58);
  });
}

function measureWeekStripDay(index: number, x: number, width = 64) {
  const day = screen.getByTestId(`week-day-${index}`);

  act(() => {
    day.props.onLayout?.({
      nativeEvent: {
        layout: { height: 58, width, x, y: 0 },
      },
    });
  });
}

function renderMeasuredWeekStrip(selectedIndex = 6, fontScale = 3) {
  mockFontScale = fontScale;

  return render(
    <WeekStrip
      accessibilityLabel="Week"
      days={WEEK_DAYS}
      onSelectDay={jest.fn()}
      selectedIndex={selectedIndex}
      testID="week-strip"
    />,
  );
}

describe('IconChip', () => {
  it('maps each accent family to its Clay background', () => {
    const cases: [Parameters<typeof IconChip>[0]['accent'], string][] = [
      ['clay', tokens.color.primary[50]],
      ['sage', tokens.color.sage[100]],
      ['honey', tokens.color.accent[100]],
      ['mauve', tokens.color.status.infoTint],
    ];

    for (const [accent, expected] of cases) {
      render(<IconChip accent={accent} icon="paw" testID={`chip-${accent}`} />);
      expect(flatten(screen.getByTestId(`chip-${accent}`)).backgroundColor).toBe(expected);
    }
  });

  it('uses a neutral surface for the quiet (past) variant', () => {
    render(<IconChip accent="clay" icon="paw" quiet testID="chip-quiet" />);
    expect(flatten(screen.getByTestId('chip-quiet')).backgroundColor).toBe(
      tokens.color.surface.base,
    );
  });

  it('uses the Diary chip radius token', () => {
    render(<IconChip accent="clay" icon="paw" testID="chip" />);
    expect(flatten(screen.getByTestId('chip')).borderRadius).toBe(tokens.radius.chip);
  });
});

describe('TimeGutter', () => {
  beforeEach(() => {
    mockFontScale = 1;
  });

  it.each([
    { expectedWidth: 62, fontScale: 1 },
    { expectedWidth: 62, fontScale: 1.9 },
    { expectedWidth: 62, fontScale: 2 },
  ])('AC-P33-GUTTER AC-P37-3 keeps the complete time gutter content-safe and left-aligned at fontScale $fontScale', ({
    expectedWidth,
    fontScale,
  }) => {
    mockFontScale = fontScale;
    render(<TimeGutter time="7:30 AM" testID="adaptive-time-gutter" />);

    const gutterStyle = flatten(screen.getByTestId('adaptive-time-gutter'));
    const clock = screen.getByText('7:30');
    const meridiem = screen.getByText('AM');

    // AC-P37-3: width stays 62pt so no localized time truncates, but the time is left-aligned to
    // the screen-edge side so short times no longer leave a large dead zone on the left.
    expect(gutterStyle.width).toBe(expectedWidth);
    expect(gutterStyle.alignItems).toBe('flex-start');
    expect(clock.props).toEqual(expect.objectContaining({
      allowFontScaling: true,
      children: '7:30',
      maxFontSizeMultiplier: 1.3,
      numberOfLines: 1,
    }));
    expect(StyleSheet.flatten(clock.props.style).fontVariant).toEqual(['tabular-nums']);
    expect(meridiem.props).toEqual(expect.objectContaining({
      allowFontScaling: true,
      children: 'AM',
      maxFontSizeMultiplier: 1.3,
      numberOfLines: 1,
    }));
  });

  it('AC-DT-2 AC-DT-3 AC-DT-4 keeps full fixed-gutter clock text scalable within 1.3', () => {
    render(<TimeGutter time="7:15 am" />);
    expect(screen.getByText('7:15').props).toEqual(expect.objectContaining({
      allowFontScaling: true,
      children: '7:15',
      maxFontSizeMultiplier: 1.3,
      numberOfLines: 1,
    }));
    expect(screen.getByText('am').props).toEqual(expect.objectContaining({
      allowFontScaling: true,
      children: 'am',
      maxFontSizeMultiplier: 1.3,
      numberOfLines: 1,
    }));
  });

  it('AC-P33-DOG-DIARY-AX delegates scaled TimeGutter line height to native metrics while preserving base overrides', () => {
    const base = render(<TimeGutter time="7:30 AM" />);

    expect(flatten(screen.getByText('7:30')).lineHeight).toBe(16);
    expect(flatten(screen.getByText('AM')).lineHeight).toBe(12);

    base.unmount();
    mockFontScale = 3;
    render(<TimeGutter time="7:30 AM" />);

    expect(flatten(screen.getByText('7:30')).lineHeight).toBeUndefined();
    expect(flatten(screen.getByText('AM')).lineHeight).toBeUndefined();
  });

  it('renders the clock in the display (Lora) family', () => {
    render(<TimeGutter time="1:00 pm" />);
    expect(flatten(screen.getByText('1:00')).fontFamily).toBe(designFontFamilies.display.semibold);
  });

  it('splits narrow no-break spaces from platform-formatted times', () => {
    render(<TimeGutter time={'7:15\u202fAM'} />);
    expect(screen.getByText('7:15')).toBeTruthy();
    expect(screen.getByText('AM')).toBeTruthy();
  });
});

describe('CheckCircle', () => {
  it('is a checkbox that reflects checked state and shows a sage fill when done', () => {
    render(<CheckCircle accessibilityLabel="Marked done" checked onPress={() => {}} testID="c" />);
    const box = screen.getByRole('checkbox', { name: 'Marked done' });
    expect(box.props.accessibilityState.checked).toBe(true);
    expect(flatten(screen.getByTestId('c-ring')).backgroundColor).toBe(tokens.color.sage[500]);
  });

  it('shows an empty clay ring when unchecked, and a neutral ring when quiet', () => {
    render(<CheckCircle accessibilityLabel="Mark done" checked={false} testID="active" />);
    expect(flatten(screen.getByTestId('active-ring')).borderColor).toBe(tokens.color.primary[400]);

    render(<CheckCircle accessibilityLabel="Mark done" checked={false} quiet testID="quiet" />);
    expect(flatten(screen.getByTestId('quiet-ring')).borderColor).toBe(tokens.color.stroke.strong);
  });

  it('PUP-38-B while syncing shows a spinner in a bordered ring and marks the checkbox busy', () => {
    render(
      <CheckCircle accessibilityLabel="Saving" checked onPress={() => {}} syncing testID="s" />,
    );

    // The just-tapped control itself shows the loading indicator — not the avatar, not a static dot.
    expect(screen.getByTestId('s-spinner')).toBeTruthy();
    const box = screen.getByRole('checkbox', { name: 'Saving' });
    expect(box.props.accessibilityState.busy).toBe(true);
    // While saving the ring stays bordered-and-empty (no premature green fill) until confirmed.
    const ring = flatten(screen.getByTestId('s-ring'));
    expect(ring.backgroundColor).toBeUndefined();
    expect(ring.borderColor).toBe(tokens.color.primary[400]);
  });
});

describe('WeekStrip', () => {
  beforeEach(() => {
    mockFontScale = 1;
  });

  it('renders non-interactive labelled days without tab semantics', () => {
    render(
      <WeekStrip
        accessibilityLabel="Week"
        days={WEEK_DAYS}
        selectedIndex={3}
        todayIndex={3}
      />,
    );

    expect(screen.getByLabelText('Week').props.accessibilityRole).toBeUndefined();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByLabelText('Thu 14').props.accessibilityState?.selected).toBeUndefined();
    for (const day of WEEK_DAYS) {
      expect(screen.getByText(day.dow).props).toEqual(expect.objectContaining({
        allowFontScaling: true,
        maxFontSizeMultiplier: 1.5,
      }));
      expect(screen.getByText(String(day.day)).props).toEqual(expect.objectContaining({
        allowFontScaling: true,
        maxFontSizeMultiplier: 1.5,
      }));
    }
    // Selected day number is rendered on the clay fill (on-primary text).
    expect(flatten(screen.getByText('14')).color).toBe(tokens.color.text.onPrimary);
  });

  it('calls onSelectDay with the tapped index', () => {
    const onSelectDay = jest.fn();
    render(
      <WeekStrip
        accessibilityLabel="Week"
        days={WEEK_DAYS}
        onSelectDay={onSelectDay}
        selectedIndex={3}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Mon 11' }));
    expect(onSelectDay).toHaveBeenCalledWith(0);
  });

  it('AC-P36-2 preserves the default seven-day anatomy, geometry, targets, and selected state', () => {
    render(
      <WeekStrip
        accessibilityLabel="Week"
        days={WEEK_DAYS}
        onSelectDay={jest.fn()}
        selectedIndex={3}
        testID="week-strip"
        todayIndex={3}
      />,
    );

    const strip = screen.queryByTestId('week-strip-content') ?? screen.getByTestId('week-strip');
    const geometry = StyleSheet.flatten(
      (strip.props.contentContainerStyle ?? strip.props.style) as never,
    ) as Record<string, unknown>;
    const dayButtons = screen.getAllByRole('button').filter((node) =>
      WEEK_DAYS.some((day) => day.accessibilityLabel === node.props.accessibilityLabel));

    expect(geometry).toEqual(expect.objectContaining({
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: tokens.space[3],
    }));
    expect(dayButtons).toHaveLength(7);
    for (const [index, button] of dayButtons.entries()) {
      expect(flatten(button)).toEqual(expect.objectContaining({
        minHeight: 58,
        minWidth: 44,
      }));
      expect(button.props.accessibilityState).toEqual(expect.objectContaining({
        selected: index === 3,
      }));
    }
  });

  it('AC-P36-2 enables scrolling from measured overflow even below the large-text threshold', () => {
    renderMeasuredWeekStrip(6, 1);

    const scrollTo = getWeekStripScrollToSpy();
    scrollTo.mockClear();
    expectWeekStripNotScrollable();
    measureWeekStripViewport(320);
    measureWeekStripContent(600);
    measureWeekStripDay(6, 480);

    expect(getWeekStripScrollView().props).toEqual(expect.objectContaining({
      horizontal: true,
      scrollEnabled: true,
      showsHorizontalScrollIndicator: false,
    }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('AC-P36-2 keeps exact-fit large-text content non-scrollable', () => {
    renderMeasuredWeekStrip();

    const scrollTo = getWeekStripScrollToSpy();
    scrollTo.mockClear();
    measureWeekStripViewport(512);
    measureWeekStripContent(512);
    measureWeekStripDay(6, 448);

    expectWeekStripNotScrollable();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(flatten(screen.getByTestId('week-day-6'))).toEqual(expect.objectContaining({
      minHeight: 58,
      minWidth: 44,
      width: 64,
    }));
  });

  it('AC-P36-2 waits for viewport, content, and selected-cell measurements before scrolling', () => {
    renderMeasuredWeekStrip();

    const scrollTo = getWeekStripScrollToSpy();
    scrollTo.mockClear();

    expectWeekStripNotScrollable();
    measureWeekStripViewport(320);
    expectWeekStripNotScrollable();
    expect(scrollTo).not.toHaveBeenCalled();

    measureWeekStripContent(600);
    expect(getWeekStripScrollView().props).toEqual(expect.objectContaining({
      horizontal: true,
      scrollEnabled: true,
      showsHorizontalScrollIndicator: false,
    }));
    expect(scrollTo).not.toHaveBeenCalled();

    measureWeekStripDay(6, 480);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('AC-P36-2 scrolls the selected last day into the valid visible and clamped range', () => {
    renderMeasuredWeekStrip();

    const scrollTo = getWeekStripScrollToSpy();
    scrollTo.mockClear();
    measureWeekStripViewport(320);
    measureWeekStripContent(600);
    measureWeekStripDay(6, 480);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    const firstArgument = scrollTo.mock.calls[0]?.[0];
    expect(firstArgument).toEqual(expect.objectContaining({ x: expect.any(Number) }));
    const x = typeof firstArgument === 'object' && firstArgument !== null
      ? firstArgument.x ?? Number.NaN
      : Number.NaN;
    expect(x).toBeGreaterThanOrEqual(480 + 64 - 320);
    expect(x).toBeLessThanOrEqual(Math.min(480, 600 - 320));
  });

  it('AC-P36-2 scrolls back to the start when selection changes to the measured first day', () => {
    const view = renderMeasuredWeekStrip();

    const scrollTo = getWeekStripScrollToSpy();
    scrollTo.mockClear();
    measureWeekStripViewport(320);
    measureWeekStripContent(600);
    measureWeekStripDay(6, 480);
    scrollTo.mockClear();

    view.rerender(
      <WeekStrip
        accessibilityLabel="Week"
        days={WEEK_DAYS}
        onSelectDay={jest.fn()}
        selectedIndex={0}
        testID="week-strip"
      />,
    );
    measureWeekStripDay(0, 0);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ x: 0 }));
  });

  it('AC-P36-2 waits for the current selected-cell layout after ordered day keys change', () => {
    const view = renderMeasuredWeekStrip();
    const scrollTo = getWeekStripScrollToSpy();
    const nextWeekDays = WEEK_DAYS.map((entry) => ({
      ...entry,
      key: `next-${entry.key}`,
    }));

    scrollTo.mockClear();
    measureWeekStripViewport(320);
    measureWeekStripContent(600);
    measureWeekStripDay(6, 480);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    scrollTo.mockClear();

    view.rerender(
      <WeekStrip
        accessibilityLabel="Week"
        days={nextWeekDays}
        onSelectDay={jest.fn()}
        selectedIndex={6}
        testID="week-strip"
      />,
    );
    measureWeekStripContent(680);

    expect(scrollTo).not.toHaveBeenCalled();

    measureWeekStripDay(6, 600);
    expect(scrollTo).toHaveBeenCalledTimes(1);

    measureWeekStripContent(680);
    measureWeekStripDay(6, 600);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});

describe('InfoHero', () => {
  it('renders the guidance message with a summary role', () => {
    render(<InfoHero message="Puppies around 9 weeks sleep 18-20 hours." testID="hero" />);
    expect(screen.getByText('Puppies around 9 weeks sleep 18-20 hours.')).toBeTruthy();
    expect(screen.getByText('Puppies around 9 weeks sleep 18-20 hours.').props).toEqual(
      expect.objectContaining({ allowFontScaling: true, maxFontSizeMultiplier: 2 }),
    );
    expect(screen.getByTestId('hero').props.accessibilityRole).toBe('summary');
    expect(flatten(screen.getByTestId('hero')).borderRadius).toBe(tokens.radius.hero);
  });

  it('AC-P33-HERO sets a guidance title in the display face above the body', () => {
    render(
      <InfoHero
        message="Diary stays quiet when logs are current."
        testID="hero"
        title="Keep the rhythm visible"
      />,
    );

    // Fusing the title into the message string renders it as the first line of the paragraph:
    // same face, same size, same tone. The title has to carry the display face to read as a title.
    expect(flatten(screen.getByText('Keep the rhythm visible')).fontFamily)
      .toBe(designFontFamilies.display.semibold);
    expect(flatten(screen.getByText('Diary stays quiet when logs are current.')).fontFamily)
      .toBe(designFontFamilies.text.regular);
  });

  it('AC-P33-HERO subordinates the body tone only when a title is present', () => {
    const { rerender } = render(<InfoHero message="Standalone tip." testID="hero" />);
    const standaloneColor = flatten(screen.getByText('Standalone tip.')).color;

    rerender(<InfoHero message="Body copy." testID="hero" title="A title" />);

    expect(flatten(screen.getByText('Body copy.')).color).not.toBe(standaloneColor);
  });
});

describe('EmptyIllustration', () => {
  it('matches the compact Diary empty-state illustration frame', () => {
    render(<EmptyIllustration testID="empty-illustration" />);
    const frameStyle = flatten(screen.getByTestId('empty-illustration', {
      includeHiddenElements: true,
    }));

    expect(frameStyle.backgroundColor).toBe(tokens.color.primary[50]);
    expect(frameStyle.height).toBe(96);
    expect(frameStyle.width).toBe(96);
    expect(frameStyle.borderRadius).toBe(48);
  });
});

describe('DayDivider', () => {
  it('renders the label and optional sub-label', () => {
    render(<DayDivider label="Yesterday" sub="Wed, May 13" />);
    expect(screen.getByText('Yesterday')).toBeTruthy();
    expect(screen.getByText('Wed, May 13')).toBeTruthy();
  });
});

describe('RoutineCard', () => {
  const base = {
    checkboxLabel: 'Mark done',
    icon: 'walk' as const,
    overflowLabel: 'Routine actions',
    time: '7:15 am',
  };

  it('done state: checkbox checked and a sage card fill', () => {
    render(
      <RoutineCard
        {...base}
        accessibilityLabel="Walk, done"
        state="done"
        testID="r"
        title="Walk"
      />,
    );
    expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(true);
    expect(flatten(screen.getByTestId('r-card')).borderRadius).toBe(tokens.radius.card);
    expect(flatten(screen.getByTestId('r-card')).backgroundColor).toBe(tokens.color.sage[100]);
  });

  it('upcoming state: unchecked with a raised card fill and an overflow button', () => {
    render(
      <RoutineCard
        {...base}
        accessibilityLabel="Feeding, planned"
        state="upcoming"
        testID="r"
        title="Feeding"
      />,
    );
    expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(false);
    expect(flatten(screen.getByTestId('r-card')).backgroundColor).toBe(
      tokens.color.surface.raised,
    );
    expect(screen.getByRole('button', { name: 'Routine actions' })).toBeTruthy();
  });

  it('past state: dims the card to 0.78 opacity', () => {
    render(
      <RoutineCard {...base} accessibilityLabel="Nap, past" state="past" testID="r" title="Nap" />,
    );
    expect(flatten(screen.getByTestId('r-card')).opacity).toBe(0.78);
  });

  it('PUP-38-B syncing shows the check-off spinner and holds the card off the done fill', () => {
    render(
      <RoutineCard
        {...base}
        accessibilityLabel="Walk, saving"
        checkboxTestID="rc"
        state="done"
        syncing
        testID="r"
        title="Walk"
      />,
    );

    expect(screen.getByTestId('rc-spinner')).toBeTruthy();
    expect(screen.getByRole('checkbox').props.accessibilityState.busy).toBe(true);
    // Not settled yet: the card must not read as done (sage) while the write is still in flight.
    expect(flatten(screen.getByTestId('r-card')).backgroundColor).toBe(tokens.color.surface.raised);
  });

  it('renders the notifications-off row when reminderOff is set', () => {
    render(
      <RoutineCard
        {...base}
        accessibilityLabel="Nap"
        reminderOff
        reminderOffLabel="Notifications off"
        title="Nap"
      />,
    );
    expect(screen.getByText('Notifications off')).toBeTruthy();
  });
});

describe('FactCard', () => {
  it('renders a sunken card with title and caption', () => {
    render(
      <FactCard
        accessibilityLabel="Play, 2:32 pm, Logged"
        caption="Logged · 10 min"
        icon="ball"
        testID="f"
        time="2:32 pm"
        title="Play"
      />,
    );
    expect(flatten(screen.getByTestId('f-card')).backgroundColor).toBe(
      tokens.color.surface.sunken,
    );
    expect(flatten(screen.getByTestId('f-card')).borderRadius).toBe(tokens.radius.card);
    expect(screen.getByText('Play')).toBeTruthy();
    expect(screen.getByText('Logged · 10 min')).toBeTruthy();
  });

  it('AC-P33-READ AC-P33-CORRECT renders a two-line note preview and separate row/actions buttons', () => {
    const onActionsPress = jest.fn();
    const onPress = jest.fn();

    render(
      <FactCard
        accessibilityLabel="Observation, 2:32 pm, Synthetic private context"
        actionsLabel="Fact actions"
        caption="Logged · 10 min"
        icon="paw"
        note="Synthetic private context"
        onActionsPress={onActionsPress}
        onPress={onPress}
        testID="noted-fact"
        time="2:32 pm"
        title="Observation"
      />,
    );

    const row = screen.getByRole('button', {
      name: 'Observation, 2:32 pm, Synthetic private context',
    });
    const actions = screen.getByRole('button', { name: 'Fact actions' });
    const note = screen.getByText('Synthetic private context');

    expect(note.props).toEqual(expect.objectContaining({ numberOfLines: 2 }));
    expect(flatten(note).color).toBe(tokens.color.text.primary);
    expect(flatten(actions).minHeight).toBeGreaterThanOrEqual(44);
    expect(flatten(actions).minWidth).toBeGreaterThanOrEqual(44);

    fireEvent.press(row);
    fireEvent.press(actions);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onActionsPress).toHaveBeenCalledTimes(1);
  });
});

describe('SwipeToDelete', () => {
  it('renders its children and keeps the revealed delete action closed and accessibility-hidden until swiped open', () => {
    const onDelete = jest.fn();
    render(
      <SwipeToDelete
        deleteLabel="Delete entry"
        onDelete={onDelete}
        testID="swipe-delete">
        <AppText>Feeding</AppText>
      </SwipeToDelete>,
    );

    expect(screen.getByText('Feeding')).toBeTruthy();

    const action = screen.getByTestId('swipe-delete', { includeHiddenElements: true });
    expect(action.props.accessibilityElementsHidden).toBe(true);
    expect(action.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(flatten(action).borderRadius).toBe(tokens.radius.card);
    expect(screen.queryByRole('button', { name: 'Delete entry' })).toBeNull();

    fireEvent.press(action);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe('Diary XXXL accessibility anatomy', () => {
  it('AC-P33-DOG-DIARY-AX stacks anatomy, keeps full labels, and delegates scaled line height to native metrics', async () => {
    mockFontScale = 1;
    await i18n.changeLanguage('en');
    const shareLabel = i18n.t('today.history.share-action');
    const reviewLabel = i18n.t('today.history.open-action');
    const base = render(
      <AppProviders>
        <AppText testID="base-footnote-line-height" variant="footnote">
          Synthetic base footnote
        </AppText>
        <AppText testID="base-headline-line-height" variant="headline">
          Synthetic base headline
        </AppText>
      </AppProviders>,
    );

    expect(flatten(screen.getByTestId('base-footnote-line-height')).lineHeight).toBe(
      tokens.typography.scale.footnote.lineHeight,
    );
    expect(flatten(screen.getByTestId('base-headline-line-height')).lineHeight).toBe(
      tokens.typography.scale.headline.lineHeight,
    );

    base.unmount();
    mockFontScale = 3;

    render(
      <AppProviders>
        <DiaryHeader
          puppyName="Synthetic long puppy name"
          timeOfDay="morning"
          todayDate="2026-07-14"
        />
        <WeekStrip
          accessibilityLabel="Synthetic week"
          days={WEEK_DAYS}
          onSelectDay={jest.fn()}
          selectedIndex={1}
          todayIndex={1}
          testID="ax-week-strip"
        />
        <FactCard
          accessibilityLabel="Synthetic full fact accessibility label"
          actionsLabel="Synthetic full fact actions label"
          caption="Synthetic complete caption that must remain readable"
          icon="paw"
          onActionsPress={jest.fn()}
          testID="ax-fact"
          time="10:35 AM"
          title="Synthetic complete fact title that must remain readable"
        />
        <Button label={shareLabel} onPress={jest.fn()} testID="ax-share-day" />
        <Button label={reviewLabel} onPress={jest.fn()} testID="ax-review-history" />
        <AppText testID="ax-footnote-line-height" variant="footnote">
          Synthetic XXXL footnote
        </AppText>
        <AppText testID="ax-headline-line-height" variant="headline">
          Synthetic XXXL headline
        </AppText>
        <AppText
          allowFontScaling={false}
          testID="ax-static-footnote-line-height"
          variant="footnote">
          Synthetic non-scaling footnote
        </AppText>
      </AppProviders>,
    );

    expect(flatten(screen.getByTestId('diary-header-row'))).toEqual(expect.objectContaining({
      alignItems: 'stretch',
      flexDirection: 'column',
    }));
    expect(screen.UNSAFE_getByType(ScrollView).props).toEqual(expect.objectContaining({
      horizontal: true,
      showsHorizontalScrollIndicator: false,
    }));
    expect(screen.getAllByRole('button').filter((node) =>
      WEEK_DAYS.some((day) => day.accessibilityLabel === node.props.accessibilityLabel),
    )).toHaveLength(7);
    expect(flatten(screen.getByTestId('ax-fact'))).toEqual(expect.objectContaining({
      alignItems: 'stretch',
      flexDirection: 'column',
    }));
    expect(screen.getByText('Synthetic complete fact title that must remain readable').props)
      .toEqual(expect.objectContaining({
        children: 'Synthetic complete fact title that must remain readable',
      }));
    expect(screen.getByText('Synthetic complete caption that must remain readable').props)
      .toEqual(expect.objectContaining({
        children: 'Synthetic complete caption that must remain readable',
      }));
    expect(screen.getByRole('button', { name: 'Synthetic full fact actions label' })).toBeTruthy();
    expect(screen.getByText(shareLabel).props.children).toBe(shareLabel);
    expect(screen.getByText(reviewLabel).props.children).toBe(reviewLabel);
    expect(flatten(screen.getByTestId('ax-footnote-line-height')).lineHeight).toBeUndefined();
    expect(flatten(screen.getByTestId('ax-headline-line-height')).lineHeight).toBeUndefined();
    expect(flatten(screen.getByTestId('ax-static-footnote-line-height')).lineHeight).toBe(
      tokens.typography.scale.footnote.lineHeight,
    );
  });
});
