import { AccessibilityInfo, StyleSheet } from 'react-native';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { tokens } from '@/design/tokens';
import { OnboardingScreen } from '@/features/onboarding/screens/OnboardingScreen';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

describe('Onboarding production flow', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
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
    const zoomiesTileStyle = screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.zoomies'),
    }).props.style;

    expect(StyleSheet.flatten(
      typeof zoomiesTileStyle === 'function' ? zoomiesTileStyle({ pressed: false }) : zoomiesTileStyle,
    ).width).toBe(tokens.component.trackerTile.twoCol.width - tokens.space[2]);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.tracker-picker.cta'),
    }));

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({
        ageMode: 'age_weeks',
        ageWeeksEstimate: 8,
        name: 'Puppy',
        selectedTrackerIds: expect.arrayContaining(['potty', 'feeding']),
      }));
    });
    expect(screen.getByText(i18n.t('onboarding.plan-reveal.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.plan-reveal.hero')).props.maxFontSizeMultiplier).toBe(2);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.plan-reveal.cta'),
    }));

    expect(openQuickLog).toHaveBeenCalledTimes(1);
  });

  it('keeps tracker setup retryable when profile save fails', async () => {
    const openQuickLog = jest.fn();
    const saveProfile = jest.fn(async () => {
      throw new Error('offline');
    });

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
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.tracker-picker.cta'),
    }));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('errors.save-failed-connection'))).toBeTruthy();
    });
    expect(screen.getByText(i18n.t('onboarding.tracker-picker.title'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('onboarding.plan-reveal.title'))).toBeNull();
    expect(openQuickLog).not.toHaveBeenCalled();
  });

  it('targets profile validation errors and clears them when the affected field changes', () => {
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
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.cta'),
    }));

    expect(screen.getByText(i18n.t('onboarding.puppy-profile.error-name-required'))).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('onboarding.puppy-profile.name-field-label')),
      'Puppy',
    );

    expect(screen.queryByText(i18n.t('onboarding.puppy-profile.error-name-required'))).toBeNull();
  });

  it('rejects non-numeric age text before opening tracker setup', () => {
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
    fireEvent.changeText(
      screen.getByLabelText(i18n.t('onboarding.puppy-profile.age-weeks-field-label')),
      '8abc',
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.cta'),
    }));

    expect(screen.getByText(i18n.t('onboarding.puppy-profile.error-age-required'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('onboarding.tracker-picker.title'))).toBeNull();
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it('resets tracker warning after a valid select and keeps one tracker selected', () => {
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

    for (const trackerLabel of [
      'quick-log.trackers.sleep',
      'quick-log.trackers.walk',
      'quick-log.trackers.zoomies',
      'quick-log.trackers.feeding',
    ] as const) {
      fireEvent.press(screen.getByRole('button', {
        name: i18n.t(trackerLabel),
      }));
    }

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.potty'),
    }));

    expect(screen.getByText(i18n.t('onboarding.tracker-picker.min-required-snackbar'))).toBeTruthy();
    expect(
      screen.getByLabelText(i18n.t('onboarding.tracker-picker.min-required-snackbar')).props,
    ).toMatchObject({
      accessibilityLiveRegion: 'polite',
      accessibilityRole: 'alert',
    });
    expect(screen.getByText(i18n.t('onboarding.tracker-picker.counter', { n: 1 }))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    expect(screen.queryByText(i18n.t('onboarding.tracker-picker.min-required-snackbar'))).toBeNull();
    expect(screen.getByText(i18n.t('onboarding.tracker-picker.counter', { n: 2 }))).toBeTruthy();
  });
});
