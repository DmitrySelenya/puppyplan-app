-- PUP-21: per-puppy ordered Quick Log tracker selection.
-- Approved in the 2026-06-08 implementation thread as an ADR-0007 additive schema delta.

CREATE OR REPLACE FUNCTION public.quick_tracker_ids_are_unique(tracker_ids text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
  SELECT cardinality(tracker_ids) = (
    SELECT count(DISTINCT tracker_id)::integer
    FROM unnest(tracker_ids) AS selected(tracker_id)
  );
$$;

ALTER TABLE public.puppy
  ADD COLUMN quick_tracker_ids text[] NOT NULL DEFAULT ARRAY[
    'potty_pee_outside',
    'potty_pee_inside',
    'potty_poop',
    'feeding_meal',
    'sleep_nap'
  ]::text[],
  ADD CONSTRAINT puppy_quick_tracker_ids_allowed CHECK (
    quick_tracker_ids <@ ARRAY[
      'potty_pee_outside',
      'potty_pee_inside',
      'potty_poop',
      'feeding_meal',
      'sleep_nap',
      'zoomies',
      'training'
    ]::text[]
  ),
  ADD CONSTRAINT puppy_quick_tracker_ids_visible_count CHECK (
    cardinality(quick_tracker_ids) <= 5
  ),
  ADD CONSTRAINT puppy_quick_tracker_ids_unique CHECK (
    public.quick_tracker_ids_are_unique(quick_tracker_ids)
  );
