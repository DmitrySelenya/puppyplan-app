import { AccessibilityInfo, Linking, ScrollView, Share, StyleSheet } from 'react-native';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { PuppyProfile } from '@/contracts/supabase';
import { tokens } from '@/design/tokens';
import { HelpSupportScreen } from '@/features/more/screens/HelpSupportScreen';
import { HouseholdAccessScreen } from '@/features/more/screens/HouseholdAccessScreen';
import { ConnectedMoreScreen, MoreScreen } from '@/features/more/screens/MoreScreen';
import {
  createLocalReminderPreferenceController,
  type LocalReminderPreferenceController,
  type LocalReminderPreferenceStore,
} from '@/lib/notifications/localReminderPreference';
import {
  ConnectedNotificationPreferencesScreen,
  NotificationPreferencesScreen,
} from '@/features/more/screens/NotificationPreferencesScreen';
import {
  PrivacyAccountScreen,
  PrivacyAccountStatePreview,
} from '@/features/more/screens/PrivacyAccountScreen';
import { PuppyPlanPlusScreen } from '@/features/more/screens/PuppyPlanPlusScreen';
import {
  ShareablePuppyCardScreen,
  ShareablePuppyCardStatePreview,
} from '@/features/more/screens/ShareablePuppyCardScreen';
import {
  SitterModeScreen,
  SitterModeStatePreview,
} from '@/features/more/screens/SitterModeScreen';
import { AuthProvider, type AuthProviderDependencies } from '@/lib/auth';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import MoreRoute from '../../app/(tabs)/more';
import ShareablePuppyCardRoute from '../../app/(modals)/sharing/puppy-card';

const mockUseActiveCareContext = jest.fn();
const mockUseCreateHouseholdInviteMutation = jest.fn();
const mockUseHouseholdInvitesQuery = jest.fn();
const mockUseNotificationPreferenceQuery = jest.fn();
const mockUseUpdateNotificationPreferenceMutation = jest.fn();
const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
const mockSignOut = jest.fn<Promise<void>, []>();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
    push: (href: string) => mockRouterPush(href),
  },
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => mockUseActiveCareContext(),
}));

jest.mock('@/lib/query/household-access', () => {
  const actual = jest.requireActual('@/lib/query/household-access');

  return {
    ...actual,
    useCreateHouseholdInviteMutation: () => mockUseCreateHouseholdInviteMutation(),
    useHouseholdInvitesQuery: (householdId: string | undefined) =>
      mockUseHouseholdInvitesQuery(householdId),
  };
});

jest.mock('@/lib/query/notification-preferences', () => {
  const actual = jest.requireActual('@/lib/query/notification-preferences');

  return {
    ...actual,
    useNotificationPreferenceQuery: () => mockUseNotificationPreferenceQuery(),
    useUpdateNotificationPreferenceMutation: () => mockUseUpdateNotificationPreferenceMutation(),
  };
});

const authDependencies: AuthProviderDependencies = {
  appState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
  bootstrap: async () => ({ created: true, household_id: '00000000-0000-4000-8000-000000002301' }),
  getCurrentUser: () => new Promise(() => {}),
  signOut: () => mockSignOut(),
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
  let canOpenUrlSpy: jest.SpyInstance<Promise<boolean>, [string]>;
  let openSettingsSpy: jest.SpyInstance<Promise<void>, []>;
  let openUrlSpy: jest.SpyInstance<Promise<void>, [string]>;
  let shareSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterBack.mockClear();
    mockRouterPush.mockClear();
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined);
    mockUseHouseholdInvitesQuery.mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
    });
    mockUseCreateHouseholdInviteMutation.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    });
    openSettingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    canOpenUrlSpy = jest
      .spyOn(Linking, 'canOpenURL')
      .mockResolvedValue(true);
    openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction });
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
    mockUseNotificationPreferenceQuery.mockReturnValue({
      data: null,
      isError: false,
      isLoading: false,
    });
    mockUseUpdateNotificationPreferenceMutation.mockReturnValue({
      isError: false,
      isPending: false,
      mutateAsync: jest.fn().mockResolvedValue(undefined),
    });
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    canOpenUrlSpy.mockRestore();
    openSettingsSpy.mockRestore();
    openUrlSpy.mockRestore();
    reduceMotionProbe.mockRestore();
    shareSpy.mockRestore();
  });

  it('renders the atlas full-list structure without exposing internal deferred labels', () => {
    const result = render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings
            openHousehold={jest.fn()}
            openPetSettings={jest.fn()}
            openHelp={jest.fn()}
            openPlus={jest.fn()}
            openPrivacy={jest.fn()}
            openReminders={jest.fn()}
            openSitterMode={jest.fn()}
            puppy={puppy}
          />
        </AuthProvider>
      </AppProviders>,
    );

    expect(screen.getByText('Puppy')).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-summary.age-weeks', { count: 9 }))).toBeTruthy();

    expect(screen.getByText(i18n.t('more.sections.puppy'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.rows.pet-settings') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: i18n.t('more.rows.puppy-profile') })).toBeNull();
    expect(screen.queryByRole('button', { name: i18n.t('more.rows.quick-trackers') })).toBeNull();
    expect(screen.queryByText(i18n.t('more.quick-trackers.selected-count', { count: 5, max: 5 }))).toBeNull();

    expect(screen.getByText(i18n.t('more.sections.sharing'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.rows.family') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.rows.trainer-sitter') })).toBeTruthy();

    expect(screen.getByText(i18n.t('more.sections.records'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: i18n.t('more.rows.timeline') })).toBeNull();
    expect(screen.getByRole('button', { name: i18n.t('more.rows.reminders') })).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.notifications'))).toBeTruthy();

    expect(screen.getByText(i18n.t('more.sections.privacy'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.rows.data-account') })).toBeTruthy();

    expect(screen.getByText(i18n.t('more.sections.support'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.rows.help') })).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.about'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.about.version'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('more.rows.deferred'))).toBeNull();
    expect(screen.queryByText(/beta/i)).toBeNull();
    expect(screen.getByRole('button', { name: i18n.t('more.rows.puppyplan-plus') })).toBeTruthy();
    expect(screen.getByText(i18n.t('more.plus.subtitle'))).toBeTruthy();

    const scrollView = result.UNSAFE_getByType(ScrollView);
    const contentStyle = StyleSheet.flatten(scrollView.props.contentContainerStyle);

    expect(contentStyle.paddingBottom).toBeGreaterThanOrEqual(
      tokens.layout.tabBarHeight + tokens.space[6],
    );
  });

  it('opens Pet settings, household, sitter mode, reminders, notification, help, and Plus settings from the More hub', () => {
    const openHousehold = jest.fn();
    const openPetSettings = jest.fn();
    const openSitterMode = jest.fn();
    const openShareableCards = jest.fn();
    const openReminders = jest.fn();
    const openNotifications = jest.fn();
    const openPrivacy = jest.fn();
    const openHelp = jest.fn();
    const openPlus = jest.fn();

    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings
            openHousehold={openHousehold}
            openHelp={openHelp}
            openNotifications={openNotifications}
            openPetSettings={openPetSettings}
            openPlus={openPlus}
            openPrivacy={openPrivacy}
            openReminders={openReminders}
            openShareableCards={openShareableCards}
            openSitterMode={openSitterMode}
          />
        </AuthProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.pet-settings'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.family'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.trainer-sitter'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.shareable-cards'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.reminders'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.notifications'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.data-account'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.help'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.puppyplan-plus'),
    }));

    expect(openPetSettings).toHaveBeenCalledTimes(1);
    expect(openHousehold).toHaveBeenCalledTimes(1);
    expect(openSitterMode).toHaveBeenCalledTimes(1);
    expect(openShareableCards).toHaveBeenCalledTimes(1);
    expect(openReminders).toHaveBeenCalledTimes(1);
    expect(openNotifications).toHaveBeenCalledTimes(1);
    expect(openPrivacy).toHaveBeenCalledTimes(1);
    expect(openHelp).toHaveBeenCalledTimes(1);
    expect(openPlus).toHaveBeenCalledTimes(1);
  });

  it('AC-REM-HUB-1 opens the Reminders hub route from the production More tab', () => {
    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreRoute />
        </AuthProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.reminders'),
    }));

    expect(mockRouterPush).toHaveBeenCalledWith('/reminders');
  });

  it('opens Pet settings from the puppy summary card', () => {
    const openPetSettings = jest.fn();

    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings
            openPetSettings={openPetSettings}
            puppy={puppy}
          />
        </AuthProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', { name: puppy.name }));

    expect(openPetSettings).toHaveBeenCalledTimes(1);
  });

  it('formats puppy summary birth dates for the active locale', async () => {
    await i18n.changeLanguage('en');

    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings
            openPetSettings={jest.fn()}
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
            openPetSettings={jest.fn()}
          />
        </AuthProvider>
      </AppProviders>,
    );

    expect(screen.queryByRole('button', {
      name: i18n.t('more.rows.pet-settings'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('more.rows.puppy-profile'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('more.rows.quick-trackers'),
    })).toBeNull();
  });

  it('keeps privacy row active with V2 pass-3 copy while notifications has a route', () => {
    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreScreen
            canManagePuppySettings
            openNotifications={jest.fn()}
            openPetSettings={jest.fn()}
            openPrivacy={jest.fn()}
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
    expect(screen.getByRole('button', {
      name: i18n.t('more.privacy.screen-title'),
    })).toBeTruthy();
  });

  it('AC-MORE-PRIVACY-1 opens the Privacy Account route from the production More tab', () => {
    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <MoreRoute />
        </AuthProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.rows.data-account'),
    }));

    expect(mockRouterPush).toHaveBeenCalledWith('/settings/privacy-account');
  });

  it('AC-MORE-PRIVACY-2 AC-MORE-PRIVACY-3 AC-MORE-PRIVACY-4 AC-MORE-PRIVACY-5 renders the Privacy Account route shell locally', () => {
    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <PrivacyAccountScreen />
        </AuthProvider>
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('more.privacy.screen-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.section-consents'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.row-analytics'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.analytics-hint'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.section-errors'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.row-error-reports'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.errors-hint'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.section-your-data'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.section-account'))).toBeTruthy();

    expect(screen.getByTestId('privacy-analytics-toggle').props.value).toBe(true);
    fireEvent(screen.getByTestId('privacy-analytics-toggle'), 'valueChange', false);
    expect(screen.getByTestId('privacy-analytics-toggle').props.value).toBe(false);
    expect(screen.getByTestId('privacy-error-reports-toggle').props.value).toBe(true);
    fireEvent(screen.getByTestId('privacy-error-reports-toggle'), 'valueChange', false);
    expect(screen.getByTestId('privacy-error-reports-toggle').props.value).toBe(false);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.privacy.row-export'),
    }));
    expect(screen.getByTestId('privacy-export-notice')).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.export-sheet'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('more.privacy.row-delete'),
    }));
    expect(screen.getByTestId('privacy-delete-confirm')).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.delete-sheet.body'))).toBeTruthy();
    expect(screen.getByTestId('privacy-delete-confirm-action').props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(
      screen.getByTestId('privacy-delete-confirm-input'),
      i18n.t('more.privacy.delete-sheet.confirm-input-word'),
    );
    expect(screen.getByTestId('privacy-delete-confirm-action').props.accessibilityState.disabled).toBe(false);
    fireEvent.press(screen.getByTestId('privacy-delete-confirm-action'));

    expect(screen.queryByTestId('privacy-delete-confirm')).toBeNull();
    expect(screen.getByTestId('privacy-delete-requested')).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.delete-toast'))).toBeTruthy();
  });

  it('AC-MORE-PRIVACY-SIGNOUT-1 AC-MORE-PRIVACY-SIGNOUT-2 exposes the real auth sign-out action on Privacy Account', async () => {
    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <PrivacyAccountScreen />
        </AuthProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('auth.sign-out.cta'),
    }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('AC-MORE-PRIVACY-STATES renders deterministic privacy account state templates', () => {
    render(
      <AppProviders>
        <PrivacyAccountStatePreview state="loading" />
        <PrivacyAccountStatePreview state="pending-write" />
        <PrivacyAccountStatePreview state="error" />
        <PrivacyAccountStatePreview state="offline-read" />
        <PrivacyAccountStatePreview state="permission-denied" />
      </AppProviders>,
    );

    for (const state of [
      'loading',
      'pending-write',
      'error',
      'offline-read',
      'permission-denied',
    ] as const) {
      expect(screen.getByTestId(`privacy-account-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`more.privacy.states.${state}.title`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`more.privacy.states.${state}.body`))).toBeTruthy();
    }

    expect(screen.getByTestId('privacy-account-state-error').props.accessibilityRole).toBe('alert');
    expect(screen.getByTestId('privacy-account-state-permission-denied').props.accessibilityRole)
      .toBe('alert');
    expect(screen.getByTestId('privacy-account-state-loading').props.accessibilityLiveRegion)
      .toBe('polite');
    expect(screen.getByTestId('privacy-account-state-pending-write').props.accessibilityLiveRegion)
      .toBe('polite');
    expect(screen.queryByText(/@|token|provider|puppy a|notes|diagnostic payload/i)).toBeNull();
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
            openPetSettings={jest.fn()}
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

  it('AC-MORE-NOTIF-STATES renders deterministic loading, pending, error, and offline states', () => {
    render(
      <AppProviders>
        <NotificationPreferencesScreen reviewState="loading" />
        <NotificationPreferencesScreen reviewState="pending-write" />
        <NotificationPreferencesScreen reviewState="error" />
        <NotificationPreferencesScreen reviewState="offline-read" />
      </AppProviders>,
    );

    for (const state of [
      'loading',
      'pending-write',
      'error',
      'offline-read',
    ] as const) {
      expect(screen.getByTestId(`notifications-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`more.notifications.states.${state}.title`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`more.notifications.states.${state}.body`))).toBeTruthy();
    }

    expect(screen.getByTestId('notifications-state-error').props.accessibilityRole).toBe('alert');
    expect(screen.getByTestId('notifications-state-pending-write').props.accessibilityLiveRegion)
      .toBe('polite');
    expect(screen.queryByText(/apns|fcm|device token|raw token/i)).toBeNull();
  });

  it('opens OS settings when a push notification toggle changes without mutating local reminders', async () => {
    render(
      <AppProviders>
        <NotificationPreferencesScreen />
      </AppProviders>,
    );

    fireEvent(screen.getByTestId('notifications-push-reminders-toggle'), 'valueChange', false);

    await waitFor(() => {
      expect(openSettingsSpy).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('notifications-local-all-toggle').props.value).toBe(true);
  });

  it('AC-NOTIF-LOCAL keeps the local reminders toggle stateful without OS handoff', () => {
    const changeReminderPush = jest.fn();
    const changeSitterPush = jest.fn();

    render(
      <AppProviders>
        <NotificationPreferencesScreen
          onChangeReminderPush={changeReminderPush}
          onChangeSitterPush={changeSitterPush}
        />
      </AppProviders>,
    );

    expect(screen.getByTestId('notifications-local-all-toggle').props.value).toBe(true);

    fireEvent(screen.getByTestId('notifications-local-all-toggle'), 'valueChange', false);

    expect(screen.getByTestId('notifications-local-all-toggle').props.value).toBe(false);
    expect(openSettingsSpy).not.toHaveBeenCalled();
    expect(changeReminderPush).not.toHaveBeenCalled();
    expect(changeSitterPush).not.toHaveBeenCalled();
  });

  it('AC-NOTIF-LOCAL-PERSIST-4 writes local reminders without OS handoff or push mutation', async () => {
    const changeLocalReminders = jest.fn().mockResolvedValue(undefined);
    const changeReminderPush = jest.fn().mockResolvedValue(undefined);

    render(
      <AppProviders>
        <NotificationPreferencesScreen
          localRemindersEnabled={false}
          onChangeLocalReminders={changeLocalReminders}
          onChangeReminderPush={changeReminderPush}
        />
      </AppProviders>,
    );

    expect(screen.getByTestId('notifications-local-all-toggle').props.value).toBe(false);

    fireEvent(screen.getByTestId('notifications-local-all-toggle'), 'valueChange', true);

    await waitFor(() => {
      expect(changeLocalReminders).toHaveBeenCalledWith(true);
    });
    expect(screen.getByTestId('notifications-local-all-toggle').props.value).toBe(true);
    expect(openSettingsSpy).not.toHaveBeenCalled();
    expect(changeReminderPush).not.toHaveBeenCalled();
  });

  it('AC-NOTIF-LOCAL-PERSIST-2 reads and writes local reminders across connected remounts', async () => {
    const values = new Map<string, string>([
      ['puppyplan:notifications:local-reminders-enabled:v1', 'false'],
    ]);
    const store: LocalReminderPreferenceStore = {
      getItem: jest.fn(async (key) => values.get(key) ?? null),
      setItem: jest.fn(async (key, value) => {
        values.set(key, value);
      }),
    };
    const localReminderPreference = createLocalReminderPreferenceController({ store });
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseUpdateNotificationPreferenceMutation.mockReturnValue({
      isError: false,
      isPending: false,
      mutateAsync,
    });

    const renderResult = render(
      <AppProviders>
        <ConnectedNotificationPreferencesScreen
          localReminderPreference={localReminderPreference}
        />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('notifications-local-all-toggle').props.value).toBe(false);
    });

    fireEvent(screen.getByTestId('notifications-local-all-toggle'), 'valueChange', true);

    await waitFor(() => {
      expect(store.setItem).toHaveBeenCalledWith(
        'puppyplan:notifications:local-reminders-enabled:v1',
        'true',
      );
    });
    expect(openSettingsSpy).not.toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByTestId('notifications-local-all-toggle').props.value).toBe(true);
    });

    renderResult.rerender(
      <AppProviders>
        <ConnectedNotificationPreferencesScreen
          key="remounted"
          localReminderPreference={localReminderPreference}
        />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('notifications-local-all-toggle').props.value).toBe(true);
    });
  });

  it('AC-NOTIF-LOCAL-PERSIST-3 renders notification error state when local preference read fails', async () => {
    const localReminderPreference: LocalReminderPreferenceController = {
      read: jest.fn(async () => {
        throw new Error('secure store unavailable');
      }),
      write: jest.fn(async () => undefined),
    };

    render(
      <AppProviders>
        <ConnectedNotificationPreferencesScreen
          localReminderPreference={localReminderPreference}
        />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('notifications-state-error')).toBeTruthy();
    });
  });

  it('AC-MORE-HELP-STATES renders deterministic loading, pending, error, and offline states', () => {
    render(
      <AppProviders>
        <HelpSupportScreen {...{ reviewState: 'loading' as const }} />
        <HelpSupportScreen {...{ reviewState: 'pending-write' as const }} />
        <HelpSupportScreen {...{ reviewState: 'error' as const }} />
        <HelpSupportScreen {...{ reviewState: 'offline-read' as const }} />
      </AppProviders>,
    );

    for (const state of [
      'loading',
      'pending-write',
      'error',
      'offline-read',
    ] as const) {
      expect(screen.getByTestId(`more-help-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`more.help.states.${state}.title`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`more.help.states.${state}.body`))).toBeTruthy();
    }

    expect(screen.getByTestId('more-help-state-error').props.accessibilityRole).toBe('alert');
    expect(screen.getByTestId('more-help-state-pending-write').props.accessibilityLiveRegion)
      .toBe('polite');

    for (const state of [
      'loading',
      'pending-write',
      'error',
      'offline-read',
    ] as const) {
      expect(i18n.t(`more.help.states.${state}.title`)).not.toMatch(
        /support@|diagnostic payload|token|provider|puppy a/i,
      );
      expect(i18n.t(`more.help.states.${state}.body`)).not.toMatch(
        /support@|diagnostic payload|token|provider|puppy a/i,
      );
    }
  });

  it('AC-NOTIF-PERSIST-4 renders persisted push toggles and writes changes before OS handoff', async () => {
    const changeReminderPush = jest.fn().mockResolvedValue(undefined);
    const changeSitterPush = jest.fn().mockResolvedValue(undefined);

    render(
      <AppProviders>
        <NotificationPreferencesScreen
          onChangeReminderPush={changeReminderPush}
          onChangeSitterPush={changeSitterPush}
          preferences={{
            reminderPushEnabled: false,
            row: null,
            timezone: 'UTC',
            trustedSitterCompletionPushEnabled: true,
          }}
        />
      </AppProviders>,
    );

    expect(screen.getByTestId('notifications-push-reminders-toggle').props.value).toBe(false);
    expect(screen.getByTestId('notifications-push-sitter-toggle').props.value).toBe(true);

    fireEvent(screen.getByTestId('notifications-push-reminders-toggle'), 'valueChange', true);
    fireEvent(screen.getByTestId('notifications-push-sitter-toggle'), 'valueChange', false);

    await waitFor(() => {
      expect(changeReminderPush).toHaveBeenCalledWith(true);
      expect(changeSitterPush).toHaveBeenCalledWith(false);
      expect(openSettingsSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('AC-NOTIF-PERSIST-4 connects notification preferences query and mutation state', async () => {
    const mutateAsync = jest.fn().mockResolvedValue(undefined);
    mockUseNotificationPreferenceQuery.mockReturnValue({
      data: {
        created_at: '2026-07-02T10:00:00.000Z',
        household_id: '00000000-0000-4000-8000-000000002301',
        id: '00000000-0000-4000-8000-000000002304',
        quiet_hours: null,
        reminder_push_enabled: false,
        timezone: 'Europe/Warsaw',
        trusted_sitter_completion_push_enabled: true,
        updated_at: '2026-07-02T10:05:00.000Z',
        user_id: '00000000-0000-4000-8000-000000002303',
      },
      isError: false,
      isLoading: false,
    });
    mockUseUpdateNotificationPreferenceMutation.mockReturnValue({
      isError: false,
      isPending: true,
      mutateAsync,
    });

    render(
      <AppProviders>
        <ConnectedNotificationPreferencesScreen />
      </AppProviders>,
    );

    expect(screen.getByTestId('notifications-state-pending-write')).toBeTruthy();
    expect(screen.getByTestId('notifications-push-reminders-toggle').props.value).toBe(false);
    expect(screen.getByTestId('notifications-push-sitter-toggle').props.value).toBe(true);

    fireEvent(screen.getByTestId('notifications-push-reminders-toggle'), 'valueChange', true);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        householdId: '00000000-0000-4000-8000-000000002301',
        reminderPushEnabled: true,
        timezone: 'Europe/Warsaw',
        trustedSitterCompletionPushEnabled: true,
        userId: '00000000-0000-4000-8000-000000002303',
      });
      expect(openSettingsSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('renders notification preferences error state when OS settings handoff fails', async () => {
    openSettingsSpy.mockRejectedValueOnce(new Error('settings unavailable'));
    render(
      <AppProviders>
        <NotificationPreferencesScreen />
      </AppProviders>,
    );

    fireEvent(screen.getByTestId('notifications-push-sitter-toggle'), 'valueChange', false);

    await waitFor(() => {
      expect(screen.getByTestId('notifications-state-error')).toBeTruthy();
    });
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

  it('opens a privacy-safe support email draft from the Help screen', async () => {
    render(
      <AppProviders>
        <HelpSupportScreen />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', { name: i18n.t('more.help.contact-row') }));

    await waitFor(() => {
      expect(canOpenUrlSpy).toHaveBeenCalledTimes(1);
      expect(openUrlSpy).toHaveBeenCalledTimes(1);
    });
    const [supportUrl] = openUrlSpy.mock.calls[0];
    expect(canOpenUrlSpy).toHaveBeenCalledWith(supportUrl);
    expect(supportUrl.startsWith(`mailto:${i18n.t('more.help.support-email')}?`)).toBe(true);
    expect(decodeURIComponent(supportUrl)).toContain('PuppyPlan support request');
    expect(decodeURIComponent(supportUrl)).toContain(i18n.t('more.help.privacy-note'));
    expect(decodeURIComponent(supportUrl)).not.toMatch(/Puppy A|Caregiver|token=/i);
  });

  it('renders a visible Help support error without opening mail when no composer is available', async () => {
    canOpenUrlSpy.mockResolvedValueOnce(false);
    render(
      <AppProviders>
        <HelpSupportScreen />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', { name: i18n.t('more.help.contact-row') }));

    await waitFor(() => {
      expect(screen.getByTestId('more-help-support-error')).toBeTruthy();
    });
    expect(openUrlSpy).not.toHaveBeenCalled();
  });

  it('renders a visible Help support error when the mail composer availability probe fails', async () => {
    canOpenUrlSpy.mockRejectedValueOnce(new Error('composer probe failed'));
    render(
      <AppProviders>
        <HelpSupportScreen />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', { name: i18n.t('more.help.contact-row') }));

    await waitFor(() => {
      expect(screen.getByTestId('more-help-support-error')).toBeTruthy();
    });
    expect(openUrlSpy).not.toHaveBeenCalled();
  });

  it('renders a visible Help support error when the email handoff fails', async () => {
    openUrlSpy.mockRejectedValueOnce(new Error('email unavailable'));
    render(
      <AppProviders>
        <HelpSupportScreen />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', { name: i18n.t('more.help.contact-row') }));

    await waitFor(() => {
      expect(screen.getByTestId('more-help-support-error')).toBeTruthy();
    });
  });

  it('renders the Manage household shell anatomy without fabricated member or invite data', () => {
    render(
      <AppProviders>
        <HouseholdAccessScreen />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('sharing.family.manage.screen-title'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('sharing.family.today-prompt.title')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(i18n.t('sharing.family.manage.section-members'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.manage.member-you'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('sharing.family.manage.badge-owner')).length).toBeGreaterThanOrEqual(1);

    // No fabricated roster: no phantom caregiver activity, no static pending invite.
    expect(screen.queryByText(i18n.t('sharing.family.manage.active-ago', {
      timeAgo: '8 min ago',
    }))).toBeNull();
    expect(screen.queryByText(i18n.t('sharing.family.manage.pending-until', {
      date: '24 May',
    }))).toBeNull();
    expect(screen.queryByText(i18n.t('sharing.family.manage.badge-pending'))).toBeNull();

    expect(screen.getByText(i18n.t('sharing.family.manage.section-invites'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.manage.invites-empty'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('sharing.family.today-prompt.body')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: i18n.t('sharing.family.manage.invite-cta') })).toBeTruthy();
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it('AC-SHARE-HOUSEHOLD-INVITES-3 renders live pending invite rows without raw invite data', () => {
    mockUseHouseholdInvitesQuery.mockReturnValue({
      data: [{
        accepted_at: null,
        accepted_by: null,
        created_at: '2026-07-03T10:00:00.000Z',
        created_by: '00000000-0000-4000-8000-000000006302',
        email_hash: 'sha256:recipient-hash',
        expires_at: '2026-07-12T23:59:59.000Z',
        household_id: '00000000-0000-4000-8000-000000002301',
        id: '00000000-0000-4000-8000-000000006303',
        revoked_at: null,
        revoked_by: null,
        role: 'caregiver',
        token_last4: 'A1b2',
        updated_at: '2026-07-03T10:05:00.000Z',
      }],
      isError: false,
      isLoading: false,
    });

    render(
      <AppProviders>
        <HouseholdAccessScreen />
      </AppProviders>,
    );

    expect(mockUseHouseholdInvitesQuery)
      .toHaveBeenCalledWith('00000000-0000-4000-8000-000000002301');
    expect(screen.getByText(i18n.t('sharing.family.manage.pending-until', {
      date: '12 Jul',
    }))).toBeTruthy();
    expect(screen.queryByText(i18n.t('sharing.family.manage.pending-until', {
      date: '24 May',
    }))).toBeNull();
    expect(screen.queryByText(/A1b2|recipient-hash|@|token/i)).toBeNull();
  });

  it('PUP-42 creates a transient caregiver invite link and copies the exact deep link', async () => {
    const token = 'ab'.repeat(32);
    const inviteLink = `puppyplan://invite/${token}`;
    const mutateAsync = jest.fn().mockResolvedValue({
      expires_at: '2026-07-31T12:00:00.000Z',
      token,
    });
    const copyInviteLink = jest.fn().mockResolvedValue(undefined);
    mockUseCreateHouseholdInviteMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <AppProviders>
        <HouseholdAccessScreen copyInviteLink={copyInviteLink} />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.manage.invite-cta'),
    }));

    await waitFor(() => {
      expect(screen.getByTestId('household-invite-link-card')).toBeTruthy();
    });
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByText(inviteLink)).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.manage.invite-link.last4', {
      last4: 'abab',
    }))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.manage.invite-link.copy'),
    }));

    await waitFor(() => {
      expect(copyInviteLink).toHaveBeenCalledWith(inviteLink);
      expect(screen.getByTestId('household-invite-copy-success')).toBeTruthy();
    });
  });

  it('PUP-42 surfaces invite creation failures without exposing internal error details', async () => {
    const createFailure = new Error('synthetic create failure');
    const mutateAsync = jest.fn().mockRejectedValue(createFailure);
    mockUseCreateHouseholdInviteMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <AppProviders>
        <HouseholdAccessScreen copyInviteLink={jest.fn()} />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.manage.invite-cta'),
    }));

    await waitFor(() => {
      expect(screen.getByTestId('household-invite-create-error')).toBeTruthy();
    });
    expect(screen.queryByText(createFailure.message)).toBeNull();
  });

  it('PUP-42 surfaces clipboard failures without exposing internal error details', async () => {
    const token = 'cd'.repeat(32);
    const copyInviteLink = jest.fn().mockRejectedValue(new Error('synthetic clipboard failure'));
    mockUseCreateHouseholdInviteMutation.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn().mockResolvedValue({
        expires_at: '2026-07-31T12:00:00.000Z',
        token,
      }),
    });

    render(
      <AppProviders>
        <HouseholdAccessScreen copyInviteLink={copyInviteLink} />
      </AppProviders>,
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.manage.invite-cta'),
    }));
    await waitFor(() => {
      expect(screen.getByTestId('household-invite-link-card')).toBeTruthy();
    });
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.manage.invite-link.copy'),
    }));

    await waitFor(() => {
      expect(screen.getByTestId('household-invite-copy-error')).toBeTruthy();
    });
    expect(screen.queryByText(/synthetic clipboard failure/i)).toBeNull();
  });

  it('PUP-42 disables invite creation for non-owner household members', () => {
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000002301',
        householdRole: 'caregiver',
        puppyId: '00000000-0000-4000-8000-000000002302',
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000002303',
      },
      puppy: null,
      status: 'ready',
    });

    render(
      <AppProviders>
        <HouseholdAccessScreen />
      </AppProviders>,
    );

    expect(screen.getByRole('button', {
      name: i18n.t('sharing.family.manage.invite-cta'),
    }).props.accessibilityState.disabled).toBe(true);
  });

  it('PUP-42 exposes a busy invite action while creation is pending', () => {
    mockUseCreateHouseholdInviteMutation.mockReturnValue({
      isPending: true,
      mutateAsync: jest.fn(),
    });

    render(
      <AppProviders>
        <HouseholdAccessScreen />
      </AppProviders>,
    );

    expect(screen.getByRole('button', {
      name: i18n.t('sharing.family.manage.invite-cta'),
    }).props.accessibilityState.busy).toBe(true);
  });

  it('AC-SHARE-HOUSEHOLD-STATES renders deterministic household state templates', () => {
    render(
      <AppProviders>
        <HouseholdAccessScreen reviewState="loading" />
        <HouseholdAccessScreen reviewState="pending-write" />
        <HouseholdAccessScreen reviewState="error" />
        <HouseholdAccessScreen reviewState="offline-read" />
      </AppProviders>,
    );

    for (const state of [
      'loading',
      'pending-write',
      'error',
      'offline-read',
    ] as const) {
      expect(screen.getByTestId(`household-state-${state}`)).toBeTruthy();
    }

    expect(screen.getByTestId('household-state-error').props.accessibilityRole).toBe('alert');
    expect(screen.getByTestId('household-state-loading').props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByTestId('household-state-pending-write').props.accessibilityLiveRegion).toBe('polite');
    expect(screen.queryByText(/@|token|provider|puppy a/i)).toBeNull();
  });

  it('renders the Trusted Sitter mode owner shell anatomy', () => {
    render(
      <AppProviders>
        <SitterModeScreen />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('sharing.sitter.screen-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.sitter.subtitle'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.sitter.subtitle-body', {
      name: 'Caregiver',
    }))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.sitter.section-who'))).toBeTruthy();
    expect(screen.getAllByText('Caregiver').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(i18n.t('sharing.family.manage.badge-caregiver')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(i18n.t('sharing.sitter.section-period'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.sitter.period-start'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.sitter.period-end'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.sitter.section-checklist'))).toBeTruthy();
    expect(screen.getAllByTestId('sitter-mode-checklist-row')).toHaveLength(5);
    expect(screen.getByText(i18n.t('sharing.sitter.checklist-feeding'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.sitter.checklist-training'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.sitter.section-what-sitter-sees'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.sitter.sitter-preview-bullets.0'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.sitter.sitter-excluded'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.sitter.disclosure'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('sharing.sitter.enable-cta') })).toBeTruthy();
    expect(screen.queryByText(/@|token/i)).toBeNull();
  });

  it('AC-SITTER-STATES renders compact sitter mode state templates for native handoff', () => {
    render(
      <AppProviders>
        <SitterModeStatePreview state="no-caregiver" />
        <SitterModeStatePreview state="pending" />
        <SitterModeStatePreview state="active" />
        <SitterModeStatePreview state="exit-confirm" />
      </AppProviders>,
    );

    for (const state of [
      'no-caregiver',
      'pending',
      'active',
      'exit-confirm',
    ] as const) {
      expect(screen.getByTestId(`sitter-mode-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`sharing.sitter.states.${state}.title`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`sharing.sitter.states.${state}.body`))).toBeTruthy();
    }

    expect(screen.queryByText(/@|token|raw/i)).toBeNull();
    expect(screen.queryByTestId('sitter-mode-checklist-row')).toBeNull();
  });

  it('renders the PuppyPlan Plus shell anatomy without live billing', () => {
    render(
      <AppProviders>
        <PuppyPlanPlusScreen />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('paywall.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.subtitle'))).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.trial-status', { count: 30 }))).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.trial-note'))).toBeTruthy();
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

  it('renders the day-30 soft-lock paywall state with export still reachable', () => {
    render(
      <AppProviders>
        <PuppyPlanPlusScreen accessState="softLocked" trialDaysRemaining={0} />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('paywall.soft-lock-banner-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('paywall.soft-lock-banner-body'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('paywall.export-action') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('paywall.secondary') })).toBeTruthy();
    expect(screen.queryByText(/RevenueCat|hard paywall/i)).toBeNull();
  });

  it('AC-MORE-PLUS-STATES renders deterministic loading, pending, error, offline, and active states', () => {
    render(
      <AppProviders>
        <PuppyPlanPlusScreen reviewState="loading-products" />
        <PuppyPlanPlusScreen reviewState="pending-purchase" />
        <PuppyPlanPlusScreen reviewState="purchase-error" />
        <PuppyPlanPlusScreen reviewState="offline-read" />
        <PuppyPlanPlusScreen reviewState="active-subscription" />
      </AppProviders>,
    );

    for (const state of [
      'loading-products',
      'pending-purchase',
      'purchase-error',
      'offline-read',
      'active-subscription',
    ] as const) {
      expect(screen.getByTestId(`paywall-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`paywall.states.${state}.title`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`paywall.states.${state}.body`))).toBeTruthy();
    }

    expect(screen.getByTestId('paywall-state-purchase-error').props.accessibilityRole)
      .toBe('alert');
    expect(screen.getByTestId('paywall-state-pending-purchase').props.accessibilityLiveRegion)
      .toBe('polite');
    expect(screen.getAllByRole('button', {
      name: i18n.t('paywall.primary'),
    }).some((button) => button.props.accessibilityState.busy)).toBe(true);
    expect(screen.queryByText(/RevenueCat|StoreKit|transaction id|product id|provider/i)).toBeNull();
  });

  it('renders the minimal Shareable Puppy Card shell without private data', () => {
    render(
      <AppProviders>
        <ShareablePuppyCardScreen />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('sharing.card-builder.screen-title', {
      puppyName: 'Puppy',
    }))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.card-builder.section-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.card-builder.fields.0'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.card-builder.fields.2'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.card-builder.footer-note'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.card-builder.health-disclosure'))).toBeTruthy();

    const preview = screen.getByTestId('shareable-card-preview');
    const previewStyle = StyleSheet.flatten(preview.props.style);
    expect(previewStyle.aspectRatio).toBeCloseTo(3 / 4);
    expect(preview.props.accessibilityLabel).toContain(i18n.t('sharing.card-preview.footer'));

    expect(screen.getByRole('button', {
      name: i18n.t('sharing.card-preview.share'),
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.card-management.public-link-disclosure'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.card-management.section-active'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.card-management.row-status-active', {
      date: '24 May',
    }))).toBeTruthy();
    expect(screen.queryByText(/@|token|provider name/i)).toBeNull();
  });

  it('renders Shareable Puppy Card state templates with locked accessibility semantics', () => {
    render(
      <AppProviders>
        <ShareablePuppyCardStatePreview state="empty-builder" />
        <ShareablePuppyCardStatePreview state="health-on" />
        <ShareablePuppyCardStatePreview state="share-options" />
        <ShareablePuppyCardStatePreview state="loading" />
        <ShareablePuppyCardStatePreview state="pending-write" />
        <ShareablePuppyCardStatePreview state="error" />
        <ShareablePuppyCardStatePreview state="offline-read" />
      </AppProviders>,
    );

    for (const state of [
      'empty-builder',
      'health-on',
      'share-options',
      'loading',
      'pending-write',
      'error',
      'offline-read',
    ] as const) {
      expect(screen.getByTestId(`shareable-card-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`sharing.card-management.states.${state}.title`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`sharing.card-management.states.${state}.body`))).toBeTruthy();
    }

    expect(screen.getByTestId('shareable-card-state-error').props.accessibilityRole)
      .toBe('alert');
    expect(screen.getByTestId('shareable-card-state-loading').props.accessibilityLiveRegion)
      .toBe('polite');
    expect(screen.getByTestId('shareable-card-state-pending-write').props.accessibilityLiveRegion)
      .toBe('polite');
    expect(screen.getByRole('button', {
      name: i18n.t('sharing.card-builder.preview-cta'),
    }).props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByText(/@|share token|invite token|provider name|supabase|production write/i))
      .toBeNull();
  });

  it('renders a Shareable Puppy Card route review state without replacing the shell', () => {
    render(
      <AppProviders>
        <ShareablePuppyCardScreen reviewState="pending-write" />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('sharing.card-management.screen-title'))).toBeTruthy();
    expect(screen.getByTestId('shareable-card-state-pending-write')).toBeTruthy();
    expect(screen.getByTestId('shareable-card-preview')).toBeTruthy();
  });

  it('AC-SHARE-CARD-SHARE-1 AC-SHARE-CARD-SHARE-2 AC-SHARE-CARD-SHARE-3 invokes the OS share sheet with privacy-safe card copy', async () => {
    render(
      <AppProviders>
        <ShareablePuppyCardRoute />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.card-preview.share'),
    }));

    await waitFor(() => expect(shareSpy).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining(i18n.t('sharing.card-preview.footer')),
      title: i18n.t('sharing.card-builder.screen-title', {
        puppyName: i18n.t('sharing.card-management.sample-puppy-name'),
      }),
    })));
    expect(shareSpy.mock.calls[0]?.[0].message).not.toMatch(/@|share token|invite token|provider name|supabase/i);
    await waitFor(() => expect(screen.getByTestId('shareable-card-state-share-options')).toBeTruthy());
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('AC-SHARE-CARD-SHARE-4 shows the existing error state when the OS share sheet rejects', async () => {
    shareSpy.mockRejectedValue(new Error('share failed'));

    render(
      <AppProviders>
        <ShareablePuppyCardRoute />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.card-preview.share'),
    }));

    await waitFor(() => expect(screen.getByTestId('shareable-card-state-error')).toBeTruthy());
    expect(mockRouterBack).not.toHaveBeenCalled();
  });
});
