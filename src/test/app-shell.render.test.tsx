import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react-native';

import { AppProviders } from '@/lib/providers/AppProviders';
import { i18n } from '@/lib/i18n';
import { AccessUnavailableScreen } from '@/features/linking/screens/AccessUnavailableScreen';
import { HealthScreen } from '@/features/health/screens/HealthScreen';
import { MoreScreen } from '@/features/more/screens/MoreScreen';
import { QuickLogShell } from '@/features/quick-log/screens/QuickLogShell';
import { TodayScreen } from '@/features/today/screens/TodayScreen';

function renderWithProviders(element: ReactElement) {
  return render(<AppProviders>{element}</AppProviders>);
}

describe('app shell screens', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
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

  it('renders the Quick Log modal shell without product data', () => {
    renderWithProviders(<QuickLogShell />);

    expect(screen.getByText(i18n.t('quick-log.sheet.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.sheet.edit-helper'))).toBeTruthy();
  });

  it('renders neutral invite/share unavailable copy without token values', () => {
    renderWithProviders(<AccessUnavailableScreen />);

    expect(screen.getByText(i18n.t('states.revoked-or-expired.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('states.revoked-or-expired.body-long'))).toBeTruthy();
    expect(screen.queryByText(/\[[^\]]*token[^\]]*\]/i)).toBeNull();
  });
});
