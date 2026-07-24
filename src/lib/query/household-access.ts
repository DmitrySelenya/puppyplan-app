import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import type {
  AcceptInviteResponse,
  CreateInviteResponse,
  InviteRecord,
} from '@/contracts/supabase';
import {
  createSupabaseHouseholdAccessRepository,
  type SupabaseHouseholdAccessRepository,
} from '@/lib/supabase/household-access';

import { queryKeys } from './keys';

export type HouseholdInvitesQueryOptions = Readonly<{
  enabled?: boolean;
  queryFn(): Promise<readonly InviteRecord[]>;
  queryKey: readonly unknown[];
}>;

type HouseholdInviteInvalidationClient = Pick<QueryClient, 'invalidateQueries'>;

export type CreateHouseholdInviteMutationOptions = Readonly<{
  mutationFn(input: void): Promise<CreateInviteResponse>;
  onSuccess(result: CreateInviteResponse, input: void): Promise<void>;
}>;

export type AcceptHouseholdInviteMutationOptions = Readonly<{
  mutationFn(input: Readonly<{ token: string }>): Promise<AcceptInviteResponse>;
  onSuccess(
    result: AcceptInviteResponse,
    input: Readonly<{ token: string }>,
  ): Promise<void>;
}>;

export type RevokeHouseholdInviteMutationOptions = Readonly<{
  mutationFn(input: Readonly<{ inviteId: string }>): Promise<boolean>;
  onSuccess(result: boolean, input: Readonly<{ inviteId: string }>): Promise<void>;
}>;

export function createHouseholdInvitesQueryOptions(
  input: Readonly<{
    householdId: string;
    repository: Pick<SupabaseHouseholdAccessRepository, 'listPendingInvites'>;
  }>,
): HouseholdInvitesQueryOptions {
  return {
    queryFn: () => input.repository.listPendingInvites({ householdId: input.householdId }),
    queryKey: queryKeys.sharing.householdInvites(input.householdId),
  };
}

export function getInactiveHouseholdInvitesQueryOptions(): HouseholdInvitesQueryOptions & Readonly<{
  enabled: false;
}> {
  return {
    enabled: false,
    queryFn: async () => [],
    queryKey: ['sharing', 'household-invites', 'inactive'] as const,
  };
}

export function useHouseholdInvitesQuery(
  householdId: string | undefined,
  repository: Pick<SupabaseHouseholdAccessRepository, 'listPendingInvites'> =
  createSupabaseHouseholdAccessRepository(),
) {
  const options = householdId === undefined
    ? getInactiveHouseholdInvitesQueryOptions()
    : createHouseholdInvitesQueryOptions({ householdId, repository });

  return useQuery({
    enabled: options.enabled,
    queryFn: options.queryFn,
    queryKey: options.queryKey,
  });
}

export function useCreateHouseholdInviteMutation(
  repository: Pick<SupabaseHouseholdAccessRepository, 'createInvite'> =
  createSupabaseHouseholdAccessRepository(),
) {
  const queryClient = useQueryClient();
  const options = createCreateHouseholdInviteMutationOptions({ queryClient, repository });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function useAcceptHouseholdInviteMutation(
  repository: Pick<SupabaseHouseholdAccessRepository, 'acceptInvite'> =
  createSupabaseHouseholdAccessRepository(),
) {
  const queryClient = useQueryClient();
  const options = createAcceptHouseholdInviteMutationOptions({ queryClient, repository });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function useRevokeHouseholdInviteMutation(
  repository: Pick<SupabaseHouseholdAccessRepository, 'revokeInvite'> =
  createSupabaseHouseholdAccessRepository(),
) {
  const queryClient = useQueryClient();
  const options = createRevokeHouseholdInviteMutationOptions({ queryClient, repository });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function createCreateHouseholdInviteMutationOptions(
  dependencies: Readonly<{
    queryClient?: HouseholdInviteInvalidationClient;
    repository: Pick<SupabaseHouseholdAccessRepository, 'createInvite'>;
  }>,
): CreateHouseholdInviteMutationOptions {
  return {
    mutationFn: () => dependencies.repository.createInvite(),
    onSuccess: async () => invalidateHouseholdInvites(dependencies.queryClient),
  };
}

export function createAcceptHouseholdInviteMutationOptions(
  dependencies: Readonly<{
    queryClient?: HouseholdInviteInvalidationClient;
    repository: Pick<SupabaseHouseholdAccessRepository, 'acceptInvite'>;
  }>,
): AcceptHouseholdInviteMutationOptions {
  return {
    mutationFn: (input) => dependencies.repository.acceptInvite(input),
    onSuccess: async () => invalidateHouseholdInvites(dependencies.queryClient),
  };
}

export function createRevokeHouseholdInviteMutationOptions(
  dependencies: Readonly<{
    queryClient?: HouseholdInviteInvalidationClient;
    repository: Pick<SupabaseHouseholdAccessRepository, 'revokeInvite'>;
  }>,
): RevokeHouseholdInviteMutationOptions {
  return {
    mutationFn: (input) => dependencies.repository.revokeInvite(input),
    onSuccess: async () => invalidateHouseholdInvites(dependencies.queryClient),
  };
}

async function invalidateHouseholdInvites(
  queryClient: HouseholdInviteInvalidationClient | undefined,
): Promise<void> {
  await queryClient?.invalidateQueries({
    queryKey: queryKeys.sharing.householdInvitesRoot(),
  });
}
