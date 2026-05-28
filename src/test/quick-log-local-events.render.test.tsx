import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuickLogLocalEvents } from '@/features/quick-log/components/QuickLogLocalEvents';
import { i18n } from '@/lib/i18n';

const clientEventId = 'evt_00000000-0000-4000-8000-000000000601';

describe('QuickLogLocalEvents', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('renders pending and failed local rows with retry/delete controls', () => {
    const onDelete = jest.fn();
    const onRetry = jest.fn();
    const onUndo = jest.fn();

    render(
      <QuickLogLocalEvents
        events={[
          {
            clientEventId: 'evt_00000000-0000-4000-8000-000000000602',
            eventType: 'sleep',
            householdId: '00000000-0000-4000-8000-000000000701',
            puppyId: '00000000-0000-4000-8000-000000000702',
            state: 'pending_local',
            todayDate: '2026-05-27',
            trackerName: i18n.t('quick-log.trackers.sleep'),
          },
          {
            clientEventId,
            eventType: 'feeding',
            householdId: '00000000-0000-4000-8000-000000000701',
            puppyId: '00000000-0000-4000-8000-000000000702',
            state: 'failed_retryable',
            todayDate: '2026-05-27',
            trackerName: i18n.t('quick-log.trackers.feeding'),
          },
        ]}
        onDelete={onDelete}
        onRetry={onRetry}
        onUndo={onUndo}
      />,
    );

    expect(screen.getByText(i18n.t('quick-log.pending.label'))).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.failed.pill'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.snackbar.undo'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    }));
    const deleteButtons = screen.getAllByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    });

    expect(deleteButtons).toHaveLength(2);
    fireEvent.press(deleteButtons[0]);
    fireEvent.press(deleteButtons[1]);

    expect(onUndo).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000000602',
      eventType: 'sleep',
      householdId: '00000000-0000-4000-8000-000000000701',
      puppyId: '00000000-0000-4000-8000-000000000702',
      todayDate: '2026-05-27',
    });
    expect(onRetry).toHaveBeenCalledWith(clientEventId);
    expect(onDelete).toHaveBeenCalledWith('evt_00000000-0000-4000-8000-000000000602');
    expect(onDelete).toHaveBeenCalledWith(clientEventId);
  });
});
