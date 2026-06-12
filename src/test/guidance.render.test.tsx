import { AccessibilityInfo } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import { StarterGuidanceCard } from '@/features/today/components/TodayCards';
import { i18n } from '@/lib/i18n';

function renderGuidance() {
  return render(
    <I18nextProvider i18n={i18n}>
      <StarterGuidanceCard topicId="first_night" />
    </I18nextProvider>,
  );
}

describe('starter guidance card interactions', () => {
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

  it('supports read, practiced, and skip states with typed copy', () => {
    renderGuidance();

    expect(screen.getByText(i18n.t('guidance.first-night.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('guidance.first-night.body'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('guidance.action-labels.read'),
    }));
    expect(screen.getByText(i18n.t('guidance.status.read'))).toBeTruthy();
    expect(screen.getByText(i18n.t('guidance.first-night.escalation'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('guidance.action-labels.practiced'),
    }));
    expect(screen.getByText(i18n.t('guidance.status.practiced'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('guidance.action-labels.skip'),
    }));
    expect(screen.getByText(i18n.t('guidance.status.skipped'))).toBeTruthy();
    expect(screen.queryByTestId('today-guidance-detail')).toBeNull();
  });
});
