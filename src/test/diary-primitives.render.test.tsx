import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { designFontFamilies } from '@/design/fonts';
import {
  AppText,
  CheckCircle,
  DayDivider,
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
  it('splits a clock time into number and meridiem', () => {
    render(<TimeGutter time="7:15 am" />);
    expect(screen.getByText('7:15')).toBeTruthy();
    expect(screen.getByText('am')).toBeTruthy();
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
  it('renders seven day tabs and marks the selected one', () => {
    render(
      <WeekStrip
        accessibilityLabel="Week"
        days={WEEK_DAYS}
        selectedIndex={3}
        todayIndex={3}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(7);
    expect(tabs.map((t) => t.props.accessibilityState?.selected)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
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
    fireEvent.press(screen.getByRole('tab', { name: 'Mon 11' }));
    expect(onSelectDay).toHaveBeenCalledWith(0);
  });
});

describe('InfoHero', () => {
  it('renders the guidance message with a summary role', () => {
    render(<InfoHero message="Puppies around 9 weeks sleep 18-20 hours." testID="hero" />);
    expect(screen.getByText('Puppies around 9 weeks sleep 18-20 hours.')).toBeTruthy();
    expect(screen.getByTestId('hero').props.accessibilityRole).toBe('summary');
    expect(flatten(screen.getByTestId('hero')).borderRadius).toBe(tokens.radius.hero);
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
