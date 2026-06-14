import { AccessibilityInfo } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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
    cleanup();
    reduceMotionProbe.mockRestore();
  });

  it('renders atlas-style toggle rows with reorder actions and saves implicitly on toggle', () => {
    const saveSelectedTrackerIds = jest.fn();

    render(
      <AppProviders>
        <QuickTrackersSettingsScreen
          onBack={jest.fn()}
          saveSelectedTrackerIds={saveSelectedTrackerIds}
          selectedTrackerIds={defaultQuickLogTrackerIds}
        />
      </AppProviders>,
    );

    expect(screen.getByRole('header', {
      name: i18n.t('more.quick-trackers.screen-title'),
    })).toBeTruthy();
    expect(i18n.t('more.quick-trackers.screen-title')).not.toMatch(/\d|selected/i);
    expect(screen.getByText(i18n.t('more.quick-trackers.hint'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.quick-trackers.selected-count', { count: 5, max: 5 }))).toBeTruthy();
    expect(i18n.t('more.quick-trackers.hint')).not.toMatch(/drag|reorder-ready/i);

    // Real Toggle switches + leading tracker icon and reorder handle
    expect(screen.getByTestId('tracker-toggle-feeding_meal').props.value).toBe(true);
    expect(
      screen.getByTestId('tracker-reorder-handle-feeding_meal', { includeHiddenElements: true }),
    ).toBeTruthy();

    const feedingRow = screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    });
    expect(feedingRow.props.accessibilityState).toMatchObject({ selected: true });
    expect(feedingRow.props.accessibilityActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: i18n.t('more.quick-trackers.move-up'),
          name: 'moveUp',
        }),
        expect.objectContaining({
          label: i18n.t('more.quick-trackers.move-down'),
          name: 'moveDown',
        }),
      ]),
    );
    fireEvent(feedingRow, 'accessibilityAction', {
      nativeEvent: { actionName: 'moveUp' },
    });

    // Reorder persists immediately (implicit save). Feeding (index 3) moves up
    // one slot, swapping with potty_poop (index 2).
    expect(saveSelectedTrackerIds).toHaveBeenLastCalledWith([
      'potty_pee_outside',
      'potty_pee_inside',
      'feeding_meal',
      'potty_poop',
      'sleep_nap',
    ]);

    const zoomiesRow = screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.zoomies'),
    });
    expect(zoomiesRow.props.accessibilityState).toMatchObject({ disabled: true, selected: false });
    expect(screen.getByTestId('tracker-toggle-zoomies').props.value).toBe(false);

    // At cap, guidance is a quiet footer hint, not a raised alert card.
    expect(screen.getByText(i18n.t('more.quick-trackers.max-reached-hint'))).toBeTruthy();
    expect(
      screen.queryByLabelText(i18n.t('more.quick-trackers.max-reached-hint')),
    ).toBeNull();

    // Turning one off persists and frees up a slot.
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.sleep'),
    }));

    expect(saveSelectedTrackerIds).toHaveBeenLastCalledWith([
      'potty_pee_outside',
      'potty_pee_inside',
      'feeding_meal',
      'potty_poop',
    ]);
    expect(screen.queryByText(i18n.t('more.quick-trackers.max-reached-hint'))).toBeNull();
    expect(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.zoomies'),
    }).props.accessibilityState).toMatchObject({ disabled: false, selected: false });

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.zoomies'),
    }));

    expect(saveSelectedTrackerIds).toHaveBeenLastCalledWith([
      'potty_pee_outside',
      'potty_pee_inside',
      'feeding_meal',
      'potty_poop',
      'zoomies',
    ]);

    // No bottom Save CTA in the atlas implicit-save model.
    expect(screen.queryByRole('button', { name: i18n.t('common.save') })).toBeNull();
  });

  it('keeps at least one tracker selected and does not persist the rejected toggle', () => {
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

    expect(screen.getByText(i18n.t('more.quick-trackers.min-required-hint'))).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t('more.quick-trackers.min-required-hint')).props,
    ).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'alert',
    });
    expect(saveSelectedTrackerIds).not.toHaveBeenCalled();
    expect(screen.getByTestId('tracker-toggle-feeding_meal').props.value).toBe(true);
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
      name: i18n.t('quick-log.trackers.sleep'),
    }));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('errors.save-failed-connection'))).toBeTruthy();
    });
    expect(screen.getByTestId('tracker-toggle-sleep_nap').props.value).toBe(true);
    expect(screen.getByText(i18n.t('more.quick-trackers.selected-count', {
      count: 5,
      max: 5,
    }))).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t('errors.save-failed-connection')).props,
    ).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'alert',
    });
  });

  it('serializes implicit saves so stale requests cannot persist out of order', async () => {
    const firstSave = createDeferred<void>();
    const secondSave = createDeferred<void>();
    const saveSelectedTrackerIds = jest
      .fn()
      .mockReturnValueOnce(firstSave.promise)
      .mockReturnValueOnce(secondSave.promise);

    render(
      <AppProviders>
        <QuickTrackersSettingsScreen
          saveSelectedTrackerIds={saveSelectedTrackerIds}
          selectedTrackerIds={defaultQuickLogTrackerIds}
        />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.sleep'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.zoomies'),
    }));

    expect(saveSelectedTrackerIds).toHaveBeenCalledTimes(1);
    expect(saveSelectedTrackerIds).toHaveBeenLastCalledWith([
      'potty_pee_outside',
      'potty_pee_inside',
      'potty_poop',
      'feeding_meal',
    ]);
    expect(screen.getByTestId('tracker-toggle-sleep_nap').props.value).toBe(false);
    expect(screen.getByTestId('tracker-toggle-zoomies').props.value).toBe(true);

    await act(async () => {
      firstSave.resolve();
      await firstSave.promise;
    });

    await waitFor(() => {
      expect(saveSelectedTrackerIds).toHaveBeenCalledTimes(2);
    });
    expect(saveSelectedTrackerIds).toHaveBeenLastCalledWith([
      'potty_pee_outside',
      'potty_pee_inside',
      'potty_poop',
      'feeding_meal',
      'zoomies',
    ]);

    await act(async () => {
      secondSave.resolve();
      await secondSave.promise;
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
      name: i18n.t('quick-log.trackers.sleep'),
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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}
