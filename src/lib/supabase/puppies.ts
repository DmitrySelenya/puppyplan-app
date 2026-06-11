import {
  activePuppyProfileSchema,
  puppyProfileSchema,
  householdMembershipRoleSchema,
  uuidSchema,
  type ActivePuppyProfile,
  type PuppyProfile,
} from '@/contracts/supabase';
import type { PuppyProfileWrite } from '@/contracts/onboarding';
import { z } from 'zod';

import { getSupabaseClient } from './client';

export type PuppyProfileInsert = PuppyProfileWrite & Readonly<{
  household_id: string;
}>;

export type PuppyProfileUpdate = PuppyProfileWrite & Readonly<{
  puppyId: string;
}>;

export type SupabasePuppyRepository = Readonly<{
  createPuppyProfile(insert: PuppyProfileInsert): Promise<ActivePuppyProfile>;
  selectActivePuppy(input: Readonly<{ userId: string }>): Promise<ActivePuppyProfile | null>;
  updatePuppyProfile(update: PuppyProfileUpdate): Promise<ActivePuppyProfile>;
}>;

type PuppyClient = Readonly<{
  insertPuppyProfile(insert: PuppyProfileInsert): PromiseLike<PuppyClientResponse>;
  selectActiveMembership(userId: string): PromiseLike<PuppyClientResponse>;
  selectActivePuppy(householdId: string): PromiseLike<PuppyClientResponse>;
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

const activeMembershipSelectColumns = [
  'household_id',
  'role',
].join(',');

const activeHouseholdMembershipSchema = z.object({
  household_id: uuidSchema,
  role: householdMembershipRoleSchema,
}).strict();

export function createSupabasePuppyRepository(
  client: PuppyClient = createDefaultPuppyClient(),
): SupabasePuppyRepository {
  return {
    createPuppyProfile: async (insert) => {
      const response = await client.insertPuppyProfile(insert);

      if (response.error) {
        throw new Error('puppy_profile_create_failed');
      }

      return parseActivePuppyProfile(response.data, 'owner');
    },
    selectActivePuppy: async ({ userId }) => {
      const membershipResponse = await client.selectActiveMembership(userId);

      if (membershipResponse.error) {
        throw new Error('puppy_profile_read_failed');
      }

      if (membershipResponse.data === null) {
        return null;
      }

      const membership = activeHouseholdMembershipSchema.parse(membershipResponse.data);
      const response = await client.selectActivePuppy(membership.household_id);

      if (response.error) {
        throw new Error('puppy_profile_read_failed');
      }

      return response.data === null
        ? null
        : parseActivePuppyProfile(response.data, membership.role);
    },
    updatePuppyProfile: async (update) => {
      const response = await client.updatePuppyProfile(update);

      if (response.error) {
        throw new Error(isPermissionDeniedResponse(response.error)
          ? 'puppy_profile_owner_required'
          : 'puppy_profile_update_failed');
      }

      if (response.data === null) {
        throw new Error('puppy_profile_owner_required');
      }

      // Current puppy update RLS is owner-only; derive this from membership if that policy widens.
      return parseActivePuppyProfile(response.data, 'owner');
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
    selectActiveMembership: (userId) => getSupabaseClient()
      .from('household_membership')
      .select(activeMembershipSelectColumns)
      .eq('user_id', userId)
      .not('accepted_at', 'is', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    selectActivePuppy: (householdId) => getSupabaseClient()
      .from('puppy')
      .select(puppySelectColumns)
      .eq('household_id', householdId)
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

function parseActivePuppyProfile(
  data: unknown,
  householdRole: ActivePuppyProfile['household_role'],
): ActivePuppyProfile {
  return activePuppyProfileSchema.parse({
    ...parsePuppyProfile(data),
    household_role: householdRole,
  });
}

function isPermissionDeniedResponse(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && String(error.code) === '42501';
}
