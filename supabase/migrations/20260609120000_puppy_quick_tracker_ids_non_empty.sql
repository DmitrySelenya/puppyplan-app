UPDATE public.puppy
SET quick_tracker_ids = ARRAY[
  'potty_pee_outside',
  'potty_pee_inside',
  'potty_poop',
  'feeding_meal',
  'sleep_nap'
]::text[]
WHERE cardinality(quick_tracker_ids) = 0;

ALTER TABLE public.puppy
  ADD CONSTRAINT puppy_quick_tracker_ids_non_empty CHECK (
    cardinality(quick_tracker_ids) >= 1
  );
