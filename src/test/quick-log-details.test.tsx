import type { ReactElement } from 'react';
import { AccessibilityInfo } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import {
  createQuickLogDetailDraft,
  quickLogDetailDraftSchema,
} from '@/contracts/quick-log';
import {
  QuickLogDetailsScreen,
  QuickLogDetailsStatePreview,
  type QuickLogDetailsReviewState,
} from '@/features/quick-log/screens/QuickLogDetailsScreen';
import { i18n } from '@/lib/i18n';

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
    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('quick-log.details.sleep.duration.30'),
    }));
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
    fireEvent(screen.getByTestId('quick-log-details-occurred-at'), 'onChange', {
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

  it('AC-QL-DETAIL-TIME rejects a future time inline and preserves the note', () => {
    const onSave = jest.fn();
    const future = new Date(Date.now() + 60 * 60 * 1_000);

    renderDetails(<QuickLogDetailsScreen initialTrackerId="observation" onSave={onSave} />);

    const note = screen.getByLabelText('Private note');
    fireEvent.changeText(note, 'Keep this draft');
    fireEvent(screen.getByTestId('quick-log-details-occurred-at'), 'onChange', {
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
      fireEvent.press(screen.getByRole('tab', {
        name: i18n.t('quick-log.details.sleep.duration.30'),
      }));
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
