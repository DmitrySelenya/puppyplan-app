ALTER TABLE public.share_scope
  ADD CONSTRAINT share_scope_selected_timeline_event_types_required CHECK (
    scope <> 'selected_timeline_range'
    OR (
      selected_event_types IS NOT NULL
      AND cardinality(selected_event_types) > 0
    )
  ) NOT VALID;

ALTER TABLE public.share_scope
  VALIDATE CONSTRAINT share_scope_selected_timeline_event_types_required;

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
    AND event_log.event_type = ANY(share_scope.selected_event_types)
$$;
