import type { QueryClient } from '@tanstack/react-query';

import type { QuickLogSurfaceCareContext } from './quick-log-event-view';
import type { QuickLogCachedEventRow } from './quick-log';

const quickLogIntentOwners = new WeakMap<QueryClient, Map<string, string>>();

export function setQuickLogIntentOwner(
  queryClient: QueryClient,
  input: Readonly<{
    actorId: string;
    clientEventId: string;
    householdId: string;
    puppyId: string;
  }>,
): void {
  const owners = quickLogIntentOwners.get(queryClient) ?? new Map<string, string>();
  owners.set(createQuickLogIntentOwnerKey(input), input.actorId);
  quickLogIntentOwners.set(queryClient, owners);
}

export function clearQuickLogIntentOwner(
  queryClient: QueryClient,
  input: Readonly<{
    clientEventId: string;
    householdId: string;
    puppyId: string;
  }>,
): void {
  quickLogIntentOwners.get(queryClient)?.delete(createQuickLogIntentOwnerKey(input));
}

export function getQuickLogIntentOwner(
  queryClient: QueryClient,
  row: QuickLogCachedEventRow,
): string {
  return quickLogIntentOwners.get(queryClient)?.get(createQuickLogIntentOwnerKey({
    clientEventId: row.client_event_id,
    householdId: row.household_id,
    puppyId: row.puppy_id,
  })) ?? row.created_by;
}

export function isQuickLogRowVisibleToActor(
  queryClient: QueryClient,
  row: QuickLogCachedEventRow,
  userId: string | null,
): boolean {
  return row.localSync === undefined
    || userId === null
    || getQuickLogIntentOwner(queryClient, row) === userId;
}

export function getQuickLogCareContextUserId(
  careContext: QuickLogSurfaceCareContext | null,
): string | null {
  if (
    careContext === null
    || !('userId' in careContext)
    || typeof careContext.userId !== 'string'
  ) {
    return null;
  }

  return careContext.userId;
}

function createQuickLogIntentOwnerKey(input: Readonly<{
  clientEventId: string;
  householdId: string;
  puppyId: string;
}>): string {
  return `${input.householdId}\u0000${input.puppyId}\u0000${input.clientEventId}`;
}
