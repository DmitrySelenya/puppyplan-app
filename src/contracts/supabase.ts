import { z } from 'zod';

export type { Database } from './database.types';

export const householdMembershipRoles = ['owner', 'caregiver', 'viewer'] as const;
export const inviteRoles = ['caregiver', 'viewer'] as const;
export const shareRoles = ['trainer_viewer'] as const;
export const shareScopes = [
  'routine_summary',
  'selected_timeline_range',
  'training_notes',
  'health_summary',
  'puppy_profile',
] as const;
export const eventTypes = [
  'potty',
  'feeding',
  'sleep',
  'zoomies',
  'training',
  'health_record_reference',
] as const;

export const reminderOccurrenceStatuses = [
  'scheduled',
  'completed',
  'skipped',
  'missed',
  'canceled',
] as const;
export const notificationChannels = ['push', 'email'] as const;
export const notificationDeliveryStatuses = [
  'queued',
  'sent',
  'delivered',
  'failed',
  'suppressed',
] as const;
export const devicePlatforms = ['ios', 'android'] as const;
export const entitlementStatuses = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'expired',
] as const;
export const contentLocales = ['en', 'ru', 'es'] as const;
export const quickLogQueueStates = [
  'pending_local',
  'sending',
  'server_confirmed',
  'failed_retryable',
  'failed_permanent',
  'deleted_before_sync',
] as const;

export const supabaseMvpTableNames = [
  'household',
  'household_membership',
  'puppy',
  'event_log',
  'health_record',
  'reminder',
  'reminder_occurrence',
  'invite',
  'share_link',
  'share_scope',
  'device_push_token',
  'notification_preference',
  'notification_delivery_log',
  'trusted_sitter_completion_event',
  'subscription_entitlement',
  'media_asset',
  'content_version',
] as const;

export const appPrivateMvpTableNames = ['invite_secret', 'share_link_secret'] as const;
export const localOnlyContractNames = ['minimal_quick_log_queue_item'] as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

export const jsonObjectSchema: z.ZodType<Record<string, JsonValue>> = z.record(jsonValueSchema);

export const uuidSchema = z.string().uuid();
export const timestampSchema = z.string().datetime({ offset: true });
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidCalendarDate, {
  message: 'Date must be a valid YYYY-MM-DD calendar date.',
});
export const nonEmptyStringSchema = z.string().trim().min(1);
export const boundedPayloadStringSchema = z.string().trim().min(1).max(64);
export const hashSchema = z.string().regex(/^sha256:[A-Za-z0-9._:-]+$/);
export const tokenLast4Schema = z.string().regex(/^[A-Za-z0-9_-]{4}$/);
// Upgrade path: split into a z.union(...) when payload_version 2 is introduced.
export const payloadVersionSchema = z.literal(1);
export const positiveVersionSchema = z.number().int().positive();

export const householdMembershipRoleSchema = z.enum(householdMembershipRoles);
export const inviteRoleSchema = z.enum(inviteRoles);
export const shareRoleSchema = z.enum(shareRoles);
export const shareScopeSchema = z.enum(shareScopes);
export const eventTypeSchema = z.enum(eventTypes);
export const reminderOccurrenceStatusSchema = z.enum(reminderOccurrenceStatuses);
export const notificationChannelSchema = z.enum(notificationChannels);
export const notificationDeliveryStatusSchema = z.enum(notificationDeliveryStatuses);
export const devicePlatformSchema = z.enum(devicePlatforms);
export const entitlementStatusSchema = z.enum(entitlementStatuses);
export const contentLocaleSchema = z.enum(contentLocales);
export const quickLogQueueStateSchema = z.enum(quickLogQueueStates);
export const healthRecordSourceSchema = z.enum(['template', 'manual', 'confirmed']);

export const pottyEventPayloadSchema = z.object({
  quick_action: z.enum(['pee_outside', 'pee_inside', 'poop']),
}).strict();

export const feedingEventPayloadSchema = z.object({
  amount: z.enum(['meal', 'snack', 'water']),
}).strict();

export const sleepEventPayloadSchema = z.object({
  sleep_kind: z.enum(['nap', 'overnight']),
  duration_minutes: z.number().int().min(1).max(1440).optional(),
}).strict();

export const zoomiesEventPayloadSchema = z.object({
  intensity: z.enum(['low', 'medium', 'high']).optional(),
}).strict();

export const trainingEventPayloadSchema = z.object({
  topic: z.enum(['recall', 'sit', 'crate', 'leash', 'settling', 'other']),
  duration_bucket: z.enum(['short', 'medium', 'long']).optional(),
}).strict();

export const healthRecordReferenceEventPayloadSchema = z.object({
  health_record_id: uuidSchema,
}).strict();

export const eventPayloadSchemas = {
  potty: pottyEventPayloadSchema,
  feeding: feedingEventPayloadSchema,
  sleep: sleepEventPayloadSchema,
  zoomies: zoomiesEventPayloadSchema,
  training: trainingEventPayloadSchema,
  health_record_reference: healthRecordReferenceEventPayloadSchema,
} as const;

export const householdRecordSchema = z.object({
  id: uuidSchema,
  created_by: uuidSchema,
  display_name: nonEmptyStringSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  deleted_at: timestampSchema.nullable(),
}).strict();

export const householdMembershipRecordSchema = z.object({
  id: uuidSchema,
  household_id: uuidSchema,
  user_id: uuidSchema,
  role: householdMembershipRoleSchema,
  invited_by: uuidSchema.nullable(),
  accepted_at: timestampSchema.nullable(),
  revoked_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict();

export const puppyProfileSchema = z.object({
  id: uuidSchema,
  household_id: uuidSchema,
  name: nonEmptyStringSchema,
  birth_date: dateSchema.nullable(),
  age_weeks_estimate: z.number().int().min(0).max(520).nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  deleted_at: timestampSchema.nullable(),
}).strict().refine(
  (puppy) => puppy.birth_date !== null || puppy.age_weeks_estimate !== null,
  {
    message: 'Either birth_date or age_weeks_estimate is required.',
    path: ['birth_date'],
  },
);

export const eventLogRecordSchema = z.object({
  id: uuidSchema,
  puppy_id: uuidSchema,
  household_id: uuidSchema,
  created_by: uuidSchema,
  client_event_id: nonEmptyStringSchema,
  event_type: eventTypeSchema,
  occurred_at: timestampSchema,
  payload_version: payloadVersionSchema,
  payload: jsonObjectSchema,
  version: positiveVersionSchema,
  deleted_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict();

export const eventLogInsertSchema = z.object({
  puppy_id: uuidSchema,
  household_id: uuidSchema,
  created_by: uuidSchema,
  client_event_id: nonEmptyStringSchema,
  event_type: eventTypeSchema,
  occurred_at: timestampSchema,
  payload_version: payloadVersionSchema,
  payload: jsonObjectSchema,
}).strict().superRefine(validateEventPayload);

export const healthRecordSchema = z.object({
  id: uuidSchema,
  puppy_id: uuidSchema,
  record_type: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  status: nonEmptyStringSchema,
  source: healthRecordSourceSchema,
  scheduled_for: dateSchema.nullable(),
  completed_at: timestampSchema.nullable(),
  provider_name: nonEmptyStringSchema.nullable(),
  notes: z.string().nullable(),
  version: positiveVersionSchema,
  updated_by: uuidSchema.nullable(),
  updated_at: timestampSchema,
  created_at: timestampSchema,
  deleted_at: timestampSchema.nullable(),
}).strict();

export const reminderSchema = z.object({
  id: uuidSchema,
  puppy_id: uuidSchema,
  created_by: uuidSchema,
  assigned_to: uuidSchema.nullable(),
  reminder_type: nonEmptyStringSchema,
  schedule_rule: jsonObjectSchema,
  timezone: nonEmptyStringSchema,
  quiet_hours: jsonObjectSchema.nullable(),
  enabled: z.boolean(),
  trusted_sitter_visible: z.boolean(),
  version: positiveVersionSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
  deleted_at: timestampSchema.nullable(),
}).strict();

export const reminderOccurrenceSchema = z.object({
  id: uuidSchema,
  reminder_id: uuidSchema,
  scheduled_for: timestampSchema,
  local_notification_id: nonEmptyStringSchema.nullable(),
  status: reminderOccurrenceStatusSchema,
  action_taken: nonEmptyStringSchema.nullable(),
  acted_by: uuidSchema.nullable(),
  acted_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict();

export const inviteRecordSchema = z.object({
  id: uuidSchema,
  household_id: uuidSchema,
  email_hash: hashSchema.nullable(),
  token_last4: tokenLast4Schema.nullable(),
  role: inviteRoleSchema,
  expires_at: timestampSchema,
  accepted_at: timestampSchema.nullable(),
  accepted_by: uuidSchema.nullable(),
  revoked_at: timestampSchema.nullable(),
  revoked_by: uuidSchema.nullable(),
  created_by: uuidSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict();

export const createInviteRequestSchema = z.object({
  household_id: uuidSchema,
  role: inviteRoleSchema,
  recipient_email_hash: hashSchema,
  expires_at: timestampSchema,
}).strict();

export const routineSummaryShareScopeInputSchema = z.object({
  scope: z.literal('routine_summary'),
}).strict();

export const trainingNotesShareScopeInputSchema = z.object({
  scope: z.literal('training_notes'),
}).strict();

export const healthSummaryShareScopeInputSchema = z.object({
  scope: z.literal('health_summary'),
}).strict();

export const puppyProfileShareScopeInputSchema = z.object({
  scope: z.literal('puppy_profile'),
}).strict();

export const selectedTimelineShareScopeInputSchema = z.object({
  scope: z.literal('selected_timeline_range'),
  timeline_from: dateSchema,
  timeline_to: dateSchema,
  selected_event_types: z.array(eventTypeSchema).min(1).nullable().optional(),
}).strict().refine((scope) => scope.timeline_from <= scope.timeline_to, {
  message: 'selected_timeline_range requires an ordered timeline_from/timeline_to range.',
  path: ['timeline_from'],
});

export const shareScopeInputSchema = z.union([
  routineSummaryShareScopeInputSchema,
  selectedTimelineShareScopeInputSchema,
  trainingNotesShareScopeInputSchema,
  healthSummaryShareScopeInputSchema,
  puppyProfileShareScopeInputSchema,
]);

export const shareLinkRecordSchema = z.object({
  id: uuidSchema,
  household_id: uuidSchema,
  puppy_id: uuidSchema,
  role: shareRoleSchema,
  expires_at: timestampSchema,
  accepted_at: timestampSchema.nullable(),
  accepted_by: uuidSchema.nullable(),
  revoked_at: timestampSchema.nullable(),
  revoked_by: uuidSchema.nullable(),
  created_by: uuidSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict();

export const shareScopeRecordSchema = z.object({
  id: uuidSchema,
  share_link_id: uuidSchema,
  scope: shareScopeSchema,
  timeline_from: dateSchema.nullable(),
  timeline_to: dateSchema.nullable(),
  selected_event_types: z.array(eventTypeSchema).nullable(),
  created_at: timestampSchema,
}).strict().refine(
  (scope) =>
    scope.scope !== 'selected_timeline_range'
    || (scope.timeline_from !== null && scope.timeline_to !== null && scope.timeline_from <= scope.timeline_to),
  {
    message: 'selected_timeline_range requires an ordered timeline_from/timeline_to range.',
    path: ['timeline_from'],
  },
);

export const createShareLinkRequestSchema = z.object({
  household_id: uuidSchema,
  puppy_id: uuidSchema,
  role: shareRoleSchema,
  scopes: z.array(shareScopeInputSchema)
    .min(1)
    .max(shareScopes.length)
    .refine((scopes) => new Set(scopes.map((scope) => scope.scope)).size === scopes.length, {
      message: 'Scopes must be unique.',
    }),
  expires_at: timestampSchema,
}).strict();

export const devicePushTokenSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  device_id: nonEmptyStringSchema,
  platform: devicePlatformSchema,
  expo_push_token: nonEmptyStringSchema.nullable(),
  apns_token: nonEmptyStringSchema.nullable(),
  fcm_token: nonEmptyStringSchema.nullable(),
  enabled: z.boolean(),
  last_seen_at: timestampSchema,
  revoked_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict().refine(
  (token) => token.expo_push_token !== null || token.apns_token !== null || token.fcm_token !== null,
  {
    message: 'At least one push token value is required.',
    path: ['expo_push_token'],
  },
);

export const notificationPreferenceSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  household_id: uuidSchema,
  reminder_push_enabled: z.boolean(),
  trusted_sitter_completion_push_enabled: z.boolean(),
  quiet_hours: jsonObjectSchema.nullable(),
  timezone: nonEmptyStringSchema,
  updated_at: timestampSchema,
  created_at: timestampSchema,
}).strict();

export const notificationDeliveryLogSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema.nullable(),
  household_id: uuidSchema.nullable(),
  notification_type: nonEmptyStringSchema,
  channel: notificationChannelSchema,
  provider_message_id: nonEmptyStringSchema.nullable(),
  delivery_status: notificationDeliveryStatusSchema,
  error_category: nonEmptyStringSchema.nullable(),
  created_at: timestampSchema,
}).strict();

export const trustedSitterCompletionEventSchema = z.object({
  id: uuidSchema,
  household_id: uuidSchema,
  puppy_id: uuidSchema,
  completed_by: uuidSchema,
  source_event_id: uuidSchema.nullable(),
  completion_type: nonEmptyStringSchema,
  created_at: timestampSchema,
}).strict();

export const subscriptionEntitlementSchema = z.object({
  id: uuidSchema,
  household_id: uuidSchema,
  provider: nonEmptyStringSchema,
  provider_customer_id_hash: hashSchema.nullable(),
  entitlement: nonEmptyStringSchema,
  status: entitlementStatusSchema,
  renews_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict();

export const mediaAssetSchema = z.object({
  id: uuidSchema,
  household_id: uuidSchema,
  puppy_id: uuidSchema.nullable(),
  uploaded_by: uuidSchema,
  storage_bucket: nonEmptyStringSchema,
  storage_path: nonEmptyStringSchema,
  media_type: nonEmptyStringSchema,
  created_at: timestampSchema,
  deleted_at: timestampSchema.nullable(),
}).strict();

export const contentVersionSchema = z.object({
  id: uuidSchema,
  content_key: nonEmptyStringSchema,
  locale: contentLocaleSchema,
  version: nonEmptyStringSchema,
  checksum: nonEmptyStringSchema.nullable(),
  published_at: timestampSchema,
  created_at: timestampSchema,
}).strict();

export const minimalQuickLogQueueItemSchema = z.object({
  client_event_id: nonEmptyStringSchema,
  household_id: uuidSchema,
  puppy_id: uuidSchema,
  event_type: eventTypeSchema,
  payload_version: payloadVersionSchema,
  payload: jsonObjectSchema,
  occurred_at: timestampSchema,
  state: quickLogQueueStateSchema,
  retry_count: z.number().int().min(0),
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict().superRefine(validateEventPayload);

export type HouseholdMembershipRole = z.infer<typeof householdMembershipRoleSchema>;
export type InviteRole = z.infer<typeof inviteRoleSchema>;
export type ShareRole = z.infer<typeof shareRoleSchema>;
export type ShareScope = z.infer<typeof shareScopeSchema>;
export type EventType = z.infer<typeof eventTypeSchema>;
export type EventPayloadSchemas = typeof eventPayloadSchemas;
export type EventLogInsert = z.infer<typeof eventLogInsertSchema>;
export type MinimalQuickLogQueueItem = z.infer<typeof minimalQuickLogQueueItemSchema>;
export type CreateInviteRequest = z.infer<typeof createInviteRequestSchema>;
export type CreateShareLinkRequest = z.infer<typeof createShareLinkRequestSchema>;
export type ShareScopeInput = z.infer<typeof shareScopeInputSchema>;
export type PuppyProfile = z.infer<typeof puppyProfileSchema>;
export type HealthRecord = z.infer<typeof healthRecordSchema>;
export type Reminder = z.infer<typeof reminderSchema>;
export type ReminderOccurrence = z.infer<typeof reminderOccurrenceSchema>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
export type NotificationDeliveryLog = z.infer<typeof notificationDeliveryLogSchema>;
export type SubscriptionEntitlement = z.infer<typeof subscriptionEntitlementSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type ContentVersion = z.infer<typeof contentVersionSchema>;

function isValidCalendarDate(value: string): boolean {
  const [yearValue, monthValue, dayValue] = value.split('-').map(Number);
  const date = new Date(Date.UTC(yearValue, monthValue - 1, dayValue));

  return date.getUTCFullYear() === yearValue
    && date.getUTCMonth() === monthValue - 1
    && date.getUTCDate() === dayValue;
}

function validateEventPayload(
  event: { event_type: EventType; payload: Record<string, JsonValue> },
  context: z.RefinementCtx,
): void {
  const payloadResult = eventPayloadSchemas[event.event_type].safeParse(event.payload);

  if (payloadResult.success) {
    return;
  }

  for (const issue of payloadResult.error.issues) {
    context.addIssue({
      ...issue,
      path: ['payload', ...issue.path],
    });
  }
}
