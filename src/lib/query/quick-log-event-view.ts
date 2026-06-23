import {
  isQuickLogEventType,
  getQuickLogDetailTrackerIdForEventType,
  type QuickLogDetailTrackerId,
  type QuickLogEventType,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import type {
  QuickLogRecoverySurface,
  QuickLogSourceSurface,
} from '@/contracts/analytics';
import { eventPayloadSchemas, jsonObjectSchema, type HouseholdMembershipRole } from '@/contracts/supabase';
import type { AppTranslate, I18nKey } from '@/lib/i18n';

import type { QuickLogCachedEventRow } from './quick-log';

export type QuickLogSurfaceCareContext = Readonly<{
  authState: 'authenticated';
  householdId: string;
  householdRole: HouseholdMembershipRole;
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
  householdId: string;
  puppyId: string;
  status: QuickLogEventView['status'];
  todayDate: string;
}>;

export type QuickLogEventEditRequest = Readonly<{
  clientEventId: string;
  eventType: QuickLogEventType;
  householdId: string;
  puppyId: string;
  todayDate: string;
  trackerId: QuickLogDetailTrackerId;
}>;

export type QuickLogEventActionHandlers = Readonly<{
  onDelete?: (request: QuickLogEventDeleteRequest) => void;
  onEdit?: (request: QuickLogEventEditRequest) => void;
  onRetry?: (
    clientEventId: string,
    recoverySurface: QuickLogRecoverySurface,
    sourceSurface: QuickLogSourceSurface,
  ) => void;
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

export function getQuickLogTrackerIdForEventRow(
  row: QuickLogCachedEventRow,
): QuickLogTrackerId | null {
  if (!isQuickLogEventType(row.event_type)) {
    return null;
  }

  if (row.event_type === 'potty') {
    const payloadResult = eventPayloadSchemas.potty.safeParse(row.payload);

    if (payloadResult.success) {
      return 'potty';
    }

    const legacyPayloadResult = legacyPottyEventPayloadSchema.safeParse(row.payload);

    if (!legacyPayloadResult.success) {
      return null;
    }

    return 'potty';
  }

  if (row.event_type === 'sleep') {
    const payloadResult = eventPayloadSchemas.sleep.safeParse(row.payload);

    if (!payloadResult.success || payloadResult.data.sleep_kind !== 'nap') {
      return null;
    }

    return 'sleep';
  }

  if (row.event_type === 'walk') {
    const payloadResult = eventPayloadSchemas.walk.safeParse(row.payload);

    return payloadResult.success ? 'walk' : null;
  }

  if (row.event_type === 'zoomies') {
    const payloadResult = eventPayloadSchemas.zoomies.safeParse(row.payload);

    return payloadResult.success ? 'zoomies' : null;
  }

  if (row.event_type === 'feeding') {
    const payloadResult = eventPayloadSchemas.feeding.safeParse(row.payload);

    return payloadResult.success ? 'feeding' : null;
  }

  return null;
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
    householdId: view.householdId,
    puppyId: view.puppyId,
    status: view.status,
    todayDate: view.todayDate,
  };
}

export function createQuickLogEditRequest(view: QuickLogEventView): QuickLogEventEditRequest | null {
  const trackerId = getQuickLogDetailTrackerIdForEventType(view.eventType);

  if (trackerId === null) {
    return null;
  }

  return {
    clientEventId: view.clientEventId,
    eventType: view.eventType,
    householdId: view.householdId,
    puppyId: view.puppyId,
    todayDate: view.todayDate,
    trackerId,
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

    if (payloadResult.success) {
      return pottySubtypeLabelKeys[payloadResult.data.subtype];
    }

    const legacyPayloadResult = legacyPottyEventPayloadSchema.safeParse(row.payload);

    if (legacyPayloadResult.success) {
      const quickAction = legacyPayloadResult.data.quick_action;

      if (isLegacyPottyQuickAction(quickAction)) {
        return legacyPottyQuickActionLabelKeys[quickAction];
      }
    }
  }

  const trackerId = getQuickLogTrackerIdForEventRow(row);

  return trackerId === null ? null : trackerLabelKeys[trackerId];
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
  feeding: 'quick-log.trackers.feeding',
  potty: 'quick-log.trackers.potty',
  sleep: 'quick-log.trackers.sleep',
  walk: 'quick-log.trackers.walk',
  zoomies: 'quick-log.trackers.zoomies',
} as const satisfies Record<QuickLogTrackerId, I18nKey>;

const pottySubtypeLabelKeys = {
  inside: 'quick-log.trackers.potty-inside',
  outside: 'quick-log.trackers.potty-outside',
  poop: 'quick-log.trackers.potty-poop',
} as const satisfies Record<'inside' | 'outside' | 'poop', I18nKey>;

type LegacyPottyQuickAction = 'pee_inside' | 'pee_outside' | 'poop';

const legacyPottyQuickActionLabelKeys = {
  pee_inside: 'quick-log.trackers.potty-inside',
  pee_outside: 'quick-log.trackers.potty-outside',
  poop: 'quick-log.trackers.potty-poop',
} as const satisfies Record<LegacyPottyQuickAction, I18nKey>;

function isLegacyPottyQuickAction(value: unknown): value is LegacyPottyQuickAction {
  return value === 'pee_inside' || value === 'pee_outside' || value === 'poop';
}

const legacyPottyEventPayloadSchema = jsonObjectSchema.refine(
  (payload) =>
    payload.quick_action === 'pee_outside'
    || payload.quick_action === 'pee_inside'
    || payload.quick_action === 'poop',
);
