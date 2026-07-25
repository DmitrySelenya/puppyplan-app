import { useEffect, useState } from 'react';

import { householdInviteTokenSchema } from '@/contracts/supabase';

import {
  pendingHouseholdInviteController,
  type PendingHouseholdInviteController,
} from './pendingHouseholdInvite';

export type PendingHouseholdInvitePersistenceStatus =
  | 'error'
  | 'invalid'
  | 'loading'
  | 'ready';

export function usePersistPendingHouseholdInvite(
  inviteToken: string | undefined,
  controller: Pick<PendingHouseholdInviteController, 'persist'> =
  pendingHouseholdInviteController,
): PendingHouseholdInvitePersistenceStatus {
  const [status, setStatus] =
    useState<PendingHouseholdInvitePersistenceStatus>('loading');

  useEffect(() => {
    let active = true;
    const parsedToken = householdInviteTokenSchema.safeParse(inviteToken);

    if (!parsedToken.success) {
      setStatus('invalid');
      return () => {
        active = false;
      };
    }

    setStatus('loading');
    void controller.persist(parsedToken.data)
      .then(() => {
        if (active) {
          setStatus('ready');
        }
      })
      .catch(() => {
        if (active) {
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [controller, inviteToken]);

  return status;
}
