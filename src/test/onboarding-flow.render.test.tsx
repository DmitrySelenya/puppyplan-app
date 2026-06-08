import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { OnboardingScreen } from '@/features/onboarding/screens/OnboardingScreen';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

describe('Onboarding production flow', () => {
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

  it('collects profile and selected trackers, saves them, and reveals the starter plan', async () => {
    const openQuickLog = jest.fn();
    const saveProfile = jest.fn(async () => undefined);

    render(
      <AppProviders>
        <OnboardingScreen
          openQuickLog={openQuickLog}
          saveProfile={saveProfile}
        />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.welcome.cta'),
    }));
    fireEvent.changeText(
      screen.getByLabelText(i18n.t('onboarding.puppy-profile.name-field-label')),
      'Puppy',
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.cta'),
    }));

    expect(screen.getByText(i18n.t('onboarding.age-hint.6-8-weeks'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.tracker-picker.cta'),
    }));

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({
        ageMode: 'age_weeks',
        ageWeeksEstimate: 8,
        name: 'Puppy',
        selectedTrackerIds: expect.arrayContaining(['potty_pee_outside', 'feeding_meal']),
      }));
    });
    expect(screen.getByText(i18n.t('onboarding.plan-reveal.title'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.plan-reveal.cta'),
    }));

    expect(openQuickLog).toHaveBeenCalledTimes(1);
  });
});
