import { AccessibilityInfo } from 'react-native';
import { cleanup, render, screen } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import type { TodayPlan } from '@/contracts/today';
import { TodayPlanCards } from '@/features/today/components/TodayCards';
import { i18n } from '@/lib/i18n';

const legacyGuidancePlan: TodayPlan = {
  dailyCards: [],
  deferredProductionFeatures: [],
  guidanceCard: {
    contentVersion: 'local-2026-06-12-v1',
    dayNumber: 1,
    slot: 'guidance',
    topicId: 'first_night',
  },
  hero: {
    id: 'hero:steady_day',
    priority: 30,
    slot: 'hero',
    variant: 'steady_day',
  },
  todayDate: '2026-06-12',
};

function renderGuidancePlan() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TodayPlanCards plan={legacyGuidancePlan} />
    </I18nextProvider>,
  );
}

describe('starter guidance active UI deferral', () => {
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

  it('does not render read, practiced, or skip states in the active V2 Diary wave', () => {
    renderGuidancePlan();

    expect(screen.queryByTestId('today-guidance-card')).toBeNull();
    expect(screen.queryByText(i18n.t('guidance.first-night.title'))).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('guidance.action-labels.read'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('guidance.action-labels.practiced'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('guidance.action-labels.skip'),
    })).toBeNull();
  });
});
