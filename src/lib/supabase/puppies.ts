import {
  puppyProfileSchema,
  type PuppyProfile,
} from '@/contracts/supabase';
import type { PuppyProfileWrite } from '@/contracts/onboarding';

import { getSupabaseClient } from './client';

export type PuppyProfileInsert = PuppyProfileWrite & Readonly<{
  household_id: string;
}>;

export type PuppyProfileUpdate = PuppyProfileWrite & Readonly<{
  puppyId: string;
}>;

export type SupabasePuppyRepository = Readonly<{
  createPuppyProfile(insert: PuppyProfileInsert): Promise<PuppyProfile>;
  selectActivePuppy(): Promise<PuppyProfile | null>;
  updatePuppyProfile(update: PuppyProfileUpdate): Promise<PuppyProfile>;
}>;

type PuppyClient = Readonly<{
  insertPuppyProfile(insert: PuppyProfileInsert): PromiseLike<PuppyClientResponse>;
  selectActivePuppy(): PromiseLike<PuppyClientResponse>;
  updatePuppyProfile(update: PuppyProfileUpdate): PromiseLike<PuppyClientResponse>;
}>;

type PuppyClientResponse = Readonly<{
  data: unknown;
  error: unknown;
}>;

const puppySelectColumns = [
  'id',
  'household_id',
  'name',
  'birth_date',
  'age_weeks_estimate',
  'quick_tracker_ids',
  'created_at',
  'updated_at',
  'deleted_at',
].join(',');

export function createSupabasePuppyRepository(
  client: PuppyClient = createDefaultPuppyClient(),
): SupabasePuppyRepository {
  return {
    createPuppyProfile: async (insert) => {
      const response = await client.insertPuppyProfile(insert);

      if (response.error) {
        throw new Error('puppy_profile_create_failed');
      }

      return parsePuppyProfile(response.data);
    },
    selectActivePuppy: async () => {
      const response = await client.selectActivePuppy();

      if (response.error) {
        throw new Error('puppy_profile_read_failed');
      }

      return response.data === null ? null : parsePuppyProfile(response.data);
    },
    updatePuppyProfile: async (update) => {
      const response = await client.updatePuppyProfile(update);

      if (response.error) {
        throw new Error('puppy_profile_update_failed');
      }

      return parsePuppyProfile(response.data);
    },
  };
}

function createDefaultPuppyClient(): PuppyClient {
  return {
    insertPuppyProfile: (insert) => getSupabaseClient()
      .from('puppy')
      .insert(insert)
      .select(puppySelectColumns)
      .maybeSingle(),
    selectActivePuppy: () => getSupabaseClient()
      .from('puppy')
      .select(puppySelectColumns)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    updatePuppyProfile: ({ puppyId, ...profile }) => getSupabaseClient()
      .from('puppy')
      .update(profile)
      .eq('id', puppyId)
      .select(puppySelectColumns)
      .maybeSingle(),
  };
}

function parsePuppyProfile(data: unknown): PuppyProfile {
  return puppyProfileSchema.parse(data);
}
