import { useQuery } from '@tanstack/react-query';

import type { InviteRecord } from '@/contracts/supabase';
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
