import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';
import { HouseholdInviteError } from '@/lib/supabase/household-access';

import InviteTokenRoute from '../../app/invite/[token]';

const token = 'a'.repeat(64);
const acceptedHouseholdId = '00000000-0000-4000-8000-000000000701';
const mockMutateAsync = jest.fn();
const mockClearPendingInvite = jest.fn();
const mockMarkInviteUnavailable = jest.fn();
const mockCompleteHouseholdInviteAcceptance = jest.fn();
const mockContinueWithoutHouseholdInvite = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockUseAuth = jest.fn();
const mockUsePersistPendingHouseholdInvite = jest.fn();
let mockRouteToken: string | undefined = token;

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockRouterPush(href),
    replace: (href: string) => mockRouterReplace(href),
  },
  useLocalSearchParams: () => ({ token: mockRouteToken }),
}));

jest.mock('@/lib/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/query/household-access', () => ({
  useAcceptHouseholdInviteMutation: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
}));

jest.mock('@/lib/storage/usePendingHouseholdInvite', () => ({
  usePersistPendingHouseholdInvite: (inviteToken: string | undefined) =>
    mockUsePersistPendingHouseholdInvite(inviteToken),
}));

jest.mock('@/lib/storage/pendingHouseholdInvite', () => ({
  pendingHouseholdInviteController: {
    clear: () => mockClearPendingInvite(),
    markUnavailable: () => mockMarkInviteUnavailable(),
  },
}));

describe('PUP-42 invite route', () => {
  beforeEach(async () => {
    mockRouteToken = token;
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue({
      household_id: acceptedHouseholdId,
      role: 'caregiver',
    });
    mockClearPendingInvite.mockReset();
    mockClearPendingInvite.mockResolvedValue(undefined);
    mockMarkInviteUnavailable.mockReset();
    mockMarkInviteUnavailable.mockResolvedValue(undefined);
    mockCompleteHouseholdInviteAcceptance.mockReset();
    mockCompleteHouseholdInviteAcceptance.mockResolvedValue(undefined);
    mockContinueWithoutHouseholdInvite.mockReset();
    mockContinueWithoutHouseholdInvite.mockResolvedValue(undefined);
    mockRouterPush.mockReset();
    mockRouterReplace.mockReset();
    mockUsePersistPendingHouseholdInvite.mockReset();
    mockUsePersistPendingHouseholdInvite.mockReturnValue('ready');
    mockUseAuth.mockReturnValue({
      completeHouseholdInviteAcceptance: mockCompleteHouseholdInviteAcceptance,
      continueWithoutHouseholdInvite: mockContinueWithoutHouseholdInvite,
      householdInviteStatus: 'none',
      status: 'signedIn',
    });
    await i18n.changeLanguage('en');
  });

  it('accepts for an authenticated user, activates the accepted household, and opens Diary', async () => {
    render(
      <AppProviders>
        <InviteTokenRoute />
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.accepted.accept'),
    }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ token });
      expect(mockCompleteHouseholdInviteAcceptance).toHaveBeenCalledWith(acceptedHouseholdId);
      expect(mockRouterReplace).toHaveBeenCalledWith('/diary');
    });
  });

  it('hands a securely persisted invite to the existing OTP sign-in route', () => {
    mockUseAuth.mockReturnValue({
      completeHouseholdInviteAcceptance: mockCompleteHouseholdInviteAcceptance,
      continueWithoutHouseholdInvite: mockContinueWithoutHouseholdInvite,
      householdInviteStatus: 'none',
      status: 'signedOut',
    });

    render(
      <AppProviders>
        <InviteTokenRoute />
      </AppProviders>,
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.accepted.accept'),
    }));

    expect(mockUsePersistPendingHouseholdInvite).toHaveBeenCalledWith(token);
    expect(mockRouterPush).toHaveBeenCalledWith('/sign-in');
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('runs normal bootstrap only after the user chooses the unavailable fallback', async () => {
    mockUseAuth.mockReturnValue({
      completeHouseholdInviteAcceptance: mockCompleteHouseholdInviteAcceptance,
      continueWithoutHouseholdInvite: mockContinueWithoutHouseholdInvite,
      householdInviteStatus: 'unavailable',
      status: 'loading',
    });

    render(
      <AppProviders>
        <InviteTokenRoute />
      </AppProviders>,
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.accepted.create-own'),
    }));

    await waitFor(() => {
      expect(mockContinueWithoutHouseholdInvite).toHaveBeenCalledTimes(1);
      expect(mockRouterReplace).toHaveBeenCalledWith('/diary');
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('maps typed invalid, expired, revoked, or reused acceptance to one unavailable state', async () => {
    mockMutateAsync.mockRejectedValue(new HouseholdInviteError('already_used'));

    render(
      <AppProviders>
        <InviteTokenRoute />
      </AppProviders>,
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.accepted.accept'),
    }));

    await waitFor(() => {
      expect(mockMarkInviteUnavailable).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('invite-accept-state-expired')).toBeTruthy();
    });
    expect(mockCompleteHouseholdInviteAcceptance).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('surfaces an unclassified authenticated acceptance failure without navigating', async () => {
    mockMutateAsync.mockRejectedValue(new Error('synthetic acceptance failure'));

    render(
      <AppProviders>
        <InviteTokenRoute />
      </AppProviders>,
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.accepted.accept'),
    }));

    await waitFor(() => {
      expect(screen.getByTestId('invite-accept-state-load-error')).toBeTruthy();
    });
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('persists and accepts a manually pasted PuppyPlan link without exposing it as text', async () => {
    const replacementToken = 'b'.repeat(64);
    mockRouteToken = 'invalid-route-token';
    mockUsePersistPendingHouseholdInvite.mockImplementation(
      (inviteToken: string | undefined) =>
        inviteToken === replacementToken ? 'ready' : 'invalid',
    );

    render(
      <AppProviders>
        <InviteTokenRoute />
      </AppProviders>,
    );
    const input = screen.getByLabelText(i18n.t('sharing.family.accepted.manual.label'));
    fireEvent.changeText(input, `puppyplan://invite/${replacementToken}`);
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.accepted.manual.submit'),
    }));

    await waitFor(() => {
      expect(mockUsePersistPendingHouseholdInvite).toHaveBeenCalledWith(replacementToken);
    });
    expect(screen.queryByText(replacementToken)).toBeNull();
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.accepted.accept'),
    }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(Object.values(mockMutateAsync.mock.calls[0][0])).toEqual([replacementToken]);
    });
  });

  it('clears invite intent before normal OTP bootstrap after explicit invalid-invite fallback', async () => {
    mockRouteToken = 'invalid-route-token';
    mockUsePersistPendingHouseholdInvite.mockReturnValue('invalid');
    mockUseAuth.mockReturnValue({
      completeHouseholdInviteAcceptance: mockCompleteHouseholdInviteAcceptance,
      continueWithoutHouseholdInvite: mockContinueWithoutHouseholdInvite,
      householdInviteStatus: 'none',
      status: 'signedOut',
    });

    render(
      <AppProviders>
        <InviteTokenRoute />
      </AppProviders>,
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.accepted.create-own'),
    }));

    await waitFor(() => {
      expect(mockClearPendingInvite).toHaveBeenCalledTimes(1);
      expect(mockRouterPush).toHaveBeenCalledWith('/sign-in');
    });
    expect(mockContinueWithoutHouseholdInvite).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('surfaces invite cleanup failure instead of starting normal bootstrap with stale intent', async () => {
    mockRouteToken = 'invalid-route-token';
    mockUsePersistPendingHouseholdInvite.mockReturnValue('invalid');
    mockClearPendingInvite.mockRejectedValue(new Error('synthetic clear failure'));
    mockUseAuth.mockReturnValue({
      completeHouseholdInviteAcceptance: mockCompleteHouseholdInviteAcceptance,
      continueWithoutHouseholdInvite: mockContinueWithoutHouseholdInvite,
      householdInviteStatus: 'none',
      status: 'signedOut',
    });

    render(
      <AppProviders>
        <InviteTokenRoute />
      </AppProviders>,
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('sharing.family.accepted.create-own'),
    }));

    await waitFor(() => {
      expect(screen.getByTestId('invite-create-own-error')).toBeTruthy();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
