import { AccessibilityInfo, StyleSheet } from 'react-native';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import {
  defaultQuickLogTrackerIds,
} from '@/contracts/quick-log';
import { tokens } from '@/design/tokens';
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
    cleanup();
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
    expect(
      screen.getByLabelText(i18n.t('more.quick-trackers.max-reached-hint')).props,
    ).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'alert',
    });

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.sleep'),
    }));

    expect(screen.queryByText(i18n.t('more.quick-trackers.max-reached-hint'))).toBeNull();

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
    expect(screen.getByText(i18n.t('more.quick-trackers.hint'))).toBeTruthy();
    expect(i18n.t('more.quick-trackers.hint').toLowerCase()).not.toContain('drag');

    const zoomiesTileStyle = screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.zoomies'),
    }).props.style;

    expect(StyleSheet.flatten(
      typeof zoomiesTileStyle === 'function' ? zoomiesTileStyle({ pressed: false }) : zoomiesTileStyle,
    ).width).toBe(tokens.component.trackerTile.twoCol.width - tokens.space[2]);
  });

  it('keeps at least one tracker selected', () => {
    const saveSelectedTrackerIds = jest.fn();

    render(
      <AppProviders>
        <QuickTrackersSettingsScreen
          saveSelectedTrackerIds={saveSelectedTrackerIds}
          selectedTrackerIds={['feeding_meal']}
        />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('common.save'),
    }));

    expect(screen.getByText(i18n.t('more.quick-trackers.min-required-hint'))).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t('more.quick-trackers.min-required-hint')).props,
    ).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'alert',
    });
    expect(saveSelectedTrackerIds).toHaveBeenCalledWith(['feeding_meal']);
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
    expect(
      screen.getByLabelText(i18n.t('errors.save-failed-connection')).props,
    ).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'alert',
    });
  });

  it('shows owner-only copy when selected tracker save is permission denied', async () => {
    const saveSelectedTrackerIds = jest.fn(async () => {
      throw new Error('puppy_profile_owner_required');
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
      expect(screen.getByText(i18n.t('errors.owner-only-settings'))).toBeTruthy();
    });
    expect(
      screen.getByLabelText(i18n.t('errors.owner-only-settings')).props,
    ).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'alert',
    });
    expect(screen.queryByText(i18n.t('errors.save-failed-connection'))).toBeNull();
  });

  it('does not render the editable tracker form for non-owners', () => {
    render(
      <AppProviders>
        <QuickTrackersSettingsScreen
          canManagePuppySettings={false}
          saveSelectedTrackerIds={jest.fn()}
          selectedTrackerIds={defaultQuickLogTrackerIds}
        />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('errors.owner-only-settings'))).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t('errors.owner-only-settings')).props,
    ).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'alert',
    });
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('common.save'),
    })).toBeNull();
  });
});
