import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import ShareTokenRoute from '../../app/share/[token]';
import { InviteAcceptScreen } from '@/features/linking/screens/InviteAcceptScreen';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

const mockRouterReplace = jest.fn();
const mockRouterDismissAll = jest.fn();
let mockToken: string | string[] | undefined = 'synthetic-route-token';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ token: mockToken }),
  useRouter: () => ({
    dismissAll: () => mockRouterDismissAll(),
    replace: (href: string) => mockRouterReplace(href),
  }),
}));

describe('closed access link routes', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    mockRouterDismissAll.mockClear();
    mockRouterReplace.mockClear();
    mockToken = 'synthetic-route-token';
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('shows a neutral unavailable invite without fabricated identity and exits safely', () => {
    render(
      <AppProviders>
        <InviteAcceptScreen
          inviteToken="synthetic-route-token"
          onContinueWithoutInvite={() => {
            mockRouterDismissAll();
            mockRouterReplace('/diary');
          }}
          reviewState="expired"
        />
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('sharing.family.accepted.states.expired.title'))).toBeTruthy();
    expect(screen.queryByText('Owner')).toBeNull();
    expect(screen.queryByText('Puppy')).toBeNull();
    expect(screen.queryByText('synthetic-route-token')).toBeNull();
    expect(screen.getByRole('button', {
      name: i18n.t('sharing.family.accepted.accept'),
    }).props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.accepted.create-own'),
    }));
    expect(mockRouterDismissAll).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith('/diary');
    expect(mockRouterDismissAll.mock.invocationCallOrder[0])
      .toBeLessThan(mockRouterReplace.mock.invocationCallOrder[0] ?? 0);
  });

  it('clears a presenting modal before exiting a closed share link to Diary', () => {
    render(
      <AppProviders>
        <ShareTokenRoute />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('states.revoked-or-expired.action'),
    }));
    expect(mockRouterDismissAll).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith('/diary');
    expect(mockRouterDismissAll.mock.invocationCallOrder[0])
      .toBeLessThan(mockRouterReplace.mock.invocationCallOrder[0] ?? 0);
  });
});
