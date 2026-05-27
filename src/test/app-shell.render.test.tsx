import { useEffect, type ReactElement } from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';

import { AppProviders } from '@/lib/providers/AppProviders';
import { i18n } from '@/lib/i18n';
import { AccessUnavailableScreen } from '@/features/linking/screens/AccessUnavailableScreen';
import { HealthScreen } from '@/features/health/screens/HealthScreen';
import { MoreScreen } from '@/features/more/screens/MoreScreen';
import { QuickLogShell } from '@/features/quick-log/screens/QuickLogShell';
import { TodayScreen } from '@/features/today/screens/TodayScreen';
import { useSnackbar } from '@/design/primitives/Snackbar';
import { QuickLogFeedbackProvider } from '@/features/quick-log/QuickLogFeedbackProvider';

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

  it('renders the Today shell with localized empty-state copy', () => {
    renderWithProviders(<TodayScreen />);

    expect(screen.getByText(i18n.t('tabs.today'))).toBeTruthy();
    expect(screen.getByText(i18n.t('states.empty-first-run.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('states.empty-first-run.body'))).toBeTruthy();
  });

  it('renders the Health shell with localized support copy', () => {
    renderWithProviders(<HealthScreen />);

    expect(screen.getByText(i18n.t('tabs.health'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.footer-hint'))).toBeTruthy();
  });

  it('renders the More shell with localized support copy', () => {
    renderWithProviders(<MoreScreen />);

    expect(screen.getByText(i18n.t('more.screen-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.sections.support'))).toBeTruthy();
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
});
