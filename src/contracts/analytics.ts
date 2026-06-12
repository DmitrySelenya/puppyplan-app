import { z } from 'zod';

import { isQuickLogEventType } from './quick-log';
import { eventTypeSchema } from './supabase';

export const quickLogAnalyticsEventNames = [
  'event_logged',
  'event_save_failed',
  'pending_quick_log_created',
  'pending_quick_log_deleted',
  'duplicate_warning_seen',
  'duplicate_warning_confirmed',
  'undo_used',
  'offline_or_failed_log_recovered',
] as const;

const analyticsConnectionStateSchema = z.enum(['online', 'offline', 'unknown']);
const analyticsSourceSurfaceSchema = z.enum(['quick_log_sheet', 'today', 'timeline']);
const analyticsSaveResultSchema = z.enum(['server_confirmed', 'queued_for_retry']);
const analyticsErrorCategorySchema = z.enum([
  'network_unavailable',
  'request_timeout',
  'server_5xx',
  'rate_limited',
  'auth_refresh_in_progress',
  'permission_denied',
  'invalid_payload',
  'missing_context',
  'expired_context',
  'server_validation_failed',
  'unsupported_schema_version',
  'corrupt_payload',
  'unknown',
  'unknown_retry_exhausted',
]);
const analyticsPendingAgeBucketSchema = z.enum([
  'under_10s',
  'under_60s',
  'one_to_five_minutes',
  'over_five_minutes',
  'unknown',
]);
const analyticsRetryCountBucketSchema = z.enum(['one', 'two', 'three_or_more']);
const analyticsRecoverySurfaceSchema = z.enum([
  'automatic_retry',
  'manual_retry',
  'app_foreground',
]);
const analyticsSecondsAfterLogBucketSchema = z.enum([
  'under_3s',
  'under_10s',
  'over_10s',
  'unknown',
]);
const analyticsTimeSincePreviousBucketSchema = z.enum(['under_3s', 'under_60s']);
const quickLogAnalyticsEventTypeSchema = eventTypeSchema.refine(isQuickLogEventType, {
  message: 'Quick Log analytics events must use a Quick Log routine event type.',
});

const eventLoggedSchema = z.object({
  name: z.literal('event_logged'),
  properties: z.object({
    connection_state: analyticsConnectionStateSchema,
    event_type: quickLogAnalyticsEventTypeSchema,
    save_result: analyticsSaveResultSchema,
    source_surface: analyticsSourceSurfaceSchema,
  }).strict(),
}).strict();

const eventSaveFailedSchema = z.object({
  name: z.literal('event_save_failed'),
  properties: z.object({
    connection_state: analyticsConnectionStateSchema,
    error_category: analyticsErrorCategorySchema,
    event_type: quickLogAnalyticsEventTypeSchema,
  }).strict(),
}).strict();

const pendingQuickLogCreatedSchema = z.object({
  name: z.literal('pending_quick_log_created'),
  properties: z.object({
    connection_state: analyticsConnectionStateSchema,
    event_type: quickLogAnalyticsEventTypeSchema,
  }).strict(),
}).strict();

const pendingQuickLogDeletedSchema = z.object({
  name: z.literal('pending_quick_log_deleted'),
  properties: z.object({
    event_type: quickLogAnalyticsEventTypeSchema,
    pending_age_bucket: analyticsPendingAgeBucketSchema,
  }).strict(),
}).strict();

const duplicateWarningSeenSchema = z.object({
  name: z.literal('duplicate_warning_seen'),
  properties: z.object({
    event_type: quickLogAnalyticsEventTypeSchema,
    time_since_previous_bucket: analyticsTimeSincePreviousBucketSchema,
  }).strict(),
}).strict();

const duplicateWarningConfirmedSchema = z.object({
  name: z.literal('duplicate_warning_confirmed'),
  properties: z.object({
    event_type: quickLogAnalyticsEventTypeSchema,
  }).strict(),
}).strict();

const undoUsedSchema = z.object({
  name: z.literal('undo_used'),
  properties: z.object({
    event_type: quickLogAnalyticsEventTypeSchema,
    seconds_after_log_bucket: analyticsSecondsAfterLogBucketSchema,
  }).strict(),
}).strict();

const offlineOrFailedLogRecoveredSchema = z.object({
  name: z.literal('offline_or_failed_log_recovered'),
  properties: z.object({
    event_type: quickLogAnalyticsEventTypeSchema,
    recovery_surface: analyticsRecoverySurfaceSchema,
    retry_count_bucket: analyticsRetryCountBucketSchema,
  }).strict(),
}).strict();

export const quickLogAnalyticsEventSchema = z.discriminatedUnion('name', [
  eventLoggedSchema,
  eventSaveFailedSchema,
  pendingQuickLogCreatedSchema,
  pendingQuickLogDeletedSchema,
  duplicateWarningSeenSchema,
  duplicateWarningConfirmedSchema,
  undoUsedSchema,
  offlineOrFailedLogRecoveredSchema,
]);

export type QuickLogAnalyticsEvent = z.infer<typeof quickLogAnalyticsEventSchema>;
export type QuickLogRecoverySurface = z.infer<typeof analyticsRecoverySurfaceSchema>;
export type QuickLogSourceSurface = z.infer<typeof analyticsSourceSurfaceSchema>;

export function createQuickLogAnalyticsEvent(input: unknown): QuickLogAnalyticsEvent {
  return quickLogAnalyticsEventSchema.parse(input);
}
