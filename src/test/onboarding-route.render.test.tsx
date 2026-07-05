import { AccessibilityInfo } from 'react-native';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import OnboardingRoute from '../../app/onboarding';

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockSaveProfile = jest.fn(async () => undefined);

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockRouterPush(href),
    replace: (href: string) => mockRouterReplace(href),
  },
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/lib/query/puppy', () => ({
  useSavePuppyProfileMutation: () => ({
    mutateAsync: mockSaveProfile,
  }),
}));

describe('OnboardingRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterPush.mockClear();
    mockRouterReplace.mockClear();
    mockSaveProfile.mockClear();
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    reduceMotionProbe.mockRestore();
  });

  it('AC-OB-PROMPT-RUNTIME opens Quick Log with an onboarding first-value source marker', async () => {
    render(
      <AppProviders>
        <OnboardingRoute />
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

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('onboarding.plan-reveal.cta'),
    }));

    expect(mockRouterPush).toHaveBeenCalledWith('/quick-log?source=onboarding-first-value');
    expect(mockRouterReplace).not.toHaveBeenCalledWith('/quick-log');
  });
});
