BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(126);

CREATE SCHEMA IF NOT EXISTS tests;

CREATE OR REPLACE FUNCTION tests.as_auth(user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;
END;
$$;

CREATE OR REPLACE FUNCTION tests.as_anon()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  SET LOCAL ROLE anon;
END;
$$;

CREATE OR REPLACE FUNCTION tests.as_postgres()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', '', true);
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_event(
  target_household_id uuid,
  target_puppy_id uuid,
  target_user_id uuid,
  target_client_event_id text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.event_log (
    household_id,
    puppy_id,
    created_by,
    client_event_id,
    event_type,
    occurred_at,
    payload_version,
    payload
  )
  VALUES (
    target_household_id,
    target_puppy_id,
    target_user_id,
    target_client_event_id,
    'zoomies',
    now(),
    1,
    '{"intensity":"medium"}'::jsonb
  );

  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_share_link(
  target_household_id uuid,
  target_puppy_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.share_link (
    household_id,
    puppy_id,
    role,
    expires_at,
    created_by
  )
  VALUES (
    target_household_id,
    target_puppy_id,
    'trainer_viewer',
    now() + interval '7 days',
    target_user_id
  );

  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_update_share_scope_selected_event_types(
  target_share_scope_id uuid,
  target_selected_event_types public.event_type[]
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.share_scope
  SET selected_event_types = target_selected_event_types
  WHERE id = target_share_scope_id;

  RETURN true;
EXCEPTION
  WHEN check_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_invite(
  target_household_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.invite (
    household_id,
    email_hash,
    role,
    expires_at,
    created_by
  )
  VALUES (
    target_household_id,
    'sha256:invite-recipient',
    'caregiver',
    now() + interval '7 days',
    target_user_id
  );

  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

-- These helpers intentionally catch only policy/constraint failures. Unexpected
-- exception classes should keep failing the pgTAP run instead of being masked.
CREATE OR REPLACE FUNCTION tests.try_insert_household(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.household (created_by, display_name)
  VALUES (target_user_id, 'Synthetic household');

  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_household_membership(
  target_household_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.household_membership (
    household_id,
    user_id,
    role,
    accepted_at
  )
  VALUES (
    target_household_id,
    target_user_id,
    'owner',
    now()
  );

  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_device_push_token(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.device_push_token (
    user_id,
    device_id,
    platform,
    expo_push_token
  )
  VALUES (
    target_user_id,
    'direct-client-device',
    'ios',
    'synthetic-delivery-token-direct'
  );

  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_trusted_sitter_completion(
  target_household_id uuid,
  target_puppy_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.trusted_sitter_completion_event (
    household_id,
    puppy_id,
    completed_by,
    completion_type
  )
  VALUES (
    target_household_id,
    target_puppy_id,
    target_user_id,
    'feeding_done'
  );

  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_update_event_identity(
  target_event_id uuid,
  target_household_id uuid,
  target_puppy_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.event_log
  SET
    household_id = target_household_id,
    puppy_id = target_puppy_id,
    created_by = target_user_id
  WHERE id = target_event_id;

  RETURN FOUND;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_soft_delete_event_log(
  target_event_id uuid,
  target_household_id uuid,
  target_puppy_id uuid,
  target_deleted_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  touched_count integer;
BEGIN
  UPDATE public.event_log
  SET deleted_at = target_deleted_at
  WHERE id = target_event_id
    AND household_id = target_household_id
    AND puppy_id = target_puppy_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS touched_count = ROW_COUNT;

  IF touched_count <> 1 THEN
    RETURN false;
  END IF;

  PERFORM 1
  FROM public.event_log
  WHERE id = target_event_id
    AND household_id = target_household_id
    AND puppy_id = target_puppy_id
    AND deleted_at = target_deleted_at;

  RETURN FOUND;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_restore_event_log(
  target_event_id uuid,
  target_household_id uuid,
  target_puppy_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  touched_count integer;
BEGIN
  PERFORM 1
  FROM public.event_log
  WHERE id = target_event_id
    AND household_id = target_household_id
    AND puppy_id = target_puppy_id
    AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.event_log
  SET deleted_at = null
  WHERE id = target_event_id
    AND household_id = target_household_id
    AND puppy_id = target_puppy_id
    AND deleted_at IS NOT NULL;

  GET DIAGNOSTICS touched_count = ROW_COUNT;

  IF touched_count <> 1 THEN
    RETURN false;
  END IF;

  PERFORM 1
  FROM public.event_log
  WHERE id = target_event_id
    AND household_id = target_household_id
    AND puppy_id = target_puppy_id
    AND deleted_at IS NULL;

  RETURN FOUND;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_update_puppy_quick_tracker_ids(
  target_puppy_id uuid,
  tracker_ids text[]
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.puppy
  SET quick_tracker_ids = tracker_ids
  WHERE id = target_puppy_id;

  RETURN FOUND;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_media_asset(
  target_household_id uuid,
  target_puppy_id uuid,
  target_user_id uuid,
  target_storage_path text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.media_asset (
    household_id,
    puppy_id,
    uploaded_by,
    storage_bucket,
    storage_path,
    media_type
  )
  VALUES (
    target_household_id,
    target_puppy_id,
    target_user_id,
    'private-media',
    target_storage_path,
    'image/jpeg'
  );

  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation OR foreign_key_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_health_record(
  target_puppy_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.health_record (
    puppy_id,
    record_type,
    title,
    status,
    source,
    updated_by
  )
  VALUES (
    target_puppy_id,
    'vaccine',
    'Viewer write attempt',
    'scheduled',
    'manual',
    target_user_id
  );

  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_soft_delete_health_record(
  target_record_id uuid,
  target_puppy_id uuid,
  target_deleted_at timestamptz,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  touched_count integer;
BEGIN
  UPDATE public.health_record
  SET
    deleted_at = target_deleted_at,
    updated_by = target_user_id
  WHERE id = target_record_id
    AND puppy_id = target_puppy_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS touched_count = ROW_COUNT;

  IF touched_count <> 1 THEN
    RETURN false;
  END IF;

  PERFORM 1
  FROM public.health_record
  WHERE id = target_record_id
    AND puppy_id = target_puppy_id
    AND deleted_at = target_deleted_at;

  RETURN FOUND;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_restore_health_record(
  target_record_id uuid,
  target_puppy_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  touched_count integer;
BEGIN
  PERFORM 1
  FROM public.health_record
  WHERE id = target_record_id
    AND puppy_id = target_puppy_id
    AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.health_record
  SET
    deleted_at = null,
    updated_by = target_user_id
  WHERE id = target_record_id
    AND puppy_id = target_puppy_id
    AND deleted_at IS NOT NULL;

  GET DIAGNOSTICS touched_count = ROW_COUNT;

  IF touched_count <> 1 THEN
    RETURN false;
  END IF;

  PERFORM 1
  FROM public.health_record
  WHERE id = target_record_id
    AND puppy_id = target_puppy_id
    AND deleted_at IS NULL;

  RETURN FOUND;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_soft_delete_reminder(
  target_reminder_id uuid,
  target_puppy_id uuid,
  target_deleted_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  touched_count integer;
BEGIN
  UPDATE public.reminder
  SET deleted_at = target_deleted_at
  WHERE id = target_reminder_id
    AND puppy_id = target_puppy_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS touched_count = ROW_COUNT;

  IF touched_count <> 1 THEN
    RETURN false;
  END IF;

  PERFORM 1
  FROM public.reminder
  WHERE id = target_reminder_id
    AND puppy_id = target_puppy_id
    AND deleted_at = target_deleted_at;

  RETURN FOUND;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_reminder_occurrence(target_reminder_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.reminder_occurrence (
    reminder_id,
    scheduled_for,
    status
  )
  VALUES (
    target_reminder_id,
    now() + interval '1 hour',
    'scheduled'
  );

  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_notification_preference(
  target_user_id uuid,
  target_household_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.notification_preference (
    user_id,
    household_id,
    reminder_push_enabled,
    trusted_sitter_completion_push_enabled,
    timezone
  )
  VALUES (
    target_user_id,
    target_household_id,
    true,
    true,
    'UTC'
  );

  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation OR unique_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_update_entitlement(target_entitlement_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.subscription_entitlement
  SET status = 'active'
  WHERE id = target_entitlement_id;

  RETURN FOUND;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_update_notification_preference_identity(
  target_preference_id uuid,
  target_user_id uuid,
  target_household_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.notification_preference
  SET
    user_id = target_user_id,
    household_id = target_household_id
  WHERE id = target_preference_id;

  RETURN FOUND;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    RETURN false;
END;
$$;

GRANT USAGE ON SCHEMA tests TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated;

SELECT tests.as_postgres();

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'owner@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'caregiver@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'viewer@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000104', 'authenticated', 'authenticated', 'outsider@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000105', 'authenticated', 'authenticated', 'revoked@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000106', 'authenticated', 'authenticated', 'trainer@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000107', 'authenticated', 'authenticated', 'second-owner@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

INSERT INTO public.household (id, created_by, display_name)
VALUES
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Test household'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000107', 'Second test household');

INSERT INTO public.household_membership (
  id,
  household_id,
  user_id,
  role,
  accepted_at,
  revoked_at
)
VALUES
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'owner', now(), null),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000102', 'caregiver', now(), null),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000103', 'viewer', now(), null),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000105', 'caregiver', now(), now()),
  ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000107', 'owner', now(), null),
  ('00000000-0000-4000-8000-000000000306', '00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000102', 'caregiver', now(), null);

INSERT INTO public.puppy (
  id,
  household_id,
  name,
  age_weeks_estimate
)
VALUES
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000201', 'Test puppy', 12),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000202', 'Second test puppy', 8),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000201', 'Sibling test puppy', 10);

INSERT INTO public.event_log (
  id,
  household_id,
  puppy_id,
  created_by,
  client_event_id,
  event_type,
  occurred_at,
  payload_version,
  payload
)
VALUES
  (
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000101',
    'evt_seed_001',
    'potty',
    now() - interval '1 hour',
    1,
    '{"quick_action":"pee_outside"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000502',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000101',
    'evt_seed_002',
    'training',
    now() - interval '30 minutes',
    1,
    '{"topic":"recall","duration_bucket":"short"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000503',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000403',
    '00000000-0000-4000-8000-000000000101',
    'evt_seed_sibling_001',
    'feeding',
    now() - interval '20 minutes',
    1,
    '{"amount":"meal"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000506',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000101',
    'evt_seed_observation_001',
    'observation',
    now() - interval '10 minutes',
    2,
    '{"title":"Synthetic observation","note":"Private synthetic context"}'::jsonb
  );

INSERT INTO public.health_record (
  id,
  puppy_id,
  record_type,
  title,
  status,
  source,
  scheduled_for,
  completed_at,
  provider_name,
  notes,
  updated_by
)
VALUES (
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000401',
  'vaccine',
  'DHPP',
  'needs_vet_review',
  'template',
  current_date + 7,
  null,
  'redacted-provider',
  'redacted-note',
  '00000000-0000-4000-8000-000000000101'
);

INSERT INTO public.reminder (
  id,
  puppy_id,
  created_by,
  reminder_type,
  schedule_rule,
  timezone
)
VALUES (
  '00000000-0000-4000-8000-000000001001',
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000101',
  'feeding',
  '{"interval":"daily"}'::jsonb,
  'UTC'
);

INSERT INTO public.invite (
  id,
  household_id,
  email_hash,
  token_last4,
  role,
  expires_at,
  created_by
)
VALUES (
  '00000000-0000-4000-8000-000000000702',
  '00000000-0000-4000-8000-000000000201',
  'sha256:invite-recipient',
  '0002',
  'caregiver',
  now() + interval '7 days',
  '00000000-0000-4000-8000-000000000101'
);

INSERT INTO app_private.invite_secret (
  invite_id,
  token_hash,
  token_last4
)
VALUES (
  '00000000-0000-4000-8000-000000000702',
  'argon2id:invite-hash',
  '0002'
);

INSERT INTO public.share_link (
  id,
  household_id,
  puppy_id,
  role,
  expires_at,
  accepted_at,
  accepted_by,
  created_by
)
VALUES (
  '00000000-0000-4000-8000-000000000701',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000401',
  'trainer_viewer',
  now() + interval '7 days',
  now(),
  '00000000-0000-4000-8000-000000000106',
  '00000000-0000-4000-8000-000000000101'
);

INSERT INTO public.share_scope (
  id,
  share_link_id,
  scope,
  timeline_from,
  timeline_to,
  selected_event_types
)
VALUES
  ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000701', 'routine_summary', null, null, null),
  (
    '00000000-0000-4000-8000-000000000802',
    '00000000-0000-4000-8000-000000000701',
    'selected_timeline_range',
    current_date - 1,
    current_date + 1,
    ARRAY['potty'::public.event_type, 'training'::public.event_type, 'zoomies'::public.event_type]
  ),
  ('00000000-0000-4000-8000-000000000803', '00000000-0000-4000-8000-000000000701', 'training_notes', null, null, null),
  ('00000000-0000-4000-8000-000000000804', '00000000-0000-4000-8000-000000000701', 'health_summary', null, null, null),
  ('00000000-0000-4000-8000-000000000805', '00000000-0000-4000-8000-000000000701', 'puppy_profile', null, null, null);

INSERT INTO app_private.share_link_secret (
  share_link_id,
  token_hash,
  token_last4
)
VALUES (
  '00000000-0000-4000-8000-000000000701',
  'argon2id:share-hash',
  '0001'
);

INSERT INTO public.notification_preference (
  id,
  user_id,
  household_id,
  reminder_push_enabled,
  trusted_sitter_completion_push_enabled,
  timezone
)
VALUES (
  '00000000-0000-4000-8000-000000000912',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000201',
  true,
  true,
  'UTC'
);

INSERT INTO public.device_push_token (
  id,
  user_id,
  device_id,
  platform,
  expo_push_token,
  enabled,
  last_seen_at
)
VALUES
  ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000101', 'device-owner', 'ios', 'synthetic-delivery-token-owner', true, now()),
  ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000104', 'device-outsider', 'ios', 'synthetic-delivery-token-outsider', true, now());

INSERT INTO public.notification_delivery_log (
  id,
  user_id,
  household_id,
  notification_type,
  channel,
  provider_message_id,
  delivery_status,
  error_category
)
VALUES (
  '00000000-0000-4000-8000-000000000911',
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000201',
  'reminder',
  'push',
  'msg_001',
  'sent',
  null
);

INSERT INTO public.media_asset (
  id,
  household_id,
  puppy_id,
  uploaded_by,
  storage_bucket,
  storage_path,
  media_type
)
VALUES (
  '00000000-0000-4000-8000-000000000913',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000101',
  'private-media',
  'households/h1/synthetic-photo.jpg',
  'image/jpeg'
);

INSERT INTO public.subscription_entitlement (
  id,
  household_id,
  provider,
  provider_customer_id_hash,
  entitlement,
  status,
  renews_at
)
VALUES (
  '00000000-0000-4000-8000-000000000921',
  '00000000-0000-4000-8000-000000000201',
  'test-provider',
  'sha256:customer-hash',
  'mvp',
  'trialing',
  now() + interval '14 days'
);

SELECT results_eq(
  $$SELECT count(*)::int FROM pg_constraint WHERE conname = 'invite_email_hash_format'$$,
  ARRAY[1],
  'invite email hash format constraint exists'
);

SELECT results_eq(
  $$SELECT count(*)::int FROM pg_constraint WHERE conname = 'invite_secret_token_hash_format'$$,
  ARRAY[1],
  'invite token hash format constraint exists'
);

SELECT results_eq(
  $$SELECT count(*)::int FROM pg_constraint WHERE conname = 'share_link_secret_token_hash_format'$$,
  ARRAY[1],
  'share token hash format constraint exists'
);

SELECT results_eq(
  $$SELECT count(*)::int FROM pg_constraint WHERE conname = 'subscription_entitlement_provider_customer_hash_format'$$,
  ARRAY[1],
  'provider customer hash format constraint exists'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000104');
SELECT results_eq(
  'SELECT count(*)::int FROM public.event_log',
  ARRAY[0],
  'non-member cannot read household events'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_link_metadata()',
  ARRAY[0],
  'non-member cannot read accepted-share metadata RPC rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_routine_summary()',
  ARRAY[0],
  'non-member cannot read routine summary projection RPC rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_selected_timeline()',
  ARRAY[0],
  'non-member cannot read selected timeline projection RPC rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_training_notes()',
  ARRAY[0],
  'non-member cannot read training notes projection RPC rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_health_summary()',
  ARRAY[0],
  'non-member cannot read health summary projection RPC rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_puppy_profile()',
  ARRAY[0],
  'non-member cannot read puppy profile projection RPC rows'
);

SELECT is(
  tests.try_update_puppy_quick_tracker_ids(
    '00000000-0000-4000-8000-000000000401',
    ARRAY['feeding', 'walk']::text[]
  ),
  false,
  'non-member cannot update puppy selected quick trackers'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000103');
SELECT is(
  tests.try_insert_event(
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000103',
    'evt_viewer_denied'
  ),
  false,
  'viewer cannot insert routine events'
);

SELECT is(
  tests.try_update_puppy_quick_tracker_ids(
    '00000000-0000-4000-8000-000000000401',
    ARRAY['feeding', 'walk']::text[]
  ),
  false,
  'viewer cannot update puppy selected quick trackers'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000102');
SELECT is(
  tests.try_insert_event(
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000102',
    'evt_caregiver_allowed'
  ),
  true,
  'caregiver can insert routine events'
);

SELECT is(
  tests.try_update_puppy_quick_tracker_ids(
    '00000000-0000-4000-8000-000000000401',
    ARRAY['feeding', 'walk']::text[]
  ),
  false,
  'caregiver cannot update puppy selected quick trackers'
);

SELECT is(
  tests.try_update_event_identity(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000102'
  ),
  false,
  'caregiver cannot relabel an event into another household even with membership in both households'
);

SELECT is(
  tests.try_update_entitlement('00000000-0000-4000-8000-000000000921'),
  false,
  'caregiver cannot manage billing entitlements'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT is(
  tests.try_update_puppy_quick_tracker_ids(
    '00000000-0000-4000-8000-000000000401',
    ARRAY['potty', 'feeding', 'sleep', 'walk', 'zoomies']::text[]
  ),
  true,
  'owner can update puppy selected quick trackers'
);

SELECT is(
  tests.try_update_puppy_quick_tracker_ids(
    '00000000-0000-4000-8000-000000000401',
    ARRAY['feeding', 'feeding']::text[]
  ),
  false,
  'puppy selected quick trackers reject duplicate ids'
);

SELECT is(
  tests.try_update_puppy_quick_tracker_ids(
    '00000000-0000-4000-8000-000000000401',
    ARRAY[
      'potty',
      'feeding',
      'sleep',
      'walk',
      'zoomies',
      'weight'
    ]::text[]
  ),
  false,
  'puppy selected quick trackers reject more than five ids'
);

SELECT is(
  tests.try_update_puppy_quick_tracker_ids(
    '00000000-0000-4000-8000-000000000401',
    ARRAY[]::text[]
  ),
  false,
  'puppy selected quick trackers reject empty selected set'
);

SELECT is(
  tests.try_update_puppy_quick_tracker_ids(
    '00000000-0000-4000-8000-000000000401',
    ARRAY['feeding', 'unknown_tracker']::text[]
  ),
  false,
  'puppy selected quick trackers reject unknown tracker ids'
);

SELECT is(
  tests.try_update_puppy_quick_tracker_ids(
    '00000000-0000-4000-8000-000000000401',
    ARRAY['feeding', ('potty' || '_pee_outside')]::text[]
  ),
  false,
  'puppy selected quick trackers reject legacy tracker ids'
);

SELECT is(
  tests.try_update_puppy_quick_tracker_ids(
    '00000000-0000-4000-8000-000000000401',
    ARRAY['feeding', 'weight']::text[]
  ),
  false,
  'puppy selected quick trackers reject health-only weight tracker'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000105');
SELECT results_eq(
  'SELECT count(*)::int FROM public.event_log',
  ARRAY[0],
  'revoked member loses household event access'
);

SELECT is(
  tests.try_insert_share_link(
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000101'
  ),
  false,
  'authenticated owner cannot directly create external share links'
);

SELECT is(
  tests.try_insert_invite(
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000101'
  ),
  false,
  'authenticated owner cannot directly create household invites'
);

SELECT throws_ok(
  $$UPDATE public.invite
    SET revoked_at = now()
    WHERE id = '00000000-0000-4000-8000-000000000702'$$,
  '42501',
  'permission denied for table invite',
  'authenticated owner cannot directly update household invites'
);

SELECT throws_ok(
  $$DELETE FROM public.invite
    WHERE id = '00000000-0000-4000-8000-000000000702'$$,
  '42501',
  'permission denied for table invite',
  'authenticated owner cannot directly delete household invites'
);

SELECT throws_ok(
  $$UPDATE public.share_link
    SET revoked_at = now()
    WHERE id = '00000000-0000-4000-8000-000000000701'$$,
  '42501',
  'permission denied for table share_link',
  'authenticated owner cannot directly update external share links'
);

SELECT throws_ok(
  $$DELETE FROM public.share_link
    WHERE id = '00000000-0000-4000-8000-000000000701'$$,
  '42501',
  'permission denied for table share_link',
  'authenticated owner cannot directly delete external share links'
);

SELECT throws_ok(
  $$INSERT INTO public.share_scope (share_link_id, scope)
    VALUES ('00000000-0000-4000-8000-000000000701', 'selected_timeline_range')$$,
  '42501',
  'permission denied for table share_scope',
  'authenticated owner cannot directly create share scopes'
);

SELECT throws_ok(
  $$UPDATE public.share_scope
    SET timeline_from = current_date
    WHERE id = '00000000-0000-4000-8000-000000000801'$$,
  '42501',
  'permission denied for table share_scope',
  'authenticated owner cannot directly update share scopes'
);

SELECT throws_ok(
  $$DELETE FROM public.share_scope
    WHERE id = '00000000-0000-4000-8000-000000000801'$$,
  '42501',
  'permission denied for table share_scope',
  'authenticated owner cannot directly delete share scopes'
);

SELECT tests.as_anon();
SELECT is(
  tests.try_insert_household('00000000-0000-4000-8000-000000000104'),
  false,
  'anonymous SQL role cannot directly create households'
);

SELECT is(
  tests.try_insert_share_link(
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000104'
  ),
  false,
  'anonymous user cannot create external share links'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT is(
  tests.try_insert_household('00000000-0000-4000-8000-000000000101'),
  false,
  'authenticated clients cannot create orphan households directly'
);

SELECT is(
  tests.try_insert_household_membership(
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000101'
  ),
  false,
  'authenticated clients cannot directly create household memberships'
);

SELECT is(
  tests.try_insert_device_push_token('00000000-0000-4000-8000-000000000101'),
  false,
  'authenticated clients cannot directly register push tokens outside the server boundary'
);

SELECT is(
  tests.try_insert_trusted_sitter_completion(
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000101'
  ),
  false,
  'authenticated clients cannot directly send trusted sitter completion events'
);

SELECT tests.as_postgres();
SELECT results_eq(
  $$SELECT count(*)::int
    FROM pg_constraint
    JOIN pg_class ON pg_class.oid = pg_constraint.conrelid
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_class.relname = 'share_scope'
      AND pg_constraint.conname = 'share_scope_selected_timeline_event_types_required'
      AND pg_constraint.contype = 'c'$$,
  ARRAY[1],
  'selected timeline share scope has required event-types constraint'
);

SELECT is(
  tests.try_update_share_scope_selected_event_types(
    '00000000-0000-4000-8000-000000000802',
    null
  ),
  false,
  'selected timeline share scope rejects null selected event types'
);

SELECT is(
  tests.try_update_share_scope_selected_event_types(
    '00000000-0000-4000-8000-000000000802',
    ARRAY[]::public.event_type[]
  ),
  false,
  'selected timeline share scope rejects empty selected event types'
);

SELECT is(
  tests.try_update_share_scope_selected_event_types(
    '00000000-0000-4000-8000-000000000802',
    ARRAY[
      'potty'::public.event_type,
      'training'::public.event_type,
      'zoomies'::public.event_type
    ]
  ),
  true,
  'selected timeline share scope accepts explicit non-empty selected event types'
);

SELECT is(
  tests.try_update_share_scope_selected_event_types(
    '00000000-0000-4000-8000-000000000801',
    null
  ),
  true,
  'non-selected share scope preserves null selected event types'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000106');
SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.share_selected_timeline
    WHERE event_type = 'observation'$$,
  ARRAY[0],
  'accepted trainer selected timeline excludes observation without explicit selection'
);

SELECT tests.as_postgres();
SELECT is(
  tests.try_update_share_scope_selected_event_types(
    '00000000-0000-4000-8000-000000000802',
    ARRAY[
      'potty'::public.event_type,
      'training'::public.event_type,
      'observation'::public.event_type,
      'zoomies'::public.event_type
    ]
  ),
  true,
  'selected timeline share scope accepts explicit observation opt-in'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000106');
SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.share_selected_timeline
    WHERE event_type = 'observation'$$,
  ARRAY[1],
  'accepted trainer selected timeline includes explicitly selected sanitized observation'
);

SELECT tests.as_postgres();
UPDATE public.share_scope
SET selected_event_types = ARRAY[
  'potty'::public.event_type,
  'training'::public.event_type,
  'zoomies'::public.event_type
]
WHERE id = '00000000-0000-4000-8000-000000000802';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000106');
SELECT isnt_empty(
  'SELECT share_link_id FROM public.current_share_link_metadata()',
  'accepted trainer share can read safe share metadata through the RPC boundary'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.share_link',
  ARRAY[0],
  'accepted trainer share cannot read base share_link rows'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT results_eq(
  'SELECT count(*)::int FROM public.share_link_view',
  ARRAY[1],
  'owner can read share metadata projection for permission preview'
);

SELECT results_eq(
  $$SELECT coalesce(sum(event_count), 0)::int
    FROM public.share_routine_summary
    WHERE event_type = 'feeding'$$,
  ARRAY[0],
  'puppy-scoped routine share excludes sibling puppy events in the same household'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000106');
SELECT results_eq(
  $$SELECT coalesce(sum(event_count), 0)::int
    FROM public.share_routine_summary
    WHERE event_type = 'feeding'$$,
  ARRAY[0],
  'accepted trainer routine summary has no sibling feeding rows'
);

SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.share_selected_timeline
    WHERE event_type = 'feeding'$$,
  ARRAY[0],
  'accepted trainer selected timeline has no sibling feeding rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.share_routine_summary',
  ARRAY[3],
  'accepted trainer share can read sanitized routine summary projection rows including same-puppy caregiver events'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.share_selected_timeline',
  ARRAY[3],
  'accepted trainer share can read sanitized selected timeline projection rows including same-puppy caregiver events'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.share_training_notes',
  ARRAY[1],
  'accepted trainer share can read sanitized training notes projection rows'
);

SELECT results_eq(
  $$SELECT coalesce(sum(event_count), 0)::int
    FROM public.share_routine_summary
    WHERE event_type = 'observation'$$,
  ARRAY[0],
  'accepted trainer broad routine summary excludes observation rows'
);

SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.share_training_notes
    WHERE training_topic = 'Synthetic observation'$$,
  ARRAY[0],
  'accepted trainer training notes exclude observation rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.share_health_summary',
  ARRAY[1],
  'accepted trainer share can read sanitized health summary projection rows'
);

SELECT hasnt_column(
  'public',
  'share_health_summary',
  'notes',
  'health summary projection excludes notes'
);

SELECT hasnt_column(
  'public',
  'share_health_summary',
  'provider_name',
  'health summary projection excludes provider names'
);

SELECT hasnt_column(
  'public',
  'share_health_summary',
  'media_path',
  'health summary projection excludes media paths'
);

SELECT hasnt_column(
  'public',
  'share_health_summary',
  'raw_metadata',
  'health summary projection excludes raw health metadata'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.health_record',
  ARRAY[0],
  'trainer share cannot read unrestricted health_record base rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.event_log',
  ARRAY[0],
  'trainer share cannot read unrestricted event_log base rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.share_puppy_profile',
  ARRAY[1],
  'accepted trainer share can read sanitized puppy profile projection rows'
);

SELECT tests.as_postgres();
INSERT INTO public.puppy (
  id,
  household_id,
  name,
  age_weeks_estimate,
  deleted_at
)
VALUES (
  '00000000-0000-4000-8000-000000000404',
  '00000000-0000-4000-8000-000000000201',
  'Soft-deleted test puppy',
  11,
  now()
);

INSERT INTO public.event_log (
  id,
  household_id,
  puppy_id,
  created_by,
  client_event_id,
  event_type,
  occurred_at,
  payload_version,
  payload
)
VALUES
  (
    '00000000-0000-4000-8000-000000000504',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000404',
    '00000000-0000-4000-8000-000000000101',
    'evt_seed_deleted_001',
    'potty',
    now() - interval '10 minutes',
    1,
    '{"quick_action":"pee_outside"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000505',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000404',
    '00000000-0000-4000-8000-000000000101',
    'evt_seed_deleted_002',
    'training',
    now() - interval '5 minutes',
    1,
    '{"topic":"settle","duration_bucket":"short"}'::jsonb
  );

INSERT INTO public.health_record (
  id,
  puppy_id,
  record_type,
  title,
  status,
  source,
  scheduled_for,
  completed_at,
  updated_by
)
VALUES (
  '00000000-0000-4000-8000-000000000602',
  '00000000-0000-4000-8000-000000000404',
  'vaccine',
  'Soft-deleted puppy health record',
  'needs_vet_review',
  'template',
  current_date + 7,
  null,
  '00000000-0000-4000-8000-000000000101'
);

INSERT INTO public.share_link (
  id,
  household_id,
  puppy_id,
  role,
  expires_at,
  accepted_at,
  accepted_by,
  created_by
)
VALUES (
  '00000000-0000-4000-8000-000000000703',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000404',
  'trainer_viewer',
  now() + interval '7 days',
  now(),
  '00000000-0000-4000-8000-000000000106',
  '00000000-0000-4000-8000-000000000101'
);

INSERT INTO public.share_scope (
  id,
  share_link_id,
  scope,
  timeline_from,
  timeline_to,
  selected_event_types
)
VALUES
  ('00000000-0000-4000-8000-000000000806', '00000000-0000-4000-8000-000000000703', 'routine_summary', null, null, null),
  (
    '00000000-0000-4000-8000-000000000807',
    '00000000-0000-4000-8000-000000000703',
    'selected_timeline_range',
    current_date - 1,
    current_date + 1,
    ARRAY['potty'::public.event_type, 'training'::public.event_type]
  ),
  ('00000000-0000-4000-8000-000000000808', '00000000-0000-4000-8000-000000000703', 'training_notes', null, null, null),
  ('00000000-0000-4000-8000-000000000809', '00000000-0000-4000-8000-000000000703', 'health_summary', null, null, null),
  ('00000000-0000-4000-8000-000000000810', '00000000-0000-4000-8000-000000000703', 'puppy_profile', null, null, null);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000106');
SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.current_share_link_metadata()
    WHERE puppy_id = '00000000-0000-4000-8000-000000000404'$$,
  ARRAY[0],
  'accepted trainer metadata excludes soft-deleted puppy shares'
);

SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.share_routine_summary
    WHERE share_link_id = '00000000-0000-4000-8000-000000000703'$$,
  ARRAY[0],
  'accepted trainer routine summary excludes soft-deleted puppy events'
);

SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.share_selected_timeline
    WHERE share_link_id = '00000000-0000-4000-8000-000000000703'$$,
  ARRAY[0],
  'accepted trainer selected timeline excludes soft-deleted puppy events'
);

SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.share_training_notes
    WHERE share_link_id = '00000000-0000-4000-8000-000000000703'$$,
  ARRAY[0],
  'accepted trainer training notes exclude soft-deleted puppy events'
);

SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.share_health_summary
    WHERE share_link_id = '00000000-0000-4000-8000-000000000703'$$,
  ARRAY[0],
  'accepted trainer health summary excludes soft-deleted puppy health records'
);

SELECT results_eq(
  $$SELECT count(*)::int
    FROM public.share_puppy_profile
    WHERE share_link_id = '00000000-0000-4000-8000-000000000703'$$,
  ARRAY[0],
  'accepted trainer puppy profile excludes soft-deleted puppies'
);

SELECT tests.as_postgres();
SELECT results_eq(
  $$SELECT count(*)::int
    FROM pg_class
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_class.relkind = 'v'
      AND pg_class.relname LIKE 'share_%'
      AND NOT ('security_invoker=true' = ANY(coalesce(pg_class.reloptions, ARRAY[]::text[])))$$,
  ARRAY[0],
  'share projection views use security_invoker to avoid security-definer view exposure'
);

SELECT results_eq(
  $$SELECT count(*)::int
    FROM pg_proc
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_proc.proname IN (
        'active_share_link_ids',
        'current_share_health_summary',
        'current_share_link_metadata',
        'current_share_puppy_profile',
        'current_share_routine_summary',
        'current_share_selected_timeline',
        'current_share_training_notes',
        'current_household_ids',
        'has_household_role',
        'prevent_event_log_identity_update',
        'prevent_notification_preference_identity_update',
        'set_updated_at',
        'share_link_has_scope'
      )
      AND NOT ('search_path=""' = ANY(coalesce(pg_proc.proconfig, ARRAY[]::text[])))$$,
  ARRAY[0],
  'public helper functions pin an empty search_path'
);

UPDATE public.share_link
SET expires_at = now() - interval '1 day'
WHERE id = '00000000-0000-4000-8000-000000000701';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000106');
SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_link_metadata()',
  ARRAY[0],
  'expired share reads no metadata projection rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_routine_summary()',
  ARRAY[0],
  'expired share reads no routine summary projection RPC rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_selected_timeline()',
  ARRAY[0],
  'expired share reads no selected timeline projection RPC rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_training_notes()',
  ARRAY[0],
  'expired share reads no training notes projection RPC rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_health_summary()',
  ARRAY[0],
  'expired share reads no health summary projection RPC rows'
);

SELECT results_eq(
  'SELECT count(*)::int FROM public.current_share_puppy_profile()',
  ARRAY[0],
  'expired share reads no puppy profile projection RPC rows'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT results_eq(
  'SELECT count(*)::int FROM public.notification_preference',
  ARRAY[1],
  'household owner can read notification preferences for household members'
);

SELECT is(
  tests.try_update_notification_preference_identity(
    '00000000-0000-4000-8000-000000000912',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000201'
  ),
  false,
  'household owner cannot reassign notification preference identity fields'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000102');
SELECT is(
  tests.try_insert_notification_preference(
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000202'
  ),
  true,
  'caregiver can create own notification preference in a household they belong to'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000104');
SELECT is(
  tests.try_insert_notification_preference(
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000201'
  ),
  false,
  'non-member cannot create notification preference for a household'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000103');
SELECT is(
  tests.try_insert_health_record(
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000103'
  ),
  false,
  'viewer cannot write health records'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT is(
  tests.try_soft_delete_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-04T10:00:00Z'::timestamptz
  ),
  true,
  'owner can soft-delete household event_log rows and observe the tombstone transition'
);

SELECT tests.as_postgres();
UPDATE public.event_log
SET deleted_at = null
WHERE id = '00000000-0000-4000-8000-000000000501';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000102');
SELECT is(
  tests.try_soft_delete_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-04T10:01:00Z'::timestamptz
  ),
  true,
  'caregiver can soft-delete household event_log rows and observe the tombstone transition'
);

SELECT tests.as_postgres();
UPDATE public.event_log
SET deleted_at = '2026-07-04T10:02:00Z'::timestamptz
WHERE id = '00000000-0000-4000-8000-000000000501';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT is(
  tests.try_restore_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401'
  ),
  true,
  'owner can restore tombstoned household event_log rows for undo'
);

SELECT tests.as_postgres();
UPDATE public.event_log
SET deleted_at = '2026-07-04T10:03:00Z'::timestamptz
WHERE id = '00000000-0000-4000-8000-000000000501';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000102');
SELECT is(
  tests.try_restore_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401'
  ),
  true,
  'caregiver can restore tombstoned household event_log rows for undo'
);

SELECT tests.as_postgres();
UPDATE public.event_log
SET deleted_at = null
WHERE id = '00000000-0000-4000-8000-000000000501';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000103');
SELECT is(
  tests.try_soft_delete_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-04T10:04:00Z'::timestamptz
  ),
  false,
  'viewer cannot soft-delete event_log rows'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000104');
SELECT is(
  tests.try_soft_delete_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-04T10:05:00Z'::timestamptz
  ),
  false,
  'non-member cannot soft-delete event_log rows'
);

SELECT tests.as_anon();
SELECT is(
  tests.try_soft_delete_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-04T10:06:00Z'::timestamptz
  ),
  false,
  'anonymous role cannot soft-delete event_log rows'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000106');
SELECT is(
  tests.try_soft_delete_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-04T10:07:00Z'::timestamptz
  ),
  false,
  'accepted trainer share user cannot soft-delete base event_log rows'
);

SELECT tests.as_postgres();
UPDATE public.event_log
SET deleted_at = '2026-07-04T10:08:00Z'::timestamptz
WHERE id = '00000000-0000-4000-8000-000000000501';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000103');
SELECT is(
  tests.try_restore_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401'
  ),
  false,
  'viewer cannot restore event_log rows'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000104');
SELECT is(
  tests.try_restore_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401'
  ),
  false,
  'non-member cannot restore event_log rows'
);

SELECT tests.as_anon();
SELECT is(
  tests.try_restore_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401'
  ),
  false,
  'anonymous role cannot restore event_log rows'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000106');
SELECT is(
  tests.try_restore_event_log(
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000401'
  ),
  false,
  'accepted trainer share user cannot restore base event_log rows'
);

SELECT tests.as_postgres();
UPDATE public.event_log
SET deleted_at = null
WHERE id = '00000000-0000-4000-8000-000000000501';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT is(
  tests.try_soft_delete_health_record(
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-03T12:00:00Z'::timestamptz,
    '00000000-0000-4000-8000-000000000101'
  ),
  true,
  'owner can soft-delete household health records and observe the tombstone transition'
);

SELECT tests.as_postgres();
UPDATE public.health_record
SET deleted_at = null
WHERE id = '00000000-0000-4000-8000-000000000601';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000102');
SELECT is(
  tests.try_soft_delete_health_record(
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-03T12:01:00Z'::timestamptz,
    '00000000-0000-4000-8000-000000000102'
  ),
  true,
  'caregiver can soft-delete household health records and observe the tombstone transition'
);

SELECT tests.as_postgres();
UPDATE public.health_record
SET deleted_at = '2026-07-03T12:02:00Z'::timestamptz
WHERE id = '00000000-0000-4000-8000-000000000601';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT is(
  tests.try_restore_health_record(
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000101'
  ),
  true,
  'owner can restore tombstoned household health records for undo'
);

SELECT tests.as_postgres();
UPDATE public.health_record
SET deleted_at = '2026-07-03T12:03:00Z'::timestamptz
WHERE id = '00000000-0000-4000-8000-000000000601';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000102');
SELECT is(
  tests.try_restore_health_record(
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000102'
  ),
  true,
  'caregiver can restore tombstoned household health records for undo'
);

SELECT tests.as_postgres();
UPDATE public.health_record
SET deleted_at = null
WHERE id = '00000000-0000-4000-8000-000000000601';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000103');
SELECT is(
  tests.try_soft_delete_health_record(
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-03T12:04:00Z'::timestamptz,
    '00000000-0000-4000-8000-000000000103'
  ),
  false,
  'viewer cannot soft-delete health records'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000104');
SELECT is(
  tests.try_soft_delete_health_record(
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-03T12:05:00Z'::timestamptz,
    '00000000-0000-4000-8000-000000000104'
  ),
  false,
  'non-member cannot soft-delete health records'
);

SELECT tests.as_anon();
SELECT is(
  tests.try_soft_delete_health_record(
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-03T12:06:00Z'::timestamptz,
    '00000000-0000-4000-8000-000000000101'
  ),
  false,
  'anonymous role cannot soft-delete health records'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT is(
  tests.try_soft_delete_reminder(
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-03T13:00:00Z'::timestamptz
  ),
  true,
  'owner can soft-delete household reminders and observe the tombstone transition'
);

SELECT tests.as_postgres();
UPDATE public.reminder
SET deleted_at = null
WHERE id = '00000000-0000-4000-8000-000000001001';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000102');
SELECT is(
  tests.try_soft_delete_reminder(
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-03T13:01:00Z'::timestamptz
  ),
  true,
  'caregiver can soft-delete household reminders and observe the tombstone transition'
);

SELECT tests.as_postgres();
UPDATE public.reminder
SET deleted_at = null
WHERE id = '00000000-0000-4000-8000-000000001001';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000103');
SELECT is(
  tests.try_soft_delete_reminder(
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-03T13:02:00Z'::timestamptz
  ),
  false,
  'viewer cannot soft-delete reminders'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000104');
SELECT is(
  tests.try_soft_delete_reminder(
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-03T13:03:00Z'::timestamptz
  ),
  false,
  'non-member cannot soft-delete reminders'
);

SELECT tests.as_anon();
SELECT is(
  tests.try_soft_delete_reminder(
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000000401',
    '2026-07-03T13:04:00Z'::timestamptz
  ),
  false,
  'anonymous role cannot soft-delete reminders'
);

SELECT tests.as_postgres();
UPDATE public.reminder
SET deleted_at = null
WHERE id = '00000000-0000-4000-8000-000000001001';

SELECT tests.as_auth('00000000-0000-4000-8000-000000000102');
SELECT is(
  tests.try_insert_reminder_occurrence('00000000-0000-4000-8000-000000001001'),
  false,
  'authenticated clients cannot directly insert reminder occurrences'
);

SELECT is(
  tests.try_insert_media_asset(
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000102',
    'households/h1/mismatched-puppy.jpg'
  ),
  false,
  'caregiver cannot insert media with mismatched puppy and household ids'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT results_eq(
  'SELECT count(*)::int FROM public.media_asset',
  ARRAY[1],
  'household member can read household media assets'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000104');
SELECT results_eq(
  'SELECT count(*)::int FROM public.media_asset',
  ARRAY[0],
  'non-member cannot read household media assets'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT results_eq(
  'SELECT count(*)::int FROM public.device_push_token',
  ARRAY[1],
  'user reads only own device push token'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000104');
SELECT results_eq(
  'SELECT count(*)::int FROM public.device_push_token',
  ARRAY[1],
  'another user reads only their own device push token'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000101');
SELECT results_eq(
  'SELECT count(*)::int FROM public.subscription_entitlement',
  ARRAY[1],
  'household owner can read subscription entitlement'
);

SELECT tests.as_auth('00000000-0000-4000-8000-000000000102');
SELECT results_eq(
  'SELECT count(*)::int FROM public.subscription_entitlement',
  ARRAY[0],
  'caregiver cannot read subscription entitlement'
);

SELECT throws_ok(
  $$SELECT token_hash FROM app_private.invite_secret$$,
  '42501',
  'permission denied for schema app_private',
  'authenticated client cannot read invite token hashes from app_private'
);

SELECT throws_ok(
  $$SELECT token_hash FROM app_private.share_link_secret$$,
  '42501',
  'permission denied for schema app_private',
  'authenticated client cannot read share token hashes from app_private'
);

SELECT tests.as_anon();
SELECT throws_ok(
  $$SELECT token_hash FROM app_private.invite_secret$$,
  '42501',
  'permission denied for schema app_private',
  'anonymous SQL role cannot read invite token hashes from app_private'
);

SELECT throws_ok(
  $$SELECT token_hash FROM app_private.share_link_secret$$,
  '42501',
  'permission denied for schema app_private',
  'anonymous SQL role cannot read share token hashes from app_private'
);

SELECT tests.as_postgres();
SELECT hasnt_column(
  'public',
  'notification_delivery_log',
  'payload',
  'notification delivery log has no payload body'
);

SELECT hasnt_column(
  'public',
  'notification_delivery_log',
  'notes',
  'notification delivery log has no private notes column'
);

SELECT throws_ok(
  $$SELECT token_hash FROM public.share_link$$,
  '42703',
  'column "token_hash" does not exist',
  'public share_link does not expose token hashes'
);

SELECT *
FROM finish();

ROLLBACK;
