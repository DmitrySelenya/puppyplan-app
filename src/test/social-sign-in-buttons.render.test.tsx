import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { SocialSignInButtons } from '@/features/auth/components/SocialSignInButtons';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

jest.mock('@/contracts/auth', () => ({
  enabledAuthMethods: ['email_otp', 'apple', 'google'],
}));

describe('SocialSignInButtons', () => {
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

  it('renders enabled social providers with localized labels', () => {
    render(
      <AppProviders>
        <SocialSignInButtons />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('auth.social.apple'))).toBeTruthy();
    expect(screen.getByText(i18n.t('auth.social.google'))).toBeTruthy();
    expect(screen.queryByText('apple')).toBeNull();
    expect(screen.queryByText('google')).toBeNull();
  });
});
