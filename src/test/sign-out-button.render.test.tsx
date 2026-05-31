import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { SignOutButton } from '@/features/more/components/SignOutButton';
import { AuthProvider, type AuthProviderDependencies } from '@/lib/auth';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

const authDependencies: AuthProviderDependencies = {
  appState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
  bootstrap: async () => ({ created: true, household_id: '00000000-0000-4000-8000-000000000201' }),
  getCurrentUser: () => new Promise(() => {}),
  signOut: async () => {
    throw new Error('auth_sign_out_failed');
  },
  startAutoRefresh: () => undefined,
  stopAutoRefresh: () => undefined,
  subscribeToAuthChanges: () => () => undefined,
};

describe('SignOutButton', () => {
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

  it('surfaces sign-out failures as localized feedback', async () => {
    render(
      <AppProviders>
        <AuthProvider dependencies={authDependencies}>
          <SignOutButton />
        </AuthProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByText(i18n.t('auth.sign-out.cta')));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('auth.sign-out.error'))).toBeTruthy();
      expect(screen.getByLabelText(i18n.t('auth.sign-out.error'))).toBeTruthy();
    });
  });
});
