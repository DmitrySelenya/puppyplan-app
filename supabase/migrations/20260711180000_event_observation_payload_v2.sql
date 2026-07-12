-- PUP-31 / ADR-0022: add the neutral observation event vocabulary.
-- Payload-version-2 validation remains at the typed application boundary; event_log.payload is
-- intentionally still jsonb so payload-version-1 history remains readable.
-- This migration is additive only. It does not rewrite rows, alter RLS, or expose observation
-- events through trainer/share projections.

ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'observation' BEFORE 'walk';

ALTER TABLE public.event_log
  DROP CONSTRAINT IF EXISTS event_log_payload_version_check,
  ADD CONSTRAINT event_log_payload_version_check CHECK (payload_version IN (1, 2));

COMMENT ON COLUMN public.event_log.payload_version IS
  'Strict application payload union: version 1 legacy rows or version 2 detailed rows.';

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
    AND event_log.event_type::text <> 'observation'
    AND event_log.occurred_at >= now() - interval '90 days'
  GROUP BY share_link.share_link_id, event_log.event_type
$$;
