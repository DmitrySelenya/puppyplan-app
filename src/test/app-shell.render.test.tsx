import { useEffect, type ReactElement } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { tokens } from '@/design/tokens';
import { AppProviders } from '@/lib/providers/AppProviders';
import { AuthProvider, type AuthProviderDependencies } from '@/lib/auth';
import { i18n } from '@/lib/i18n';
import { AccessUnavailableScreen } from '@/features/linking/screens/AccessUnavailableScreen';
import { InviteAcceptScreen } from '@/features/linking/screens/InviteAcceptScreen';
import { HealthScreen } from '@/features/health/screens/HealthScreen';
import { MoreScreen } from '@/features/more/screens/MoreScreen';
import { QuickLogShell } from '@/features/quick-log/screens/QuickLogShell';
import { TodayScreen } from '@/features/today/screens/TodayScreen';
import { useSnackbar } from '@/design/primitives/Snackbar';
import { QuickLogFeedbackProvider } from '@/features/quick-log/QuickLogFeedbackProvider';

const noop = () => {};

const stubAuthDependencies: AuthProviderDependencies = {
  appState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
  bootstrap: async () => ({ created: true, household_id: '00000000-0000-4000-8000-000000000201' }),
  getCurrentUser: () => new Promise(() => {}),
  signOut: async () => undefined,
  startAutoRefresh: () => undefined,
  stopAutoRefresh: () => undefined,
  subscribeToAuthChanges: () => () => undefined,
};

function renderWithProviders(element: ReactElement) {
  return render(
    <AppProviders>
      <QuickLogFeedbackProvider>
        {element}
      </QuickLogFeedbackProvider>
    </AppProviders>,
  );
}

function SnackbarProbe() {
  const snackbar = useSnackbar();

  useEffect(() => {
    snackbar.showSnackbar({
      accessibilityLabel: 'Quick Log saved.',
      id: 'app-shell-snackbar-probe',
      message: 'Logged · Feeding',
      tone: 'success',
    });
  }, [snackbar]);

  return null;
}

describe('app shell screens', () => {
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

  it('renders the Diary shell with localized empty-state copy', () => {
    renderWithProviders(<TodayScreen openTimeline={noop} />);

    expect(screen.getByTestId('diary-header')).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.unavailable.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.unavailable.body'))).toBeTruthy();
  });

  it('renders the Pet shell as an honest empty state with an Add Record route action', () => {
    const openAddRecord = jest.fn();
    const result = renderWithProviders(<HealthScreen onOpenAddRecord={openAddRecord} />);

    expect(screen.getByText(i18n.t('tabs.pet'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.segments.0'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.segments.1'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.filter-chips.0'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.empty.title'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('health.rows.dhpp-title'))).toBeNull();
    expect(screen.queryByText(i18n.t('health.rows.parasite-review-title'))).toBeNull();
    expect(screen.queryByText(i18n.t('health.rows.vet-visit-title'))).toBeNull();
    const addRecordButton = screen.getByRole('button', {
      name: i18n.t('health.empty.primary'),
    });
    expect(addRecordButton.props.accessibilityState.disabled).toBe(false);
    fireEvent.press(addRecordButton);
    expect(openAddRecord).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {
      name: i18n.t('health.empty.secondary'),
    }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText(i18n.t('health.footer-hint'))).toBeTruthy();
    expect(screen.queryByText(/diagnosis|dose|urgent/i)).toBeNull();

    const scrollView = result.UNSAFE_getByType(ScrollView);
    const contentStyle = StyleSheet.flatten(scrollView.props.contentContainerStyle);

    expect(contentStyle.paddingBottom).toBeGreaterThanOrEqual(tokens.layout.bottomInsetFab);
  });

  it('renders the Pet review mixed-list fixture only when explicitly requested', () => {
    renderWithProviders(<HealthScreen reviewState="mixed-list" />);

    expect(screen.getByText(i18n.t('health.rows.dhpp-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.rows.weight-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.rows.parasite-review-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.rows.dhpp-template-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.rows.vet-visit-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.footer-hint'))).toBeTruthy();
    expect(screen.queryByText(/diagnosis|dose|urgent/i)).toBeNull();

    fireEvent.press(screen.getByRole('tab', { name: i18n.t('health.segments.1') }));
    expect(screen.getByText(i18n.t('health.rows.dhpp-title'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('health.rows.parasite-review-title'))).toBeNull();
    expect(screen.queryByText(i18n.t('health.rows.vet-visit-title'))).toBeNull();
  });

  it('renders the More shell with localized support copy and a sign-out control', () => {
    render(
      <AppProviders>
        <AuthProvider dependencies={stubAuthDependencies}>
          <QuickLogFeedbackProvider>
            <MoreScreen openTimeline={noop} />
          </QuickLogFeedbackProvider>
        </AuthProvider>
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('more.screen-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.timeline'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.sections.support'))).toBeTruthy();
    expect(screen.getByText(i18n.t('auth.sign-out.cta'))).toBeTruthy();
  });

  it('renders the Quick Log modal shell unavailable state without product data', () => {
    renderWithProviders(<QuickLogShell />);

    expect(screen.getByText(i18n.t('quick-log.sheet.unavailable.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.sheet.unavailable.body'))).toBeTruthy();
  });

  it('exposes a global snackbar host from AppProviders', async () => {
    renderWithProviders(
      <>
        <QuickLogShell />
        <SnackbarProbe />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByText('Logged · Feeding')).toBeTruthy();
      expect(screen.getByLabelText('Quick Log saved.')).toBeTruthy();
    });
  });

  it('renders neutral invite/share unavailable copy without token values', () => {
    renderWithProviders(<AccessUnavailableScreen />);

    expect(screen.getByText(i18n.t('states.revoked-or-expired.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('states.revoked-or-expired.body-long'))).toBeTruthy();
    expect(screen.queryByText(/\[[^\]]*token[^\]]*\]/i)).toBeNull();
  });

  it('renders caregiver-side accept invite anatomy without exposing the token', () => {
    renderWithProviders(
      <InviteAcceptScreen
        inviteToken="raw-invite-token-for-test"
        ownerName="Owner"
        puppyName="Puppy"
      />,
    );

    expect(screen.getByText(i18n.t('sharing.family.accepted.header', {
      ownerName: 'Owner',
      puppyName: 'Puppy',
    }))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.accepted.role-caregiver'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.accepted.what-included'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.accepted.caregiver-included-bullets.0', {
      puppyName: 'Puppy',
    }))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.accepted.caregiver-included-bullets.1'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.accepted.caregiver-included-bullets.2'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.accepted.what-excluded'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.accepted.caregiver-excluded-bullets.0'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.accepted.caregiver-excluded-bullets.1'))).toBeTruthy();
    expect(screen.getByText(i18n.t('sharing.family.accepted.disclosure', {
      ownerName: 'Owner',
    }))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('sharing.family.accepted.accept') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('sharing.family.accepted.decline') })).toBeTruthy();
    expect(screen.queryByText(/raw-invite-token-for-test/i)).toBeNull();
  });
});
