import { AccessibilityInfo, ScrollView, StyleSheet } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import type { PuppyProfile } from '@/contracts/supabase';
import { tokens } from '@/design/tokens';
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

const puppy: PuppyProfile = {
  age_weeks_estimate: 9,
  birth_date: null,
  created_at: '2026-06-09T08:00:00.000Z',
  deleted_at: null,
  household_id: '00000000-0000-4000-8000-000000002301',
  id: '00000000-0000-4000-8000-000000002302',
  name: 'Puppy A',
  quick_tracker_ids: [
    'potty',
    'potty',
    'potty',
    'feeding',
    'sleep',
  ],
  updated_at: '2026-06-09T08:00:00.000Z',
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
        selectedTrackerIds: ['feeding'],
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

  it('renders the atlas full-list structure with locked settings entries and deferred rows', () => {
    const result = render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings
            openPuppyProfile={jest.fn()}
            openQuickTrackers={jest.fn()}
            openTimeline={jest.fn()}
            puppy={puppy}
          />
        </AuthProvider>
      </AppProviders>,
    );

    expect(screen.getByText('Puppy')).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-summary.age-weeks', { count: 9 }))).toBeTruthy();

    expect(screen.getByText(i18n.t('more.sections.puppy'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.rows.puppy-profile') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.rows.quick-trackers') })).toBeTruthy();
    expect(screen.getByText(i18n.t('more.quick-trackers.selected-count', { count: 5, max: 5 }))).toBeTruthy();

    expect(screen.getByText(i18n.t('more.sections.sharing'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.family'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.trainer-sitter'))).toBeTruthy();

    expect(screen.getByText(i18n.t('more.sections.records'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.rows.timeline') })).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.reminders'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.notifications'))).toBeTruthy();

    expect(screen.getByText(i18n.t('more.sections.privacy'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.data-account'))).toBeTruthy();

    expect(screen.getByText(i18n.t('more.sections.support'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.help'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.about'))).toBeTruthy();

    expect(screen.getAllByText(i18n.t('more.rows.deferred')).length).toBeGreaterThanOrEqual(7);

    const scrollView = result.UNSAFE_getByType(ScrollView);
    const contentStyle = StyleSheet.flatten(scrollView.props.contentContainerStyle);

    expect(contentStyle.paddingBottom).toBeGreaterThanOrEqual(
      tokens.layout.tabBarHeight + tokens.space[6],
    );
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

  it('opens profile settings from the puppy summary card', () => {
    const openPuppyProfile = jest.fn();

    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings
            openPuppyProfile={openPuppyProfile}
            openQuickTrackers={jest.fn()}
            openTimeline={jest.fn()}
            puppy={puppy}
          />
        </AuthProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', { name: puppy.name }));

    expect(openPuppyProfile).toHaveBeenCalledTimes(1);
  });

  it('formats puppy summary birth dates for the active locale', async () => {
    await i18n.changeLanguage('en');

    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings
            openPuppyProfile={jest.fn()}
            openQuickTrackers={jest.fn()}
            openTimeline={jest.fn()}
            puppy={{
              ...puppy,
              age_weeks_estimate: null,
              birth_date: '2026-04-03',
            }}
          />
        </AuthProvider>
      </AppProviders>,
    );

    expect(screen.getByText('Apr 3, 2026')).toBeTruthy();
    expect(screen.queryByText('2026-04-03')).toBeNull();
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
