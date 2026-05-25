-- 20260525123000: tighten accepted-share projections against soft-deleted puppies.
--
-- The previous accepted-share RPC layer filtered deleted event and health rows,
-- but only `current_share_puppy_profile()` checked `puppy.deleted_at`. Keep the
-- metadata gate and every scope projection aligned so accepted trainer shares
-- cannot reveal events, health records, or metadata for a soft-deleted puppy.

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
  JOIN public.puppy
    ON puppy.id = share_link.puppy_id
    AND puppy.household_id = share_link.household_id
  LEFT JOIN public.share_scope ON share_scope.share_link_id = share_link.id
  WHERE puppy.deleted_at IS NULL
    AND share_link.revoked_at IS NULL
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

CREATE OR REPLACE FUNCTION public.current_share_routine_summary()
RETURNS TABLE (
  share_link_id uuid,
  event_type public.event_type,
  latest_time_bucket timestamptz,
  event_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    share_link.share_link_id,
    event_log.event_type,
    date_trunc('hour', max(event_log.occurred_at)) AS latest_time_bucket,
    count(*)::integer AS event_count
  FROM public.current_share_link_metadata() AS share_link
  JOIN public.share_scope ON share_scope.share_link_id = share_link.share_link_id
  JOIN public.puppy
    ON puppy.id = share_link.puppy_id
    AND puppy.household_id = share_link.household_id
  JOIN public.event_log
    ON event_log.household_id = share_link.household_id
    AND event_log.puppy_id = puppy.id
  WHERE share_scope.scope = 'routine_summary'
    AND puppy.deleted_at IS NULL
    AND event_log.deleted_at IS NULL
    AND event_log.occurred_at >= now() - interval '90 days'
  GROUP BY share_link.share_link_id, event_log.event_type
$$;

CREATE OR REPLACE FUNCTION public.current_share_selected_timeline()
RETURNS TABLE (
  share_link_id uuid,
  event_id uuid,
  event_type public.event_type,
  occurred_at timestamptz,
  actor_label text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    share_link.share_link_id,
    event_log.id AS event_id,
    event_log.event_type,
    event_log.occurred_at,
    'household_member'::text AS actor_label
  FROM public.current_share_link_metadata() AS share_link
  JOIN public.share_scope ON share_scope.share_link_id = share_link.share_link_id
  JOIN public.puppy
    ON puppy.id = share_link.puppy_id
    AND puppy.household_id = share_link.household_id
  JOIN public.event_log
    ON event_log.household_id = share_link.household_id
    AND event_log.puppy_id = puppy.id
  WHERE share_scope.scope = 'selected_timeline_range'
    AND puppy.deleted_at IS NULL
    AND event_log.deleted_at IS NULL
    AND event_log.occurred_at::date BETWEEN share_scope.timeline_from AND share_scope.timeline_to
    AND (
      share_scope.selected_event_types IS NULL
      OR event_log.event_type = ANY(share_scope.selected_event_types)
    )
$$;

CREATE OR REPLACE FUNCTION public.current_share_training_notes()
RETURNS TABLE (
  share_link_id uuid,
  event_id uuid,
  occurred_at timestamptz,
  occurred_time_bucket timestamptz,
  training_topic text,
  duration_bucket text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    share_link.share_link_id,
    event_log.id AS event_id,
    event_log.occurred_at,
    date_trunc('hour', event_log.occurred_at) AS occurred_time_bucket,
    event_log.payload ->> 'topic' AS training_topic,
    event_log.payload ->> 'duration_bucket' AS duration_bucket
  FROM public.current_share_link_metadata() AS share_link
  JOIN public.share_scope ON share_scope.share_link_id = share_link.share_link_id
  JOIN public.puppy
    ON puppy.id = share_link.puppy_id
    AND puppy.household_id = share_link.household_id
  JOIN public.event_log
    ON event_log.household_id = share_link.household_id
    AND event_log.puppy_id = puppy.id
  WHERE share_scope.scope = 'training_notes'
    AND puppy.deleted_at IS NULL
    AND event_log.event_type = 'training'
    AND event_log.deleted_at IS NULL
    AND event_log.occurred_at >= now() - interval '90 days'
$$;

CREATE OR REPLACE FUNCTION public.current_share_health_summary()
RETURNS TABLE (
  share_link_id uuid,
  health_record_id uuid,
  title text,
  status text,
  source text,
  scheduled_for date,
  completed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    share_link.share_link_id,
    health_record.id AS health_record_id,
    health_record.title,
    health_record.status,
    health_record.source,
    health_record.scheduled_for,
    health_record.completed_at
  FROM public.current_share_link_metadata() AS share_link
  JOIN public.share_scope ON share_scope.share_link_id = share_link.share_link_id
  JOIN public.puppy
    ON puppy.id = share_link.puppy_id
    AND puppy.household_id = share_link.household_id
  JOIN public.health_record ON health_record.puppy_id = puppy.id
  WHERE share_scope.scope = 'health_summary'
    AND puppy.deleted_at IS NULL
    AND health_record.deleted_at IS NULL
$$;

CREATE OR REPLACE FUNCTION public.current_share_puppy_profile()
RETURNS TABLE (
  share_link_id uuid,
  puppy_id uuid,
  name text,
  birth_date date,
  age_weeks_estimate integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    share_link.share_link_id,
    puppy.id AS puppy_id,
    puppy.name,
    puppy.birth_date,
    puppy.age_weeks_estimate
  FROM public.current_share_link_metadata() AS share_link
  JOIN public.share_scope ON share_scope.share_link_id = share_link.share_link_id
  JOIN public.puppy
    ON puppy.id = share_link.puppy_id
    AND puppy.household_id = share_link.household_id
  WHERE share_scope.scope = 'puppy_profile'
    AND puppy.deleted_at IS NULL
$$;

GRANT EXECUTE ON FUNCTION public.current_share_link_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_share_routine_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_share_selected_timeline() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_share_training_notes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_share_health_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_share_puppy_profile() TO authenticated;
