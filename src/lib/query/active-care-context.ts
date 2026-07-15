import { useMemo } from 'react';

import {
  activeCareContextSchema,
  type ActiveCareContext,
} from '@/contracts/onboarding';
import {
  defaultQuickLogTrackerIds,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import type { ActivePuppyProfile } from '@/contracts/supabase';
import { useAuth } from '@/lib/auth';
import { useTodayDate } from '@/lib/datetime/today-date';

import { useActivePuppyQuery } from './puppy';

export type ActiveCareContextResult = Readonly<{
  careContext: ActiveCareContext | null;
  puppy: ActivePuppyProfile | null;
  status: 'loading' | 'empty' | 'ready' | 'error';
}>;

export function useActiveCareContext(): ActiveCareContextResult {
  const auth = useAuth();
  const puppyQuery = useActivePuppyQuery();
  // Overnight routines cross midnight with the app open, so the day has to tick rather than be
  // frozen at mount.
  const todayDate = useTodayDate();

  return useMemo(() => {
    if (auth.status === 'loading' || puppyQuery.isLoading) {
      return {
        careContext: null,
        puppy: null,
        status: 'loading',
      };
    }

    if (puppyQuery.isError) {
      return {
        careContext: null,
        puppy: null,
        status: 'error',
      };
    }

    if (auth.status !== 'signedIn' || auth.user === null || !puppyQuery.data) {
      return {
        careContext: null,
        puppy: null,
        status: 'empty',
      };
    }

    const careContext = createActiveCareContext({
      puppy: puppyQuery.data,
      todayDate,
      userId: auth.user.id,
    });

    return {
      careContext,
      puppy: puppyQuery.data,
      status: careContext === null ? 'empty' : 'ready',
    };
  }, [auth.status, auth.user, puppyQuery.data, puppyQuery.isError, puppyQuery.isLoading, todayDate]);
}

export function createActiveCareContext(input: Readonly<{
  puppy: ActivePuppyProfile;
  todayDate: string;
  userId: string;
}>): ActiveCareContext | null {
  if (input.puppy.deleted_at !== null) {
    return null;
  }

  return activeCareContextSchema.parse({
    authState: 'authenticated',
    householdId: input.puppy.household_id,
    householdRole: input.puppy.household_role,
    puppyId: input.puppy.id,
    selectedTrackerIds: selectedTrackerIdsOrDefault(input.puppy.quick_tracker_ids),
    todayDate: input.todayDate,
    userId: input.userId,
  });
}

function selectedTrackerIdsOrDefault(
  trackerIds: readonly QuickLogTrackerId[] | null,
): readonly QuickLogTrackerId[] {
  return trackerIds && trackerIds.length > 0
    ? trackerIds
    : defaultQuickLogTrackerIds;
}

