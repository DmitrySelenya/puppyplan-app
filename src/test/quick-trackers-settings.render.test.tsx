import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import {
  defaultQuickLogTrackerIds,
} from '@/contracts/quick-log';
import { QuickTrackersSettingsScreen } from '@/features/settings/quick-trackers/screens/QuickTrackersSettingsScreen';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

describe('Quick tracker settings screen', () => {
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

  it('enforces the five tracker cap and saves ordered selected ids', () => {
    const saveSelectedTrackerIds = jest.fn();

    render(
      <AppProviders>
        <QuickTrackersSettingsScreen
          saveSelectedTrackerIds={saveSelectedTrackerIds}
          selectedTrackerIds={defaultQuickLogTrackerIds}
        />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.zoomies'),
    }));

    expect(screen.getByText(i18n.t('more.quick-trackers.max-reached-hint'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.sleep'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.zoomies'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('common.save'),
    }));

    expect(saveSelectedTrackerIds).toHaveBeenCalledWith([
      'potty_pee_outside',
      'potty_pee_inside',
      'potty_poop',
      'feeding_meal',
      'zoomies',
    ]);
  });

  it('shows retry copy when selected tracker save fails', async () => {
    const saveSelectedTrackerIds = jest.fn(async () => {
      throw new Error('offline');
    });

    render(
      <AppProviders>
        <QuickTrackersSettingsScreen
          saveSelectedTrackerIds={saveSelectedTrackerIds}
          selectedTrackerIds={defaultQuickLogTrackerIds}
        />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('common.save'),
    }));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('errors.save-failed-connection'))).toBeTruthy();
    });
  });
});
