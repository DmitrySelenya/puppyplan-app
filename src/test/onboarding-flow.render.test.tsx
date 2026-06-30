import { AccessibilityInfo, StyleSheet } from 'react-native';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { tokens } from '@/design/tokens';
import {
  OnboardingAccountPromptPreview,
  OnboardingFirstLogPreview,
  OnboardingNotificationsPromptPreview,
  OnboardingScreen,
} from '@/features/onboarding/screens/OnboardingScreen';
import type { PuppyProfileInput } from '@/contracts/onboarding';
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

  it('renders the locked welcome anatomy before puppy setup', () => {
    const openQuickLog = jest.fn();
    const openSignIn = jest.fn();
    const saveProfile = jest.fn(async () => undefined);

    render(
      <AppProviders>
        <OnboardingScreen
          openQuickLog={openQuickLog}
          openSignIn={openSignIn}
          saveProfile={saveProfile}
        />
      </AppProviders>,
    );

    const illustrationStyle = StyleSheet.flatten(
      screen.getByTestId('onboarding-welcome-illustration', {
        includeHiddenElements: true,
      }).props.style,
    );

    expect(illustrationStyle).toMatchObject({
      backgroundColor: tokens.color.surface.sunken,
      borderRadius: tokens.radius.md,
      minHeight: 160,
    });
    expect(screen.getByLabelText(i18n.t('onboarding.welcome.a11y-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.welcome.subtitle'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.welcome.cta'),
    })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.welcome.secondary'),
    })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.welcome.secondary'),
    }));
    expect(openSignIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(i18n.t('onboarding.puppy-profile.title'))).toBeNull();
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

    expect(screen.getByText(i18n.t('onboarding.tracker-picker.helper'))).toBeTruthy();
    const zoomiesTileStyle = screen.getByRole('button', {
      name: i18n.t('onboarding.tracker-picker.tile-selected-a11y', {
        label: i18n.t('quick-log.trackers.zoomies'),
      }),
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

  it('renders the puppy setup age hint inline before tracker selection', () => {
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

    expect(screen.queryByTestId('onboarding-age-hint-card')).toBeNull();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('onboarding.puppy-profile.name-field-label')),
      'Puppy',
    );

    const ageHintCard = screen.getByTestId('onboarding-age-hint-card');
    const ageHintStyle = StyleSheet.flatten(ageHintCard.props.style);

    expect(ageHintStyle).toMatchObject({
      backgroundColor: tokens.color.status.infoTint,
      borderRadius: tokens.radius.md,
    });
    expect(screen.getByLabelText(`Hint. ${i18n.t('onboarding.age-hint.6-8-weeks')}`)).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.age-hint.6-8-weeks'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('onboarding.tracker-picker.title'))).toBeNull();
  });

  it('renders the Puppy Setup V2 chrome, age stepper, and disabled CTA anatomy', () => {
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

    expect(screen.getByText(i18n.t('onboarding.puppy-profile.step-label'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.back-a11y'),
    })).toBeTruthy();
    expect(screen.getAllByText(i18n.t('onboarding.puppy-profile.age-toggle-age'))).toHaveLength(2);

    const continueButton = screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.cta'),
    });

    expect(continueButton.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(continueButton);
    expect(screen.queryByText(i18n.t('onboarding.puppy-profile.error-name-required'))).toBeNull();
    expect(screen.queryByText(i18n.t('onboarding.tracker-picker.title'))).toBeNull();

    const stepperStyle = StyleSheet.flatten(screen.getByTestId('onboarding-age-stepper').props.style);

    expect(stepperStyle).toMatchObject({
      backgroundColor: tokens.color.surface.raised,
      borderRadius: tokens.radius.md,
    });
    expect(screen.getByLabelText(i18n.t('onboarding.puppy-profile.a11y-stepper', {
      count: 8,
    }))).toBeTruthy();
    expect(screen.getAllByText('-')).toHaveLength(2);
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.age-decrement-a11y'),
    })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.age-increment-a11y'),
    })).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('onboarding.puppy-profile.name-field-label')),
      'Puppy A',
    );

    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.cta'),
    }).props.accessibilityState.disabled).toBe(false);
    expect(screen.getByText(i18n.t('onboarding.puppy-profile.age-weeks-value', {
      count: 8,
    }))).toBeTruthy();
    expect(screen.getByTestId('onboarding-age-hint-card')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.age-decrement-a11y'),
    }));
    expect(screen.getByText(i18n.t('onboarding.puppy-profile.age-weeks-value', {
      count: 7,
    }))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.back-a11y'),
    }));
    expect(screen.getByText(i18n.t('onboarding.welcome.subtitle'))).toBeTruthy();
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

  it('keeps profile continue disabled until the name field has content', () => {
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
    const disabledContinue = screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.cta'),
    });

    expect(disabledContinue.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(disabledContinue);
    expect(screen.queryByText(i18n.t('onboarding.puppy-profile.error-name-required'))).toBeNull();
    expect(screen.queryByText(i18n.t('onboarding.tracker-picker.title'))).toBeNull();

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('onboarding.puppy-profile.name-field-label')),
      'Puppy',
    );

    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.cta'),
    }).props.accessibilityState.disabled).toBe(false);
  });

  it('adjusts age with the puppy setup stepper before opening tracker setup', () => {
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
      name: i18n.t('onboarding.puppy-profile.age-decrement-a11y'),
    }));
    expect(screen.getByText(i18n.t('onboarding.puppy-profile.age-weeks-value', {
      count: 7,
    }))).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.age-increment-a11y'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.age-increment-a11y'),
    }));
    expect(screen.getByText(i18n.t('onboarding.puppy-profile.age-weeks-value', {
      count: 9,
    }))).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.cta'),
    }));

    expect(screen.getByText(i18n.t('onboarding.tracker-picker.title'))).toBeTruthy();
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it('targets future birth-date validation to the birth-date field and keeps the date segment active', () => {
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
    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('onboarding.puppy-profile.age-toggle-date'),
    }));
    const birthDateInput = screen.getAllByLabelText(
      i18n.t('onboarding.puppy-profile.age-toggle-date'),
    ).at(-1);

    expect(birthDateInput).toBeDefined();
    fireEvent.changeText(birthDateInput!, '2999-01-01');
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.puppy-profile.cta'),
    }));

    expect(screen.getByText(i18n.t('onboarding.puppy-profile.error-future-date'))).toBeTruthy();
    expect(screen.getByRole('tab', {
      name: i18n.t('onboarding.puppy-profile.age-toggle-date'),
    }).props.accessibilityState.selected).toBe(true);
    expect(screen.queryByLabelText(i18n.t('onboarding.puppy-profile.age-weeks-field-label'))).toBeNull();
    expect(screen.queryByText(i18n.t('onboarding.tracker-picker.title'))).toBeNull();
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it('keeps plan reveal in wizard chrome without TabBar or Quick Log FAB', async () => {
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
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.trackers.weight'),
    })).toBeNull();
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.tracker-picker.cta'),
    }));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('onboarding.plan-reveal.title'))).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('tabs.diary'))).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('tabs.quick-log-fab-label'),
    })).toBeNull();
    expect(screen.queryByText(/Step 5 of 5/i)).toBeNull();
  });

  it('renders the locked Plan Reveal V2 value moment anatomy', async () => {
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
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.tracker-picker.cta'),
    }));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('onboarding.plan-reveal.title'))).toBeTruthy();
    });

    const ageLabel = i18n.t('onboarding.puppy-profile.age-weeks-value', { count: 8 });

    expect(screen.getByLabelText(i18n.t('onboarding.plan-reveal.summary-a11y', {
      age: ageLabel,
      name: 'Puppy',
    }))).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.plan-reveal.summary', {
      age: ageLabel,
      name: 'Puppy',
    }))).toBeTruthy();

    const heroStyle = StyleSheet.flatten(screen.getByTestId('onboarding-plan-hero-card', {
      includeHiddenElements: true,
    }).props.style);

    expect(heroStyle).toMatchObject({
      backgroundColor: tokens.color.accent[100],
      minHeight: 96,
    });
    expect(screen.getByLabelText(i18n.t('onboarding.plan-reveal.hero-a11y', {
      hero: i18n.t('onboarding.plan-reveal.hero'),
    }))).toBeTruthy();

    const starterCards = screen.getAllByTestId('onboarding-plan-starter-card', {
      includeHiddenElements: true,
    });
    expect(starterCards).toHaveLength(3);
    expect(screen.getByText(i18n.t('onboarding.plan-reveal.starter-card-1'))).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.plan-reveal.starter-card-2'))).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.plan-reveal.starter-card-3'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.plan-reveal.cta'),
    })).toBeTruthy();
  });

  it('renders first-log completion as Diary chrome with local-only pending state and one celebration source', async () => {
    render(
      <AppProviders>
        <OnboardingFirstLogPreview />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('onboarding.first-log.hero-after-first'))).toBeTruthy();
    expect(screen.getByText(i18n.t('timeline.pills.local-only'))).toBeTruthy();
    expect(screen.getByText(i18n.t('timeline.pills.pending'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('timeline.pills.synced'))).toBeNull();
    expect(screen.queryByText(i18n.t('onboarding.first-log.eyebrow'))).toBeNull();
    expect(screen.queryByText(/Today/i)).toBeNull();
    expect(screen.getByText(i18n.t('tabs.diary'))).toBeTruthy();
    expect(screen.getByText(i18n.t('tabs.pet'))).toBeTruthy();
    expect(screen.getByText(i18n.t('tabs.more'))).toBeTruthy();
    expect(screen.getByRole('tab', {
      name: i18n.t('tabs.diary'),
    }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('tab', {
      name: i18n.t('tabs.pet'),
    }).props.accessibilityState.selected).toBe(false);
    expect(screen.getByRole('button', {
      name: i18n.t('tabs.quick-log-fab-label'),
    })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText(i18n.t('onboarding.first-log.celebration-snackbar'))).toBeTruthy();
    });
    expect(screen.getByLabelText(i18n.t('onboarding.first-log.celebration-snackbar-a11y'))).toBeTruthy();
    expect(screen.queryByText(/Step \d of 5/i)).toBeNull();
  });

  it('renders the post-first-value account prompt as a skippable sheet', () => {
    render(
      <AppProviders>
        <OnboardingAccountPromptPreview />
      </AppProviders>,
    );

    expect(screen.getByLabelText(i18n.t('onboarding.account-wall.sheet-a11y'))).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.account-wall.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.account-wall.body'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.account-wall.apple'),
    })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.account-wall.google'),
    })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.account-wall.email'),
    })).toBeTruthy();
    expect(screen.getAllByRole('button', {
      name: i18n.t('onboarding.account-wall.secondary'),
    })).toHaveLength(1);
  });

  it('renders the post-first-value notification prompt as a skippable sheet', () => {
    render(
      <AppProviders>
        <OnboardingNotificationsPromptPreview />
      </AppProviders>,
    );

    expect(screen.getByLabelText(i18n.t('onboarding.notifications-prompt.sheet-a11y'))).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.notifications-prompt.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.notifications-prompt.body'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.notifications-prompt.primary'),
    })).toBeTruthy();
    expect(screen.getAllByRole('button', {
      name: i18n.t('onboarding.notifications-prompt.secondary'),
    })).toHaveLength(1);
  });

  it('keeps account and notification prompts absent from the first-value completion screen', () => {
    render(
      <AppProviders>
        <OnboardingFirstLogPreview />
      </AppProviders>,
    );

    expect(screen.queryByText(i18n.t('onboarding.account-wall.title'))).toBeNull();
    expect(screen.queryByText(i18n.t('onboarding.notifications-prompt.title'))).toBeNull();
  });

  it('renders the Tracker Selection V2 chrome, helper, selected state, and checkmark anatomy', () => {
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

    expect(screen.getByText(i18n.t('onboarding.tracker-picker.step-label'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.tracker-picker.back-a11y'),
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('onboarding.tracker-picker.helper'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('onboarding.age-hint.6-8-weeks'))).toBeNull();

    const feedingTile = screen.getByRole('button', {
      name: i18n.t('onboarding.tracker-picker.tile-selected-a11y', {
        label: i18n.t('quick-log.trackers.feeding'),
      }),
    });

    expect(feedingTile.props.accessibilityState.selected).toBe(true);
    expect(screen.getAllByTestId('tracker-tile-checkmark', {
      includeHiddenElements: true,
    })).toHaveLength(5);
  });

  it('allows zero selected trackers, shows Skip selection, and saves default trackers on skip', async () => {
    const openQuickLog = jest.fn();
    const saveProfile = jest.fn<Promise<void>, [PuppyProfileInput]>(async () => undefined);

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
        name: i18n.t('onboarding.tracker-picker.tile-selected-a11y', {
          label: i18n.t(trackerLabel),
        }),
      }));
    }

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.tracker-picker.tile-selected-a11y', {
        label: i18n.t('quick-log.trackers.potty'),
      }),
    }));

    expect(screen.queryByText(i18n.t('onboarding.tracker-picker.min-required-snackbar'))).toBeNull();
    expect(screen.getByText(i18n.t('onboarding.tracker-picker.counter', { n: 0 }))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('onboarding.tracker-picker.zero-state-cta'),
    })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.tracker-picker.zero-state-cta'),
    }));

    await waitFor(() => {
      expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({
        selectedTrackerIds: expect.arrayContaining(['potty', 'feeding', 'sleep', 'walk', 'zoomies']),
      }));
    });
    expect(saveProfile.mock.calls[0]?.[0].selectedTrackerIds).toHaveLength(5);
  });
});
