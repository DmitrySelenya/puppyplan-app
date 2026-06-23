-- Phase 3: canonical Quick Log tracker taxonomy.
-- Preserves applied migration history by remapping selected tracker state in a new migration.

ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'walk' BEFORE 'zoomies';

ALTER TABLE public.puppy
  DROP CONSTRAINT IF EXISTS puppy_quick_tracker_ids_allowed;

UPDATE public.puppy
SET quick_tracker_ids = COALESCE(
  (
    SELECT array_agg(deduped.mapped_tracker_id ORDER BY deduped.first_position)
    FROM (
      SELECT mapped.mapped_tracker_id, min(mapped.position) AS first_position
      FROM (
        SELECT
          CASE selected.tracker_id
            WHEN 'potty_pee_outside' THEN 'potty'
            WHEN 'potty_pee_inside' THEN 'potty'
            WHEN 'potty_poop' THEN 'potty'
            WHEN 'feeding_meal' THEN 'feeding'
            WHEN 'sleep_nap' THEN 'sleep'
            WHEN 'training' THEN NULL
            ELSE selected.tracker_id
          END AS mapped_tracker_id,
          selected.position
        FROM unnest(quick_tracker_ids) WITH ORDINALITY AS selected(tracker_id, position)
      ) AS mapped
      WHERE mapped.mapped_tracker_id = ANY (
        ARRAY['potty', 'feeding', 'sleep', 'walk', 'zoomies']::text[]
      )
      GROUP BY mapped.mapped_tracker_id
    ) AS deduped
  ),
  ARRAY['potty', 'feeding', 'sleep', 'walk', 'zoomies']::text[]
);

UPDATE public.puppy
SET quick_tracker_ids = ARRAY['potty', 'feeding', 'sleep', 'walk', 'zoomies']::text[]
WHERE cardinality(quick_tracker_ids) = 0;

UPDATE public.event_log
SET payload = jsonb_set(
  payload - 'quick_action',
  '{subtype}',
  to_jsonb(
    CASE payload ->> 'quick_action'
      WHEN 'pee_outside' THEN 'outside'
      WHEN 'pee_inside' THEN 'inside'
      WHEN 'poop' THEN 'poop'
    END
  ),
  true
)
WHERE event_type = 'potty'
  AND payload ? 'quick_action'
  AND NOT (payload ? 'subtype')
  AND payload ->> 'quick_action' IN ('pee_outside', 'pee_inside', 'poop');

ALTER TABLE public.puppy
  ALTER COLUMN quick_tracker_ids SET DEFAULT ARRAY[
    'potty',
    'feeding',
    'sleep',
    'walk',
    'zoomies'
  ]::text[];

ALTER TABLE public.puppy
  DROP CONSTRAINT IF EXISTS puppy_quick_tracker_ids_unique;

ALTER TABLE public.puppy
  ADD CONSTRAINT puppy_quick_tracker_ids_unique CHECK (
    public.quick_tracker_ids_are_unique(quick_tracker_ids)
  );

ALTER TABLE public.puppy
  ADD CONSTRAINT puppy_quick_tracker_ids_allowed CHECK (
    quick_tracker_ids <@ ARRAY[
      'potty',
      'feeding',
      'sleep',
      'walk',
      'zoomies'
    ]::text[]
  );
