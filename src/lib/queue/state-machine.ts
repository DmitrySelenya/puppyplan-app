import { assertNever } from '@/lib/assertNever';

import {
  createStoredQuickLogQueueItem,
  parseQuickLogQueuePermanentErrorCategory,
  parseQuickLogQueueRetryableErrorCategory,
  type QuickLogQueueErrorCategory,
  type QuickLogQueueState,
  type QuickLogStoredQueueItem,
} from './schema';

const allowedTransitions = {
  pending_local: ['sending', 'deleted_before_sync'],
  sending: [
    'server_confirmed',
    'failed_retryable',
    'failed_permanent',
    'deleted_before_sync',
  ],
  server_confirmed: [],
  failed_retryable: ['sending', 'failed_permanent', 'deleted_before_sync'],
  failed_permanent: ['deleted_before_sync'],
  deleted_before_sync: [],
} as const satisfies Record<QuickLogQueueState, readonly QuickLogQueueState[]>;

export type QuickLogQueueTransition =
  | Readonly<{ type: 'mark_sending'; now: string }>
  | Readonly<{ type: 'mark_server_confirmed'; now: string }>
  | Readonly<{
    type: 'mark_failed_retryable';
    errorCategory: QuickLogQueueErrorCategory | string;
    retryAfterAt: string | null;
    now: string;
  }>
  | Readonly<{
    type: 'mark_failed_permanent';
    errorCategory: QuickLogQueueErrorCategory | string;
    now: string;
  }>
  | Readonly<{ type: 'mark_deleted_before_sync'; now: string }>;

export type QuickLogInFlightSuccessResolution =
  | Readonly<{ outcome: 'server_confirmed'; item: QuickLogStoredQueueItem }>
  | Readonly<{ outcome: 'requires_server_cleanup'; item: QuickLogStoredQueueItem }>;

export function canTransitionQuickLogQueueState(
  from: QuickLogQueueState,
  to: QuickLogQueueState,
): boolean {
  return (allowedTransitions[from] as readonly QuickLogQueueState[]).includes(to);
}

export function applyQuickLogQueueTransition(
  item: QuickLogStoredQueueItem,
  transition: QuickLogQueueTransition,
): QuickLogStoredQueueItem {
  switch (transition.type) {
    case 'mark_sending':
      return transitionQueueItem(item, 'sending', {
        last_error_category: null,
        retry_after_at: null,
        updated_at: transition.now,
      });

    case 'mark_server_confirmed':
      return transitionQueueItem(item, 'server_confirmed', {
        last_error_category: null,
        retry_after_at: null,
        updated_at: transition.now,
      });

    case 'mark_failed_retryable':
      return transitionQueueItem(item, 'failed_retryable', {
        retry_count: item.retry_count + 1,
        last_error_category: parseQuickLogQueueRetryableErrorCategory(transition.errorCategory),
        retry_after_at: transition.retryAfterAt,
        updated_at: transition.now,
      });

    case 'mark_failed_permanent':
      return transitionQueueItem(item, 'failed_permanent', {
        retry_count: item.retry_count + 1,
        last_error_category: parseQuickLogQueuePermanentErrorCategory(transition.errorCategory),
        retry_after_at: null,
        updated_at: transition.now,
      });

    case 'mark_deleted_before_sync':
      return transitionQueueItem(item, 'deleted_before_sync', {
        retry_after_at: null,
        updated_at: transition.now,
      });

    default:
      // A new transition type is a compile error here; a bad persisted value throws
      // instead of silently returning undefined.
      return assertNever(transition, 'applyQuickLogQueueTransition');
  }
}

export function resolveQuickLogInFlightSuccess(
  item: QuickLogStoredQueueItem,
  options: Readonly<{ now: string }>,
): QuickLogInFlightSuccessResolution {
  if (item.state === 'deleted_before_sync') {
    return {
      outcome: 'requires_server_cleanup',
      item,
    };
  }

  return {
    outcome: 'server_confirmed',
    item: applyQuickLogQueueTransition(item, {
      type: 'mark_server_confirmed',
      now: options.now,
    }),
  };
}

function transitionQueueItem(
  item: QuickLogStoredQueueItem,
  nextState: QuickLogQueueState,
  updates: Partial<QuickLogStoredQueueItem>,
): QuickLogStoredQueueItem {
  if (!canTransitionQuickLogQueueState(item.state, nextState)) {
    throw new Error(`Invalid Quick Log queue transition: ${item.state} -> ${nextState}`);
  }

  return createStoredQuickLogQueueItem({
    ...item,
    ...updates,
    state: nextState,
  });
}
