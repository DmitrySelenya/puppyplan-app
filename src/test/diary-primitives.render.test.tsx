import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { designFontFamilies } from '@/design/fonts';
import {
  AppText,
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

let mockFontScale = 1;

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperty(Object.create(actual) as typeof actual, 'useWindowDimensions', {
    value: () => ({ fontScale: mockFontScale, height: 667, scale: 2, width: 375 }),
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
  }),
);

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
  ])('AC-P33-GUTTER keeps the complete time gutter content-safe at fontScale $fontScale', ({
    expectedWidth,
    fontScale,
  }) => {
    mockFontScale = fontScale;
    render(<TimeGutter time="7:30 AM" testID="adaptive-time-gutter" />);

    const gutterStyle = flatten(screen.getByTestId('adaptive-time-gutter'));
    const clock = screen.getByText('7:30');
    const meridiem = screen.getByText('AM');

    expect(gutterStyle.width).toBe(expectedWidth);
    expect(gutterStyle.alignItems).toBe('flex-end');
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
});

describe('WeekStrip', () => {
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
