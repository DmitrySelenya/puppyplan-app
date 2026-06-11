import { AccessibilityInfo } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { ConnectedMoreScreen, MoreScreen } from '@/features/more/screens/MoreScreen';
import { AuthProvider, type AuthProviderDependencies } from '@/lib/auth';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

const mockUseActiveCareContext = jest.fn();

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => mockUseActiveCareContext(),
}));

const authDependencies: AuthProviderDependencies = {
  appState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
  bootstrap: async () => ({ created: true, household_id: '00000000-0000-4000-8000-000000002301' }),
  getCurrentUser: () => new Promise(() => {}),
  signOut: async () => undefined,
  startAutoRefresh: () => undefined,
  stopAutoRefresh: () => undefined,
  subscribeToAuthChanges: () => () => undefined,
};

describe('More settings entries', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000002301',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000002302',
        selectedTrackerIds: ['feeding_meal'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000002303',
      },
      puppy: null,
      status: 'ready',
    });
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    reduceMotionProbe.mockRestore();
  });

  it('opens profile and quick tracker settings from the More hub', () => {
    const openPuppyProfile = jest.fn();
    const openQuickTrackers = jest.fn();

    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings
            openPuppyProfile={openPuppyProfile}
            openQuickTrackers={openQuickTrackers}
            openTimeline={jest.fn()}
          />
        </AuthProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.puppy-profile'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.quick-trackers'),
    }));

    expect(openPuppyProfile).toHaveBeenCalledTimes(1);
    expect(openQuickTrackers).toHaveBeenCalledTimes(1);
  });

  it('hides owner-only puppy settings rows from non-owners', () => {
    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings={false}
            openPuppyProfile={jest.fn()}
            openQuickTrackers={jest.fn()}
            openTimeline={jest.fn()}
          />
        </AuthProvider>
      </AppProviders>,
    );

    expect(screen.queryByRole('button', {
      name: i18n.t('more.rows.puppy-profile'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('more.rows.quick-trackers'),
    })).toBeNull();
  });

  it('keeps connected More in a loading state instead of treating it as non-owner', () => {
    mockUseActiveCareContext.mockReturnValue({
      careContext: null,
      puppy: null,
      status: 'loading',
    });

    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <ConnectedMoreScreen
            openPuppyProfile={jest.fn()}
            openQuickTrackers={jest.fn()}
            openTimeline={jest.fn()}
          />
        </AuthProvider>
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('common.loading'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('errors.owner-only-settings'))).toBeNull();
  });
});
