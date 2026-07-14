import { router } from 'expo-router';

import type { QuickLogDetailDraft } from '@/contracts/quick-log';
import {
  QuickNoteScreen,
  type QuickNoteStatus,
} from '@/features/quick-log/screens/QuickNoteScreen';
import { closeModalRoute } from '@/lib/navigation/modal-close';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useQuickLogMutationPort } from '@/lib/query/quick-log';

export function ConnectedQuickNoteScreen() {
  const activeCare = useActiveCareContext();
  const quickLogMutation = useQuickLogMutationPort();
  const careContext = activeCare.careContext;
  const createDetailed = quickLogMutation.mutation?.createDetailed;
  const canWrite = careContext !== null
    && careContext.householdRole !== 'viewer'
    && createDetailed !== undefined;

  const save = (draft: QuickLogDetailDraft): Promise<void> => {
    if (!canWrite) {
      return Promise.reject(new Error('quick-note write is unavailable'));
    }

    return createDetailed({
      detailDraft: draft,
      householdId: careContext.householdId,
      occurredAt: draft.occurredAt ?? new Date().toISOString(),
      puppyId: careContext.puppyId,
      todayDate: careContext.todayDate,
      trackerId: draft.trackerId,
    }).then(() => undefined);
  };

  return (
    <QuickNoteScreen
      onClose={() => {
        closeModalRoute(router);
      }}
      onSave={save}
      status={getQuickNoteStatus({ activeCare, canWrite, quickLogMutation })}
    />
  );
}

function getQuickNoteStatus(input: Readonly<{
  activeCare: ReturnType<typeof useActiveCareContext>;
  canWrite: boolean;
  quickLogMutation: ReturnType<typeof useQuickLogMutationPort>;
}>): QuickNoteStatus {
  if (input.activeCare.status === 'loading') {
    return 'loading';
  }

  if (!input.canWrite) {
    return 'permission-denied';
  }

  if (input.quickLogMutation.status === 'loading') {
    return 'pending-write';
  }

  return 'ready';
}
