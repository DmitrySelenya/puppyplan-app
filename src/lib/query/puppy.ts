import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PuppyProfileInput } from '@/contracts/onboarding';
import { toPuppyProfileWrite } from '@/contracts/onboarding';
import type { ActivePuppyProfile } from '@/contracts/supabase';
import { useAuth } from '@/lib/auth';
import { ensureUserBootstrapped } from '@/lib/auth/bootstrap';
import {
  createSupabasePuppyRepository,
  type SupabasePuppyRepository,
} from '@/lib/supabase/puppies';

import { queryKeys } from './keys';

export type SavePuppyProfileInput = Readonly<{
  profile: PuppyProfileInput;
  puppyId?: string;
}>;

export function useActivePuppyQuery(
  repository: SupabasePuppyRepository = createSupabasePuppyRepository(),
) {
  const auth = useAuth();
  const userId = auth.user?.id ?? '00000000-0000-4000-8000-000000000000';

  return useQuery({
    enabled: auth.status === 'signedIn' && auth.user !== null,
    queryFn: () => repository.selectActivePuppy({ userId }),
    queryKey: queryKeys.puppy.active(userId),
  });
}

export function useSavePuppyProfileMutation(
  repository: SupabasePuppyRepository = createSupabasePuppyRepository(),
) {
  const queryClient = useQueryClient();
  const auth = useAuth();

  return useMutation({
    mutationFn: async (input: SavePuppyProfileInput): Promise<ActivePuppyProfile> => {
      if (auth.status !== 'signedIn' || auth.user === null) {
        throw new Error('puppy_profile_requires_auth');
      }

      const profile = toPuppyProfileWrite(input.profile);

      if (input.puppyId) {
        return repository.updatePuppyProfile({
          ...profile,
          puppyId: input.puppyId,
        });
      }

      const bootstrap = await ensureUserBootstrapped();

      return repository.createPuppyProfile({
        ...profile,
        household_id: bootstrap.household_id,
      });
    },
    onSuccess: (puppy) => {
      if (auth.user) {
        queryClient.setQueryData(queryKeys.puppy.active(auth.user.id), puppy);
      }

      queryClient.setQueryData(queryKeys.puppy.detail(puppy.id), puppy);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.puppy.summary(puppy.household_id, puppy.id),
      });
    },
  });
}

export function isPuppyProfileOwnerRequiredError(error: unknown): boolean {
  return error instanceof Error && error.message === 'puppy_profile_owner_required';
}
