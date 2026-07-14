import type { ReactElement } from 'react';
import { AccessibilityInfo } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import {
  createQuickLogDetailPayload,
  createQuickLogDetailDraft,
  quickLogDetailDraftSchema,
} from '@/contracts/quick-log';
import { eventPayloadSchemasV2 } from '@/contracts/supabase';
import {
  QuickLogDetailsScreen,
  QuickLogDetailsStatePreview,
  type QuickLogDetailsReviewState,
} from '@/features/quick-log/screens/QuickLogDetailsScreen';
import { i18n } from '@/lib/i18n';
import { formatDiaryDayExport } from '@/lib/diary/day-export';
import { parseQuickEntryBatch, parseQuickEntryLine } from '@/lib/quick-entry/parser';

// The native picker serializes its bound props to epoch milliseconds.
function toTimestamp(value: Date | number): number {
  return typeof value === 'number' ? value : value.getTime();
}

function renderDetails(
  element: ReactElement,
) {
  return render(
    <I18nextProvider i18n={i18n}>
      {element}
    </I18nextProvider>,
  );
}

describe('Quick Log details', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    reduceMotionProbe.mockRestore();
  });

  it('parses optional detail drafts for feeding, sleep, and zoomies only', () => {
    expect(createQuickLogDetailDraft({
      amount: 'water',
      trackerId: 'feeding',
    })).toEqual({
      amount: 'water',
      trackerId: 'feeding',
    });
    expect(createQuickLogDetailDraft({
      durationMinutes: 30,
      trackerId: 'sleep',
    })).toEqual({
      durationMinutes: 30,
      trackerId: 'sleep',
    });
    expect(createQuickLogDetailDraft({
      intensity: 'high',
      trackerId: 'zoomies',
    })).toEqual({
      intensity: 'high',
      trackerId: 'zoomies',
    });
    expect(quickLogDetailDraftSchema.safeParse({
      trackerId: 'potty',
    }).success).toBe(false);
  });

  it('renders feeding details and saves a typed optional amount draft', () => {
    const onSave = jest.fn();

    renderDetails(
      <QuickLogDetailsScreen
        initialTrackerId="feeding"
        onSave={onSave}
      />,
    );

    expect(screen.getByText(i18n.t('quick-log.details.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.details.feeding.amount-label'))).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('quick-log.details.feeding.amount.water'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.save'),
    }));

    expect(onSave).toHaveBeenCalledWith({
      amount: 'water',
      trackerId: 'feeding',
    });
  });

  it('renders sleep details and saves a typed optional duration draft', () => {
    const onSave = jest.fn();

    renderDetails(
      <QuickLogDetailsScreen
        initialTrackerId="sleep"
        onSave={onSave}
      />,
    );

    expect(screen.getByText(i18n.t('quick-log.details.sleep.duration-label'))).toBeTruthy();
    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-log.details.sleep.duration-label')),
      '30',
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.save'),
    }));

    expect(onSave).toHaveBeenCalledWith({
      durationMinutes: 30,
      trackerId: 'sleep',
    });
  });

  it('renders zoomies details and saves a typed optional intensity draft', () => {
    const onSave = jest.fn();

    renderDetails(
      <QuickLogDetailsScreen
        initialTrackerId="zoomies"
        onSave={onSave}
      />,
    );

    expect(screen.getByText(i18n.t('quick-log.details.zoomies.intensity-label'))).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('quick-log.details.zoomies.intensity.high'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.save'),
    }));

    expect(onSave).toHaveBeenCalledWith({
      intensity: 'high',
      trackerId: 'zoomies',
    });
  });

  it('AC-QL-DETAIL-ALL-KINDS renders all seven event selector buttons', () => {
    renderDetails(<QuickLogDetailsScreen />);

    for (const label of [
      'Potty',
      'Feeding',
      'Sleep',
      'Walk',
      'Zoomies',
      'Training',
      'Observation',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('AC-QL-DETAIL-OBSERVATION saves title, note, and occurredAt', () => {
    const onSave = jest.fn();
    const occurredAt = new Date(Date.now() - 60_000);

    renderDetails(<QuickLogDetailsScreen onSave={onSave} />);

    fireEvent.press(screen.getByRole('button', { name: 'Observation' }));
    fireEvent.changeText(screen.getByLabelText('Title'), 'Calm greeting');
    fireEvent.changeText(screen.getByLabelText('Private note'), 'Settled after a minute');
    fireEvent.press(screen.getByTestId('quick-log-details-when-pill'));
    fireEvent(screen.getByTestId('quick-log-details-when-wheel'), 'onChange', {
      nativeEvent: { timestamp: occurredAt.getTime() },
    });
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.save'),
    }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      note: 'Settled after a minute',
      occurredAt: occurredAt.toISOString(),
      title: 'Calm greeting',
      trackerId: 'observation',
    }));
  });

  it('AC-P33-CORRECT pre-fills the exact draft when a writer edits an existing fact', () => {
    const occurredAt = '2026-07-13T08:35:00.000Z';

    renderDetails(
      <QuickLogDetailsScreen
        initialDraft={{
          note: 'Synthetic private context',
          occurredAt,
          title: 'Calm observation',
          trackerId: 'observation',
        }}
      />,
    );

    expect(screen.getByLabelText('Title')).toHaveProp('value', 'Calm observation');
    expect(screen.getByLabelText('Private note')).toHaveProp(
      'value',
      'Synthetic private context',
    );
    fireEvent.press(screen.getByTestId('quick-log-details-when-pill'));
    expect(screen.getByTestId('quick-log-details-when-wheel').props.date)
      .toBe(new Date(occurredAt).getTime());
  });

  it('AC-P33-TIME exposes offset chips and saves the offset they apply', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 13, 12, 0, 0));
    const onSave = jest.fn();

    try {
      renderDetails(<QuickLogDetailsScreen initialTrackerId="feeding" onSave={onSave} />);

      for (const label of ['Now', '−15m', '−30m', '−1h']) {
        expect(screen.getByRole('button', { name: label })).toBeTruthy();
      }

      fireEvent.press(screen.getByRole('button', { name: '−30m' }));
      fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-log.details.save') }));

      const expected = new Date(2026, 6, 13, 11, 30, 0, 0).toISOString();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ occurredAt: expected }));
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-QN-NIGHT records a retrospective sleep of arbitrary length, not just the chip presets', () => {
    const onSave = jest.fn();

    renderDetails(
      <QuickLogDetailsScreen
        initialSleepAction="retrospective"
        initialTrackerId="sleep"
        onSave={onSave}
      />,
    );

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-log.details.sleep.duration-label')),
      '414',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-log.details.save') }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      action: 'retrospective',
      durationMinutes: 414,
      trackerId: 'sleep',
    }));
  });

  it('AC-QN-NIGHT rejects a sleep duration the payload schema cannot carry', () => {
    const onSave = jest.fn();

    renderDetails(
      <QuickLogDetailsScreen
        initialSleepAction="retrospective"
        initialTrackerId="sleep"
        onSave={onSave}
      />,
    );

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-log.details.sleep.duration-label')),
      '1441',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-log.details.save') }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(i18n.t('quick-log.details.sleep.duration-error'))).toBeTruthy();
  });

  it('AC-QN-POLISH titles the sheet as an edit when an existing fact is opened', () => {
    renderDetails(
      <QuickLogDetailsScreen
        initialDraft={{
          note: 'Synthetic private context',
          occurredAt: '2026-07-13T08:35:00.000Z',
          trackerId: 'observation',
        }}
        trackerLocked
      />,
    );

    expect(screen.getByText(i18n.t('quick-log.details.edit-title'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('quick-log.details.edit-save') }))
      .toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('common.cancel') })).toBeTruthy();
    expect(screen.queryByText(i18n.t('quick-log.details.title'))).toBeNull();
    expect(screen.queryByRole('button', { name: i18n.t('quick-log.details.skip') })).toBeNull();
  });

  it('AC-QN-POLISH keeps the add-titled strings when a new fact is captured', () => {
    renderDetails(<QuickLogDetailsScreen initialTrackerId="feeding" />);

    expect(screen.getByText(i18n.t('quick-log.details.title'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('quick-log.details.save') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('quick-log.details.skip') })).toBeTruthy();
  });

  it('AC-QN-WHEN backdates last night from midday without a future-time error', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 12, 56, 0));
    const lastNight = new Date(2026, 6, 13, 23, 41, 0);
    const onSave = jest.fn();

    try {
      renderDetails(<QuickLogDetailsScreen initialTrackerId="sleep" onSave={onSave} />);

      fireEvent.press(screen.getByTestId('quick-log-details-when-pill'));
      fireEvent(screen.getByTestId('quick-log-details-when-wheel'), 'onChange', {
        nativeEvent: { timestamp: lastNight.getTime() },
      });
      fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-log.details.save') }));

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        occurredAt: lastNight.toISOString(),
      }));
      expect(screen.queryByText(/future/i)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-QN-WHEN keeps the chosen time when the day changes', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 12, 56, 0));

    try {
      renderDetails(<QuickLogDetailsScreen initialTrackerId="sleep" />);

      fireEvent.press(screen.getByTestId('quick-log-details-when-pill'));
      fireEvent(screen.getByTestId('quick-log-details-when-wheel'), 'onChange', {
        nativeEvent: { timestamp: new Date(2026, 6, 13, 23, 41, 0).getTime() },
      });

      const pill = screen.getByTestId('quick-log-details-when-pill');

      expect(pill.props.accessibilityValue.text).toContain('23:41');
      expect(pill.props.accessibilityValue.text).not.toBe('23:41');
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-QN-WHEN bounds the wheel so an out-of-range time cannot be entered', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 12, 0, 0));

    try {
      renderDetails(<QuickLogDetailsScreen initialTrackerId="feeding" />);
      fireEvent.press(screen.getByTestId('quick-log-details-when-pill'));

      const wheel = screen.getByTestId('quick-log-details-when-wheel');

      expect(toTimestamp(wheel.props.maximumDate)).toBe(Date.now());
      expect(toTimestamp(wheel.props.minimumDate)).toBe(Date.now() - 7 * 24 * 60 * 60 * 1_000);
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-P33-PAYLOAD round-trips every detailed tracker through its canonical v2 schema', () => {
    const occurredAt = '2026-07-13T08:35:00.000Z';
    const cases = [
      ['potty', { trackerId: 'potty', subtype: 'outside', occurredAt }],
      ['feeding', { trackerId: 'feeding', amount: 'meal', occurredAt }],
      ['sleep', {
        trackerId: 'sleep', action: 'retrospective', durationMinutes: 30, occurredAt,
      }],
      ['walk', { trackerId: 'walk', durationMinutes: 15, occurredAt }],
      ['zoomies', { trackerId: 'zoomies', intensity: 'medium', occurredAt }],
      ['training', {
        trackerId: 'training', topic: 'settling', durationBucket: 'short', occurredAt,
      }],
      ['observation', {
        trackerId: 'observation', title: 'Calm observation', occurredAt,
      }],
    ] as const;

    for (const [eventType, draft] of cases) {
      const payload = createQuickLogDetailPayload({ draft, eventType });
      expect(eventPayloadSchemasV2[eventType].safeParse(payload).success).toBe(true);
    }
  });

  it('AC-P33-ENTRY recognizes bilingual tracker words and preserves unknown input losslessly', () => {
    const now = new Date(2026, 6, 13, 12, 0, 0);
    const recognized = parseQuickEntryLine('07:15 пописал', { locale: 'ru', now });
    const unknown = parseQuickEntryLine('07:42 спокойно лежал', { locale: 'ru', now });

    expect(recognized).toMatchObject({
      detailDraft: { subtype: 'outside', trackerId: 'potty' },
      sourceLine: '07:15 пописал',
      trackerId: 'potty',
    });
    expect(new Date(recognized.occurredAt)).toEqual(new Date(2026, 6, 13, 7, 15, 0, 0));
    expect(unknown).toMatchObject({
      detailDraft: { note: '07:42 спокойно лежал', trackerId: 'observation' },
      sourceLine: '07:42 спокойно лежал',
      trackerId: 'observation',
    });
  });

  it('AC-P33-ENTRY parses newline batches independently in source order without dropping a line', () => {
    const parsed = parseQuickEntryBatch(
      '08:16 проснулся\n08:25 поел\n08:40 запись без словаря',
      { locale: 'ru', now: new Date(2026, 6, 13, 12, 0, 0) },
    );

    expect(parsed.map(({ sourceLine, trackerId }) => [sourceLine, trackerId])).toEqual([
      ['08:16 проснулся', 'sleep'],
      ['08:25 поел', 'feeding'],
      ['08:40 запись без словаря', 'observation'],
    ]);
    expect(parsed[2]?.detailDraft).toMatchObject({
      note: '08:40 запись без словаря',
      trackerId: 'observation',
    });
  });

  it('AC-P33-EXPORT formats a day oldest-to-newest as chat-readable HH:MM lines', () => {
    expect(formatDiaryDayExport({
      items: [
        {
          clientEventId: 'evt_00000000-0000-4000-8000-000000000302',
          occurredAt: '2026-07-13T08:16:00.000Z',
          title: 'Woke up',
        },
        {
          clientEventId: 'evt_00000000-0000-4000-8000-000000000301',
          note: 'Synthetic private context',
          occurredAt: '2026-07-13T07:15:00.000Z',
          title: 'Pee outside',
        },
      ],
      locale: 'en-GB',
      timeZone: 'UTC',
    })).toBe('07:15 Pee outside — Synthetic private context\n08:16 Woke up');
  });

  it('AC-QL-DETAIL-TIME rejects a future time inline and preserves the note', () => {
    const onSave = jest.fn();
    const future = new Date(Date.now() + 60 * 60 * 1_000);

    renderDetails(<QuickLogDetailsScreen initialTrackerId="observation" onSave={onSave} />);

    const note = screen.getByLabelText('Private note');
    fireEvent.changeText(note, 'Keep this draft');
    fireEvent.press(screen.getByTestId('quick-log-details-when-pill'));
    fireEvent(screen.getByTestId('quick-log-details-when-wheel'), 'onChange', {
      nativeEvent: { timestamp: future.getTime() },
    });
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.save'),
    }));

    expect(screen.getByText(/future/i)).toBeTruthy();
    expect(screen.getByLabelText('Private note')).toHaveProp('value', 'Keep this draft');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('AC-2 saves potty subtype and exact time in the typed draft', () => {
    const onSave = jest.fn();
    renderDetails(<QuickLogDetailsScreen initialTrackerId="potty" onSave={onSave} />);

    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('quick-log.details.potty.subtype.inside'),
    }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-log.details.save') }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      occurredAt: expect.any(String),
      subtype: 'inside',
      trackerId: 'potty',
    }));
  });

  it.each([
    ['start', undefined],
    ['wake', undefined],
    ['retrospective', 30],
  ] as const)('AC-4 saves distinguishable sleep %s drafts', (action, durationMinutes) => {
    const onSave = jest.fn();
    renderDetails(<QuickLogDetailsScreen initialTrackerId="sleep" onSave={onSave} />);

    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t(`quick-log.details.sleep.action.${action}`),
    }));
    if (action === 'retrospective') {
      fireEvent.changeText(
        screen.getByLabelText(i18n.t('quick-log.details.sleep.duration-label')),
        '30',
      );
    }
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-log.details.save') }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      action,
      ...(durationMinutes === undefined ? {} : { durationMinutes }),
      occurredAt: expect.any(String),
      trackerId: 'sleep',
    }));
  });

  it('AC-2 saves typed training topic and duration', () => {
    const onSave = jest.fn();
    renderDetails(<QuickLogDetailsScreen initialTrackerId="training" onSave={onSave} />);

    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('quick-log.details.training.topic.settling'),
    }));
    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('quick-log.details.training.duration.short'),
    }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-log.details.save') }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      durationBucket: 'short',
      occurredAt: expect.any(String),
      topic: 'settling',
      trackerId: 'training',
    }));
  });

  it('AC-2 validates an empty observation inline without dropping the draft', () => {
    const onSave = jest.fn();
    renderDetails(<QuickLogDetailsScreen initialTrackerId="observation" onSave={onSave} />);

    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-log.details.save') }));

    expect(screen.getByText(i18n.t('quick-log.details.observation.required-error'))).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('AC-QL-DETAIL-PERMISSION disables Save when permission is denied', () => {
    renderDetails(<QuickLogDetailsScreen status="permission-denied" />);

    expect(screen.getByRole('button', {
      name: i18n.t('quick-log.details.save'),
    })).toBeDisabled();
  });

  it('renders the synthetic pending-write state for dev review', () => {
    renderDetails(
      <QuickLogDetailsScreen
        initialTrackerId="feeding"
        status="pending-write"
      />,
    );

    expect(screen.getByText(i18n.t('quick-log.details.states.pending-write.title'))).toBeTruthy();
  });

  it('renders the synthetic error state for dev review', () => {
    renderDetails(
      <QuickLogDetailsScreen
        initialTrackerId="feeding"
        status="error"
      />,
    );

    expect(screen.getByText(i18n.t('quick-log.details.states.error.title'))).toBeTruthy();
  });

  it.each([
    'loading',
    'pending-write',
    'error',
    'offline-read',
    'permission-denied',
  ] as const satisfies readonly QuickLogDetailsReviewState[])(
    'AC-QL-DETAIL-STATES renders the %s state template',
    (state) => {
      renderDetails(<QuickLogDetailsStatePreview state={state} />);

      expect(screen.getByTestId(`quick-log-details-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`quick-log.details.states.${state}.status`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`quick-log.details.states.${state}.title`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`quick-log.details.states.${state}.body`))).toBeTruthy();
    },
  );
});
