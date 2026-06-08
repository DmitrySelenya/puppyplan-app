import {
  isQuickLogEventType,
  type QuickLogEventType,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import type { QuickLogRecoverySurface } from '@/contracts/analytics';
import { eventPayloadSchemas } from '@/contracts/supabase';
import type { AppTranslate, I18nKey } from '@/lib/i18n';

import type { QuickLogCachedEventRow } from './quick-log';

export type QuickLogSurfaceCareContext = Readonly<{
  authState: 'authenticated';
  householdId: string;
  puppyId: string;
  selectedTrackerIds?: readonly QuickLogTrackerId[];
  todayDate: string;
}>;

export type QuickLogEventUndoRequest = Readonly<{
  clientEventId: string;
  eventType: QuickLogEventType;
  householdId: string;
  puppyId: string;
  todayDate: string;
}>;

export type QuickLogEventDeleteRequest = Readonly<{
  clientEventId: string;
  eventType: QuickLogEventType;
}>;

export type QuickLogEventActionHandlers = Readonly<{
  onDelete?: (request: QuickLogEventDeleteRequest) => void;
  onRetry?: (clientEventId: string, recoverySurface: QuickLogRecoverySurface) => void;
  onUndo?: (request: QuickLogEventUndoRequest) => void;
}>;

export type QuickLogEventView = Readonly<{
  actorLabel: string;
  clientEventId: string;
  eventType: QuickLogEventType;
  householdId: string;
  occurredAtLabel: string;
  puppyId: string;
  retryCount: number;
  status: 'pending' | 'failed' | 'synced';
  statusLabel: string;
  title: string;
  todayDate: string;
}>;

export function getQuickLogTrackerLabelKey(trackerId: QuickLogTrackerId): I18nKey {
  return trackerLabelKeys[trackerId];
}

export function createQuickLogEventView(
  row: QuickLogCachedEventRow,
  input: Readonly<{
    locale?: string;
    t: AppTranslate;
    todayDate: string;
  }>,
): QuickLogEventView | null {
  if (!isQuickLogEventType(row.event_type)) {
    return null;
  }

  const status = getQuickLogEventStatus(row);
  const titleKey = getQuickLogEventLabelKey(row);

  if (titleKey === null) {
    return null;
  }

  return {
    // PUP-15 production Quick Log is gated until active care context can resolve row.created_by.
    // Replace this with timeline.actor-template in the active-context follow-up.
    actorLabel: input.t('timeline.actor-you'),
    clientEventId: row.client_event_id,
    eventType: row.event_type,
    householdId: row.household_id,
    occurredAtLabel: formatEventTime(row.occurred_at, input.locale),
    puppyId: row.puppy_id,
    retryCount: row.localSync?.retryCount ?? 0,
    status,
    statusLabel: getQuickLogStatusLabel(status, input.t),
    title: input.t(titleKey),
    todayDate: input.todayDate,
  };
}

export function createQuickLogUndoRequest(view: QuickLogEventView): QuickLogEventUndoRequest {
  return {
    clientEventId: view.clientEventId,
    eventType: view.eventType,
    householdId: view.householdId,
    puppyId: view.puppyId,
    todayDate: view.todayDate,
  };
}

export function createQuickLogDeleteRequest(view: QuickLogEventView): QuickLogEventDeleteRequest {
  return {
    clientEventId: view.clientEventId,
    eventType: view.eventType,
  };
}

function getQuickLogEventStatus(row: QuickLogCachedEventRow): QuickLogEventView['status'] {
  if (
    row.localSync?.state === 'failed_retryable'
    || row.localSync?.state === 'failed_permanent'
  ) {
    return 'failed';
  }

  if (row.localSync?.state === 'pending_local' || row.localSync?.state === 'sending') {
    return 'pending';
  }

  return 'synced';
}

function getQuickLogStatusLabel(
  status: QuickLogEventView['status'],
  t: AppTranslate,
): string {
  if (status === 'pending') {
    return t('timeline.pills.pending');
  }

  if (status === 'failed') {
    return t('timeline.pills.failed');
  }

  return t('timeline.pills.synced');
}

function getQuickLogEventLabelKey(row: QuickLogCachedEventRow): I18nKey | null {
  if (row.event_type === 'potty') {
    const payloadResult = eventPayloadSchemas.potty.safeParse(row.payload);

    if (!payloadResult.success) {
      return null;
    }

    if (payloadResult.data.quick_action === 'pee_outside') {
      return 'quick-log.trackers.potty-outside';
    }

    if (payloadResult.data.quick_action === 'pee_inside') {
      return 'quick-log.trackers.potty-inside';
    }

    return 'quick-log.trackers.potty-poop';
  }

  if (row.event_type === 'sleep') {
    const payloadResult = eventPayloadSchemas.sleep.safeParse(row.payload);

    if (!payloadResult.success) {
      return null;
    }

    return payloadResult.data.sleep_kind === 'nap'
      ? 'quick-log.trackers.sleep'
      : null;
  }

  if (row.event_type === 'zoomies') {
    const payloadResult = eventPayloadSchemas.zoomies.safeParse(row.payload);

    if (!payloadResult.success) {
      return null;
    }

    return 'quick-log.trackers.zoomies';
  }

  if (row.event_type === 'training') {
    const payloadResult = eventPayloadSchemas.training.safeParse(row.payload);

    if (!payloadResult.success) {
      return null;
    }

    return 'quick-log.trackers.training';
  }

  if (row.event_type === 'feeding') {
    const payloadResult = eventPayloadSchemas.feeding.safeParse(row.payload);

    if (!payloadResult.success) {
      return null;
    }

    return payloadResult.data.amount === 'meal'
      ? 'quick-log.trackers.feeding'
      : null;
  }

  return null;
}

function formatEventTime(occurredAt: string, locale?: string): string {
  const date = new Date(occurredAt);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const trackerLabelKeys = {
  feeding_meal: 'quick-log.trackers.feeding',
  potty_pee_inside: 'quick-log.trackers.potty-inside',
  potty_pee_outside: 'quick-log.trackers.potty-outside',
  potty_poop: 'quick-log.trackers.potty-poop',
  sleep_nap: 'quick-log.trackers.sleep',
  training: 'quick-log.trackers.training',
  zoomies: 'quick-log.trackers.zoomies',
} as const satisfies Record<QuickLogTrackerId, I18nKey>;
