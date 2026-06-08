import { useMemo } from 'react';

import {
  activeCareContextSchema,
  type ActiveCareContext,
} from '@/contracts/onboarding';
import {
  defaultQuickLogTrackerIds,
} from '@/contracts/quick-log';
import type { PuppyProfile } from '@/contracts/supabase';
import { useAuth } from '@/lib/auth';

import { useActivePuppyQuery } from './puppy';

export type ActiveCareContextResult = Readonly<{
  careContext: ActiveCareContext | null;
  puppy: PuppyProfile | null;
  status: 'loading' | 'empty' | 'ready';
}>;

export function useActiveCareContext(): ActiveCareContextResult {
  const auth = useAuth();
  const puppyQuery = useActivePuppyQuery();
  const todayDate = getTodayDate();

  return useMemo(() => {
    if (auth.status === 'loading' || puppyQuery.isLoading) {
      return {
        careContext: null,
        puppy: null,
        status: 'loading',
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
  }, [auth.status, auth.user, puppyQuery.data, puppyQuery.isLoading, todayDate]);
}

export function createActiveCareContext(input: Readonly<{
  puppy: PuppyProfile;
  todayDate: string;
  userId: string;
}>): ActiveCareContext | null {
  if (input.puppy.deleted_at !== null) {
    return null;
  }

  return activeCareContextSchema.parse({
    authState: 'authenticated',
    householdId: input.puppy.household_id,
    puppyId: input.puppy.id,
    selectedTrackerIds: input.puppy.quick_tracker_ids ?? defaultQuickLogTrackerIds,
    todayDate: input.todayDate,
    userId: input.userId,
  });
}

export function getTodayDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
