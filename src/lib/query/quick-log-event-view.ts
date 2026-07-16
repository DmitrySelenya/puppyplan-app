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
import {
  eventPayloadSchemas,
  eventPayloadSchemasV2,
  jsonObjectSchema,
  type HouseholdMembershipRole,
} from '@/contracts/supabase';
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
  /**
   * Resolves once the delete has settled. Fact rows fire and forget; the Diary's un-check awaits it
   * so a second tap cannot fire a second delete against the row the first one is already removing.
   */
  onDelete?: (request: QuickLogEventDeleteRequest) => void | Promise<void>;
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
  durationMinutes?: number;
  eventType: QuickLogEventType;
  householdId: string;
  note?: string;
  occurredAtLabel: string;
  puppyId: string;
  retryCount: number;
  status: 'pending' | 'failed' | 'synced';
  statusLabel: string;
  title: string;
  /** `prose` when the title is text the owner wrote rather than a label we generated. */
  titleKind: 'label' | 'prose';
  todayDate: string;
}>;

export function getQuickLogTrackerLabelKey(trackerId: QuickLogDetailTrackerId): I18nKey {
  if (trackerId === 'training' || trackerId === 'observation') {
    return `quick-log.details.tabs.${trackerId}`;
  }

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

  const readback = getValidatedV2Readback(row);
  // Owner directive (2026-07-14): a quick note is its own content — an Observation whose payload
  // carries only a note reads as that note, not as a generic tracker label above a preview.
  const noteAsTitle = row.event_type === 'observation'
    && readback.title === undefined
    && readback.note !== undefined;

  return {
    // PUP-15 production Quick Log is gated until active care context can resolve row.created_by.
    // Replace this with timeline.actor-template in the active-context follow-up.
    actorLabel: input.t('timeline.actor-you'),
    clientEventId: row.client_event_id,
    ...(readback.durationMinutes === undefined
      ? {}
      : { durationMinutes: readback.durationMinutes }),
    eventType: row.event_type,
    householdId: row.household_id,
    ...(readback.note === undefined || noteAsTitle ? {} : { note: readback.note }),
    occurredAtLabel: formatEventTime(row.occurred_at, input.locale),
    puppyId: row.puppy_id,
    retryCount: row.localSync?.retryCount ?? 0,
    status,
    statusLabel: getQuickLogStatusLabel(status, input.t),
    title: readback.title
      ?? (noteAsTitle ? readback.note : undefined)
      ?? (readback.sleepAction === undefined
        ? input.t(titleKey)
        : input.t(sleepActionLabelKeys[readback.sleepAction])),
    // Only a note standing in for a title is unbounded prose. A typed observation title is capped
    // at 80 characters and is a title by intent, so it keeps the display face.
    titleKind: noteAsTitle ? 'prose' : 'label',
    todayDate: input.todayDate,
  };
}

type QuickLogV2Readback = Readonly<{
  durationMinutes?: number;
  note?: string;
  sleepAction?: 'start' | 'wake' | 'retrospective';
  title?: string;
}>;

function getValidatedV2Readback(row: QuickLogCachedEventRow): QuickLogV2Readback {
  if (row.payload_version !== 2) {
    return {};
  }

  if (row.event_type === 'observation') {
    const result = eventPayloadSchemasV2.observation.safeParse(row.payload);
    return result.success ? { note: result.data.note, title: result.data.title } : {};
  }

  if (row.event_type === 'sleep') {
    const result = eventPayloadSchemasV2.sleep.safeParse(row.payload);
    return result.success
      ? {
          durationMinutes: result.data.duration_minutes,
          note: result.data.note,
          sleepAction: result.data.action,
        }
      : {};
  }

  if (row.event_type === 'training') {
    const result = eventPayloadSchemasV2.training.safeParse(row.payload);
    return result.success ? { note: result.data.note } : {};
  }

  if (row.event_type === 'potty') {
    const result = eventPayloadSchemasV2.potty.safeParse(row.payload);
    return result.success ? { note: result.data.note } : {};
  }

  if (row.event_type === 'feeding') {
    const result = eventPayloadSchemasV2.feeding.safeParse(row.payload);
    return result.success ? { note: result.data.note } : {};
  }

  if (row.event_type === 'walk') {
    const result = eventPayloadSchemasV2.walk.safeParse(row.payload);
    return result.success ? { note: result.data.note } : {};
  }

  if (row.event_type === 'zoomies') {
    const result = eventPayloadSchemasV2.zoomies.safeParse(row.payload);
    return result.success ? { note: result.data.note } : {};
  }

  return {};
}

export function getQuickLogTrackerIdForEventRow(
  row: QuickLogCachedEventRow,
): QuickLogTrackerId | null {
  if (!isQuickLogEventType(row.event_type)) {
    return null;
  }

  if (row.event_type === 'potty') {
    const payloadResult = getPayloadSchema(row).potty.safeParse(row.payload);

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
    const payloadResult = getPayloadSchema(row).sleep.safeParse(row.payload);

    if (!payloadResult.success) {
      return null;
    }

    if (row.payload_version === 1 && !('sleep_kind' in payloadResult.data
      && payloadResult.data.sleep_kind === 'nap')) return null;

    return 'sleep';
  }

  if (row.event_type === 'walk') {
    const payloadResult = getPayloadSchema(row).walk.safeParse(row.payload);

    return payloadResult.success ? 'walk' : null;
  }

  if (row.event_type === 'zoomies') {
    const payloadResult = getPayloadSchema(row).zoomies.safeParse(row.payload);

    return payloadResult.success ? 'zoomies' : null;
  }

  if (row.event_type === 'feeding') {
    const payloadResult = getPayloadSchema(row).feeding.safeParse(row.payload);

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
    const payloadResult = getPayloadSchema(row).potty.safeParse(row.payload);

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

  if (row.event_type === 'training') {
    return row.payload_version === 2
      && eventPayloadSchemasV2.training.safeParse(row.payload).success
      ? 'quick-log.details.tabs.training'
      : null;
  }

  if (row.event_type === 'observation') {
    return row.payload_version === 2
      && eventPayloadSchemasV2.observation.safeParse(row.payload).success
      ? 'quick-log.details.tabs.observation'
      : null;
  }

  const trackerId = getQuickLogTrackerIdForEventRow(row);

  return trackerId === null ? null : trackerLabelKeys[trackerId];
}

function getPayloadSchema(row: QuickLogCachedEventRow) {
  return row.payload_version === 2 ? eventPayloadSchemasV2 : eventPayloadSchemas;
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

const sleepActionLabelKeys = {
  retrospective: 'quick-log.details.sleep.action.retrospective',
  start: 'quick-log.details.sleep.action.start',
  wake: 'quick-log.details.sleep.action.wake',
} as const satisfies Record<'start' | 'wake' | 'retrospective', I18nKey>;

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
