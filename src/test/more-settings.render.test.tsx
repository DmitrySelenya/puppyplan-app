import { AccessibilityInfo, ScrollView, StyleSheet } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import type { PuppyProfile } from '@/contracts/supabase';
import { tokens } from '@/design/tokens';
import { HelpSupportScreen } from '@/features/more/screens/HelpSupportScreen';
import { ConnectedMoreScreen, MoreScreen } from '@/features/more/screens/MoreScreen';
import { NotificationPreferencesScreen } from '@/features/more/screens/NotificationPreferencesScreen';
import { PuppyPlanPlusScreen } from '@/features/more/screens/PuppyPlanPlusScreen';
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
            openHelp={jest.fn()}
            openPlus={jest.fn()}
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
    expect(screen.getByRole('button', { name: i18n.t('more.rows.help') })).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.about'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.about.version'))).toBeTruthy();
    expect(screen.queryByText(/beta/i)).toBeNull();
    expect(screen.getByRole('button', { name: i18n.t('more.rows.puppyplan-plus') })).toBeTruthy();
    expect(screen.getByText(i18n.t('more.plus.subtitle'))).toBeTruthy();

    expect(screen.getAllByText(i18n.t('more.rows.deferred')).length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByText(i18n.t('more.rows.deferred')).length).toBe(5);

    const scrollView = result.UNSAFE_getByType(ScrollView);
    const contentStyle = StyleSheet.flatten(scrollView.props.contentContainerStyle);

    expect(contentStyle.paddingBottom).toBeGreaterThanOrEqual(
      tokens.layout.tabBarHeight + tokens.space[6],
    );
  });

  it('opens profile, quick tracker, and notification settings from the More hub', () => {
    const openPuppyProfile = jest.fn();
    const openQuickTrackers = jest.fn();
    const openNotifications = jest.fn();
    const openHelp = jest.fn();
    const openPlus = jest.fn();

    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings
            openHelp={openHelp}
            openNotifications={openNotifications}
            openPlus={openPlus}
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
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.notifications'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.help'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.puppyplan-plus'),
    }));

    expect(openPuppyProfile).toHaveBeenCalledTimes(1);
    expect(openQuickTrackers).toHaveBeenCalledTimes(1);
    expect(openNotifications).toHaveBeenCalledTimes(1);
    expect(openHelp).toHaveBeenCalledTimes(1);
    expect(openPlus).toHaveBeenCalledTimes(1);
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

  it('keeps privacy placeholder aligned with V2 pass-3 copy while notifications has a route', () => {
    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings
            openNotifications={jest.fn()}
            openPuppyProfile={jest.fn()}
            openQuickTrackers={jest.fn()}
            openTimeline={jest.fn()}
            puppy={puppy}
          />
        </AuthProvider>
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('more.notifications.push-hint'))).toBeTruthy();
    expect(i18n.t('more.notifications.push-hint')).toMatch(/^For now,/);
    expect(screen.getByText(i18n.t('more.privacy.section-account-removal'))).toBeTruthy();
    expect(screen.queryByText(/Danger zone/i)).toBeNull();

    expect(screen.getByRole('button', {
      name: i18n.t('more.notifications.screen-title'),
    })).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t('more.privacy.screen-title'),
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

  it('renders the notification preferences V2 anatomy from DESIGN 4.4.4', () => {
    render(
      <AppProviders>
        <NotificationPreferencesScreen />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('more.notifications.screen-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.notifications.section-local'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.notifications.row-all-reminders'))).toBeTruthy();
    expect(screen.getByTestId('notifications-local-all-toggle').props.value).toBe(true);
    expect(screen.getByText(i18n.t('more.notifications.local-hint'))).toBeTruthy();

    expect(screen.getByText(i18n.t('more.notifications.section-push'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.notifications.row-push-reminders'))).toBeTruthy();
    expect(screen.getByTestId('notifications-push-reminders-toggle').props.value).toBe(true);
    expect(screen.getByText(i18n.t('more.notifications.row-push-sitter'))).toBeTruthy();
    expect(screen.getByTestId('notifications-push-sitter-toggle').props.value).toBe(true);
    expect(screen.getByText(i18n.t('more.notifications.push-hint'))).toBeTruthy();

    expect(screen.getByText(i18n.t('more.notifications.section-quiet-hours'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('more.notifications.quiet-hours-example'),
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('more.notifications.section-tz'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('more.notifications.tz-example'),
    })).toBeTruthy();
  });

  it('renders the support help anatomy without requesting private data', () => {
    render(
      <AppProviders>
        <HelpSupportScreen />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('more.help.screen-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.help.intro-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.help.intro-body'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.help.sections.topics'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.help.topic-quick-log') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.help.topic-sharing') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.help.topic-privacy') })).toBeTruthy();
    expect(screen.getByText(i18n.t('more.help.sections.diagnostics'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.help.version-row'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.help.support-code-row'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.help.contact-row') })).toBeTruthy();
    expect(screen.getByText(i18n.t('more.help.privacy-note'))).toBeTruthy();
    expect(screen.queryByText(/support@example/i)).toBeNull();
  });

  it('renders the PuppyPlan Plus shell anatomy without live billing', () => {
    render(
      <AppProviders>
        <PuppyPlanPlusScreen />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('paywall.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.subtitle'))).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.features.0'))).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.features.1'))).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.features.2'))).toBeTruthy();
    expect(screen.getByRole('radio', { name: i18n.t('paywall.plan-yearly-a11y') })).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.plan-yearly'))).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.plan-monthly'))).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.plan-lifetime'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('paywall.primary') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('paywall.secondary') })).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.legal'))).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.soft-lock-note'))).toBeTruthy();
    expect(screen.queryByText(/RevenueCat/i)).toBeNull();
  });
});
