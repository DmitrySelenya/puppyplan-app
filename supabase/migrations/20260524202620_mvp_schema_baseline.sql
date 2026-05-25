CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM anon, authenticated;

CREATE TYPE public.household_role AS ENUM ('owner', 'caregiver', 'viewer');
CREATE TYPE public.share_role AS ENUM ('trainer_viewer');
CREATE TYPE public.share_scope_type AS ENUM (
  'routine_summary',
  'selected_timeline_range',
  'training_notes',
  'health_summary',
  'puppy_profile'
);
CREATE TYPE public.event_type AS ENUM (
  'potty',
  'feeding',
  'sleep',
  'zoomies',
  'training',
  'health_record_reference'
);
CREATE TYPE public.reminder_occurrence_status AS ENUM (
  'scheduled',
  'completed',
  'skipped',
  'missed',
  'canceled'
);
CREATE TYPE public.notification_channel AS ENUM ('push', 'email');
CREATE TYPE public.notification_delivery_status AS ENUM (
  'queued',
  'sent',
  'delivered',
  'failed',
  'suppressed'
);
CREATE TYPE public.device_platform AS ENUM ('ios', 'android');
CREATE TYPE public.entitlement_status AS ENUM (
  'active',
  'trialing',
  'past_due',
  'canceled',
  'expired'
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.household (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.household_membership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.household(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.household_role NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

CREATE TABLE public.puppy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.household(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  birth_date date,
  age_weeks_estimate integer CHECK (age_weeks_estimate IS NULL OR age_weeks_estimate BETWEEN 0 AND 520),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (birth_date IS NOT NULL OR age_weeks_estimate IS NOT NULL),
  UNIQUE (id, household_id)
);

CREATE TABLE public.event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puppy_id uuid NOT NULL,
  household_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  client_event_id text NOT NULL CHECK (length(trim(client_event_id)) > 0),
  event_type public.event_type NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload_version integer NOT NULL DEFAULT 1 CHECK (payload_version = 1),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (puppy_id, household_id) REFERENCES public.puppy(id, household_id) ON DELETE CASCADE,
  UNIQUE (household_id, client_event_id)
);

CREATE TABLE public.health_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puppy_id uuid NOT NULL REFERENCES public.puppy(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (length(trim(record_type)) > 0),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  status text NOT NULL CHECK (length(trim(status)) > 0),
  source text NOT NULL CHECK (source IN ('template', 'manual', 'confirmed')),
  scheduled_for date,
  completed_at timestamptz,
  provider_name text,
  notes text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.reminder (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puppy_id uuid NOT NULL REFERENCES public.puppy(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reminder_type text NOT NULL CHECK (length(trim(reminder_type)) > 0),
  schedule_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  timezone text NOT NULL CHECK (length(trim(timezone)) > 0),
  quiet_hours jsonb,
  enabled boolean NOT NULL DEFAULT true,
  trusted_sitter_visible boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.reminder_occurrence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES public.reminder(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  local_notification_id text,
  status public.reminder_occurrence_status NOT NULL DEFAULT 'scheduled',
  action_taken text,
  acted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.household(id) ON DELETE CASCADE,
  email_hash text,
  token_last4 text CHECK (token_last4 IS NULL OR token_last4 ~ '^[A-Za-z0-9_-]{4}$'),
  role public.household_role NOT NULL CHECK (role IN ('caregiver', 'viewer')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_private.invite_secret (
  invite_id uuid PRIMARY KEY REFERENCES public.invite(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  token_last4 text NOT NULL CHECK (token_last4 ~ '^[A-Za-z0-9_-]{4}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.share_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.household(id) ON DELETE CASCADE,
  puppy_id uuid NOT NULL,
  role public.share_role NOT NULL DEFAULT 'trainer_viewer',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (puppy_id, household_id) REFERENCES public.puppy(id, household_id) ON DELETE CASCADE
);

CREATE TABLE app_private.share_link_secret (
  share_link_id uuid PRIMARY KEY REFERENCES public.share_link(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  token_last4 text NOT NULL CHECK (token_last4 ~ '^[A-Za-z0-9_-]{4}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.share_scope (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id uuid NOT NULL REFERENCES public.share_link(id) ON DELETE CASCADE,
  scope public.share_scope_type NOT NULL,
  timeline_from date,
  timeline_to date,
  selected_event_types public.event_type[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (share_link_id, scope),
  CHECK (
    scope <> 'selected_timeline_range'
    OR (timeline_from IS NOT NULL AND timeline_to IS NOT NULL AND timeline_from <= timeline_to)
  )
);

CREATE TABLE public.device_push_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL CHECK (length(trim(device_id)) > 0),
  platform public.device_platform NOT NULL,
  expo_push_token text,
  apns_token text,
  fcm_token text,
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id),
  CHECK (expo_push_token IS NOT NULL OR apns_token IS NOT NULL OR fcm_token IS NOT NULL)
);

CREATE TABLE public.notification_preference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES public.household(id) ON DELETE CASCADE,
  reminder_push_enabled boolean NOT NULL DEFAULT true,
  trusted_sitter_completion_push_enabled boolean NOT NULL DEFAULT true,
  quiet_hours jsonb,
  timezone text NOT NULL CHECK (length(trim(timezone)) > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, household_id)
);

CREATE TABLE public.notification_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  household_id uuid REFERENCES public.household(id) ON DELETE SET NULL,
  notification_type text NOT NULL CHECK (length(trim(notification_type)) > 0),
  channel public.notification_channel NOT NULL,
  provider_message_id text,
  delivery_status public.notification_delivery_status NOT NULL,
  error_category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.trusted_sitter_completion_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.household(id) ON DELETE CASCADE,
  puppy_id uuid NOT NULL,
  completed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  source_event_id uuid REFERENCES public.event_log(id) ON DELETE SET NULL,
  completion_type text NOT NULL CHECK (length(trim(completion_type)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (puppy_id, household_id) REFERENCES public.puppy(id, household_id) ON DELETE CASCADE
);

CREATE TABLE public.subscription_entitlement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.household(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (length(trim(provider)) > 0),
  provider_customer_id_hash text,
  entitlement text NOT NULL CHECK (length(trim(entitlement)) > 0),
  status public.entitlement_status NOT NULL,
  renews_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, provider, entitlement)
);

CREATE TABLE public.media_asset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.household(id) ON DELETE CASCADE,
  puppy_id uuid,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  storage_bucket text NOT NULL CHECK (length(trim(storage_bucket)) > 0),
  storage_path text NOT NULL CHECK (length(trim(storage_path)) > 0),
  media_type text NOT NULL CHECK (length(trim(media_type)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  FOREIGN KEY (puppy_id, household_id) REFERENCES public.puppy(id, household_id) ON DELETE CASCADE,
  UNIQUE (storage_bucket, storage_path)
);

COMMENT ON TABLE public.device_push_token IS
  'Private delivery tokens for notification routing. Protected by RLS/server boundaries and never joined into share projections.';
COMMENT ON COLUMN public.device_push_token.expo_push_token IS
  'Private delivery token value; do not expose in analytics, logs, fixtures, or projections.';
COMMENT ON COLUMN public.device_push_token.apns_token IS
  'Private delivery token value; do not expose in analytics, logs, fixtures, or projections.';
COMMENT ON COLUMN public.device_push_token.fcm_token IS
  'Private delivery token value; do not expose in analytics, logs, fixtures, or projections.';

CREATE TABLE public.content_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text NOT NULL CHECK (length(trim(content_key)) > 0),
  locale text NOT NULL CHECK (locale IN ('en', 'ru', 'es')),
  version text NOT NULL CHECK (length(trim(version)) > 0),
  checksum text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_key, locale, version)
);

CREATE INDEX household_membership_user_idx ON public.household_membership (user_id, household_id)
WHERE accepted_at IS NOT NULL AND revoked_at IS NULL;
CREATE INDEX puppy_household_idx ON public.puppy (household_id);
CREATE INDEX event_log_household_occurred_idx ON public.event_log (household_id, occurred_at DESC)
WHERE deleted_at IS NULL;
CREATE INDEX event_log_household_puppy_occurred_idx ON public.event_log (household_id, puppy_id, occurred_at DESC)
WHERE deleted_at IS NULL;
CREATE INDEX health_record_puppy_idx ON public.health_record (puppy_id)
WHERE deleted_at IS NULL;
CREATE INDEX reminder_puppy_idx ON public.reminder (puppy_id)
WHERE deleted_at IS NULL;
CREATE INDEX share_link_accepted_by_idx ON public.share_link (accepted_by)
WHERE accepted_by IS NOT NULL;
CREATE INDEX share_scope_scope_idx ON public.share_scope (scope);
CREATE INDEX device_push_token_user_idx ON public.device_push_token (user_id)
WHERE revoked_at IS NULL;

CREATE TRIGGER household_set_updated_at
BEFORE UPDATE ON public.household
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER household_membership_set_updated_at
BEFORE UPDATE ON public.household_membership
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER puppy_set_updated_at
BEFORE UPDATE ON public.puppy
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER event_log_set_updated_at
BEFORE UPDATE ON public.event_log
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER reminder_set_updated_at
BEFORE UPDATE ON public.reminder
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER reminder_occurrence_set_updated_at
BEFORE UPDATE ON public.reminder_occurrence
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER invite_set_updated_at
BEFORE UPDATE ON public.invite
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER share_link_set_updated_at
BEFORE UPDATE ON public.share_link
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER device_push_token_set_updated_at
BEFORE UPDATE ON public.device_push_token
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subscription_entitlement_set_updated_at
BEFORE UPDATE ON public.subscription_entitlement
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.current_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT household_id
  FROM public.household_membership
  WHERE user_id = auth.uid()
    AND revoked_at IS NULL
    AND accepted_at IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.has_household_role(
  target_household_id uuid,
  allowed_roles public.household_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_membership
    WHERE household_id = target_household_id
      AND user_id = auth.uid()
      AND role = ANY(allowed_roles)
      AND revoked_at IS NULL
      AND accepted_at IS NOT NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.active_share_link_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT id
  FROM public.share_link
  WHERE revoked_at IS NULL
    AND expires_at > now()
    AND public.has_household_role(household_id, ARRAY['owner'::public.household_role])
$$;

CREATE OR REPLACE FUNCTION public.share_link_has_scope(
  target_share_link_id uuid,
  target_scope public.share_scope_type
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.share_scope
    WHERE share_link_id = target_share_link_id
      AND scope = target_scope
  )
$$;

CREATE OR REPLACE FUNCTION public.prevent_event_log_identity_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.household_id IS DISTINCT FROM OLD.household_id
    OR NEW.puppy_id IS DISTINCT FROM OLD.puppy_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.client_event_id IS DISTINCT FROM OLD.client_event_id THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'event_log household_id, puppy_id, created_by, and client_event_id are immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER event_log_prevent_identity_update
BEFORE UPDATE ON public.event_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_event_log_identity_update();

CREATE OR REPLACE FUNCTION public.prevent_notification_preference_identity_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.household_id IS DISTINCT FROM OLD.household_id THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'notification_preference user_id and household_id are immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notification_preference_prevent_identity_update
BEFORE UPDATE ON public.notification_preference
FOR EACH ROW EXECUTE FUNCTION public.prevent_notification_preference_identity_update();

ALTER TABLE public.household ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puppy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_occurrence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_scope ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_push_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_sitter_completion_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_entitlement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY household_read ON public.household
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.current_household_ids()));

CREATE POLICY household_owner_update ON public.household
  FOR UPDATE TO authenticated
  USING (public.has_household_role(id, ARRAY['owner'::public.household_role]))
  WITH CHECK (public.has_household_role(id, ARRAY['owner'::public.household_role]));

CREATE POLICY household_membership_read_own ON public.household_membership
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND accepted_at IS NOT NULL AND revoked_at IS NULL);

CREATE POLICY puppy_read ON public.puppy
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND household_id IN (SELECT public.current_household_ids())
  );

CREATE POLICY puppy_owner_insert ON public.puppy
  FOR INSERT TO authenticated
  WITH CHECK (public.has_household_role(household_id, ARRAY['owner'::public.household_role]));

CREATE POLICY puppy_owner_update ON public.puppy
  FOR UPDATE TO authenticated
  USING (public.has_household_role(household_id, ARRAY['owner'::public.household_role]))
  WITH CHECK (public.has_household_role(household_id, ARRAY['owner'::public.household_role]));

CREATE POLICY event_log_read ON public.event_log
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND household_id IN (SELECT public.current_household_ids())
  );

CREATE POLICY event_log_insert ON public.event_log
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_household_role(
      household_id,
      ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
    )
  );

CREATE POLICY event_log_update ON public.event_log
  FOR UPDATE TO authenticated
  USING (
    public.has_household_role(
      household_id,
      ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
    )
  )
  WITH CHECK (
    public.has_household_role(
      household_id,
      ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
    )
  );

CREATE POLICY health_record_read ON public.health_record
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = health_record.puppy_id
        AND puppy.household_id IN (SELECT public.current_household_ids())
    )
  );

CREATE POLICY health_record_insert ON public.health_record
  FOR INSERT TO authenticated
  WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = health_record.puppy_id
        AND public.has_household_role(
          puppy.household_id,
          ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
        )
    )
  );

CREATE POLICY health_record_update ON public.health_record
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = health_record.puppy_id
        AND public.has_household_role(
          puppy.household_id,
          ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
        )
    )
  )
  WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = health_record.puppy_id
        AND public.has_household_role(
          puppy.household_id,
          ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
        )
    )
  );

CREATE POLICY reminder_read ON public.reminder
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = reminder.puppy_id
        AND puppy.household_id IN (SELECT public.current_household_ids())
    )
  );

CREATE POLICY reminder_insert ON public.reminder
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = reminder.puppy_id
        AND public.has_household_role(
          puppy.household_id,
          ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
        )
    )
  );

CREATE POLICY reminder_update ON public.reminder
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = reminder.puppy_id
        AND public.has_household_role(
          puppy.household_id,
          ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = reminder.puppy_id
        AND public.has_household_role(
          puppy.household_id,
          ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
        )
    )
  );

CREATE POLICY reminder_occurrence_read ON public.reminder_occurrence
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reminder
      JOIN public.puppy ON puppy.id = reminder.puppy_id
      WHERE reminder.id = reminder_occurrence.reminder_id
        AND puppy.household_id IN (SELECT public.current_household_ids())
    )
  );

CREATE POLICY reminder_occurrence_update ON public.reminder_occurrence
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reminder
      JOIN public.puppy ON puppy.id = reminder.puppy_id
      WHERE reminder.id = reminder_occurrence.reminder_id
        AND public.has_household_role(
          puppy.household_id,
          ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.reminder
      JOIN public.puppy ON puppy.id = reminder.puppy_id
      WHERE reminder.id = reminder_occurrence.reminder_id
        AND public.has_household_role(
          puppy.household_id,
          ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
        )
    )
  );

CREATE POLICY invite_owner_read ON public.invite
  FOR SELECT TO authenticated
  USING (public.has_household_role(household_id, ARRAY['owner'::public.household_role]));

CREATE POLICY share_link_owner_read ON public.share_link
  FOR SELECT TO authenticated
  USING (public.has_household_role(household_id, ARRAY['owner'::public.household_role]));

CREATE POLICY share_scope_owner_read ON public.share_scope
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.share_link
      WHERE share_link.id = share_scope.share_link_id
        AND public.has_household_role(share_link.household_id, ARRAY['owner'::public.household_role])
    )
  );

CREATE POLICY device_push_token_owner_read ON public.device_push_token
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND revoked_at IS NULL);

CREATE POLICY notification_preference_read ON public.notification_preference
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_household_role(household_id, ARRAY['owner'::public.household_role])
  );

CREATE POLICY notification_preference_insert ON public.notification_preference
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND household_id IN (SELECT public.current_household_ids())
  );

CREATE POLICY notification_preference_update ON public.notification_preference
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_household_role(household_id, ARRAY['owner'::public.household_role])
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_household_role(household_id, ARRAY['owner'::public.household_role])
  );

CREATE POLICY notification_delivery_log_read ON public.notification_delivery_log
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_household_role(household_id, ARRAY['owner'::public.household_role])
  );

CREATE POLICY trusted_sitter_completion_event_read ON public.trusted_sitter_completion_event
  FOR SELECT TO authenticated
  USING (household_id IN (SELECT public.current_household_ids()));

CREATE POLICY subscription_entitlement_owner_read ON public.subscription_entitlement
  FOR SELECT TO authenticated
  USING (public.has_household_role(household_id, ARRAY['owner'::public.household_role]));

CREATE POLICY media_asset_member_read ON public.media_asset
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND household_id IN (SELECT public.current_household_ids())
  );

CREATE POLICY media_asset_member_insert ON public.media_asset
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND public.has_household_role(
      household_id,
      ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
    )
  );

CREATE POLICY content_version_public_read ON public.content_version
  FOR SELECT TO anon, authenticated
  USING (published_at <= now());

CREATE OR REPLACE FUNCTION public.current_share_link_metadata()
RETURNS TABLE (
  share_link_id uuid,
  household_id uuid,
  puppy_id uuid,
  role public.share_role,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  scopes public.share_scope_type[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    share_link.id AS share_link_id,
    share_link.household_id,
    share_link.puppy_id,
    share_link.role,
    share_link.expires_at,
    share_link.accepted_at,
    share_link.revoked_at,
    array_remove(array_agg(share_scope.scope ORDER BY share_scope.scope), NULL) AS scopes
  FROM public.share_link
  LEFT JOIN public.share_scope ON share_scope.share_link_id = share_link.id
  WHERE share_link.revoked_at IS NULL
    AND share_link.expires_at > now()
    AND (
      EXISTS (
        SELECT 1
        FROM public.household_membership
        WHERE household_membership.household_id = share_link.household_id
          AND household_membership.user_id = auth.uid()
          AND household_membership.role = 'owner'
          AND household_membership.accepted_at IS NOT NULL
          AND household_membership.revoked_at IS NULL
      )
      OR (
        share_link.accepted_by = auth.uid()
        AND share_link.accepted_at IS NOT NULL
      )
    )
  GROUP BY
    share_link.id,
    share_link.household_id,
    share_link.puppy_id,
    share_link.role,
    share_link.expires_at,
    share_link.accepted_at,
    share_link.revoked_at
$$;

CREATE VIEW public.share_link_view
WITH (security_barrier = true)
AS
SELECT
  share_link.id AS share_link_id,
  share_link.household_id,
  share_link.puppy_id,
  share_link.role,
  share_link.expires_at,
  share_link.accepted_at,
  share_link.revoked_at,
  array_remove(array_agg(share_scope.scope ORDER BY share_scope.scope), NULL) AS scopes
FROM public.share_link
LEFT JOIN public.share_scope ON share_scope.share_link_id = share_link.id
WHERE share_link.id IN (SELECT public.active_share_link_ids())
GROUP BY
  share_link.id,
  share_link.household_id,
  share_link.puppy_id,
  share_link.role,
  share_link.expires_at,
  share_link.accepted_at,
  share_link.revoked_at;

CREATE VIEW public.share_routine_summary
WITH (security_barrier = true)
AS
SELECT
  share_link.id AS share_link_id,
  event_log.event_type,
  date_trunc('hour', max(event_log.occurred_at)) AS latest_time_bucket,
  count(*)::integer AS event_count
FROM public.share_link
JOIN public.share_scope ON share_scope.share_link_id = share_link.id
JOIN public.event_log
  ON event_log.household_id = share_link.household_id
  AND event_log.puppy_id = share_link.puppy_id
WHERE share_link.id IN (SELECT public.active_share_link_ids())
  AND share_scope.scope = 'routine_summary'
  AND event_log.deleted_at IS NULL
  AND event_log.occurred_at >= now() - interval '90 days'
GROUP BY share_link.id, event_log.event_type;

CREATE VIEW public.share_selected_timeline
WITH (security_barrier = true)
AS
SELECT
  share_link.id AS share_link_id,
  event_log.id AS event_id,
  event_log.event_type,
  event_log.occurred_at,
  'household_member'::text AS actor_label
FROM public.share_link
JOIN public.share_scope ON share_scope.share_link_id = share_link.id
JOIN public.event_log
  ON event_log.household_id = share_link.household_id
  AND event_log.puppy_id = share_link.puppy_id
WHERE share_link.id IN (SELECT public.active_share_link_ids())
  AND share_scope.scope = 'selected_timeline_range'
  AND event_log.deleted_at IS NULL
  AND event_log.occurred_at::date BETWEEN share_scope.timeline_from AND share_scope.timeline_to
  AND (
    share_scope.selected_event_types IS NULL
    OR event_log.event_type = ANY(share_scope.selected_event_types)
  );

CREATE VIEW public.share_training_notes
WITH (security_barrier = true)
AS
SELECT
  share_link.id AS share_link_id,
  event_log.id AS event_id,
  event_log.occurred_at,
  date_trunc('hour', event_log.occurred_at) AS occurred_time_bucket,
  event_log.payload ->> 'topic' AS training_topic,
  event_log.payload ->> 'duration_bucket' AS duration_bucket
FROM public.share_link
JOIN public.share_scope ON share_scope.share_link_id = share_link.id
JOIN public.event_log
  ON event_log.household_id = share_link.household_id
  AND event_log.puppy_id = share_link.puppy_id
WHERE share_link.id IN (SELECT public.active_share_link_ids())
  AND share_scope.scope = 'training_notes'
  AND event_log.event_type = 'training'
  AND event_log.deleted_at IS NULL
  AND event_log.occurred_at >= now() - interval '90 days';

CREATE VIEW public.share_health_summary
WITH (security_barrier = true)
AS
SELECT
  share_link.id AS share_link_id,
  health_record.id AS health_record_id,
  health_record.title,
  health_record.status,
  health_record.source,
  health_record.scheduled_for,
  health_record.completed_at
FROM public.share_link
JOIN public.share_scope ON share_scope.share_link_id = share_link.id
JOIN public.puppy ON puppy.id = share_link.puppy_id
JOIN public.health_record ON health_record.puppy_id = puppy.id
WHERE share_link.id IN (SELECT public.active_share_link_ids())
  AND share_scope.scope = 'health_summary'
  AND health_record.deleted_at IS NULL;

CREATE VIEW public.share_puppy_profile
WITH (security_barrier = true)
AS
SELECT
  share_link.id AS share_link_id,
  puppy.id AS puppy_id,
  puppy.name,
  puppy.birth_date,
  puppy.age_weeks_estimate
FROM public.share_link
JOIN public.share_scope ON share_scope.share_link_id = share_link.id
JOIN public.puppy ON puppy.id = share_link.puppy_id
WHERE share_link.id IN (SELECT public.active_share_link_ids())
  AND share_scope.scope = 'puppy_profile'
  AND puppy.deleted_at IS NULL;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA app_private FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_household_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_household_role(uuid, public.household_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_share_link_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_link_has_scope(uuid, public.share_scope_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_share_link_metadata() TO authenticated;

GRANT SELECT ON
  public.household,
  public.household_membership,
  public.puppy,
  public.event_log,
  public.health_record,
  public.reminder,
  public.reminder_occurrence,
  public.invite,
  public.share_link,
  public.share_scope,
  public.device_push_token,
  public.notification_preference,
  public.notification_delivery_log,
  public.trusted_sitter_completion_event,
  public.subscription_entitlement,
  public.media_asset,
  public.content_version
TO authenticated;

GRANT INSERT ON
  public.puppy,
  public.event_log,
  public.health_record,
  public.reminder,
  public.notification_preference,
  public.media_asset
TO authenticated;

GRANT UPDATE ON
  public.household,
  public.puppy,
  public.event_log,
  public.health_record,
  public.reminder,
  public.reminder_occurrence,
  public.notification_preference
TO authenticated;

GRANT SELECT ON
  public.content_version
TO anon;

GRANT SELECT ON
  public.share_link_view,
  public.share_routine_summary,
  public.share_selected_timeline,
  public.share_training_notes,
  public.share_health_summary,
  public.share_puppy_profile
TO authenticated;
