DROP POLICY IF EXISTS event_log_read ON public.event_log;

CREATE POLICY event_log_read ON public.event_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = event_log.puppy_id
        AND puppy.household_id = event_log.household_id
        AND (
          (
            event_log.deleted_at IS NULL
            AND event_log.household_id IN (SELECT public.current_household_ids())
          )
          OR (
            event_log.deleted_at IS NOT NULL
            AND public.has_household_role(
              event_log.household_id,
              ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS event_log_update ON public.event_log;

CREATE POLICY event_log_update ON public.event_log
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = event_log.puppy_id
        AND puppy.household_id = event_log.household_id
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
      WHERE puppy.id = event_log.puppy_id
        AND puppy.household_id = event_log.household_id
        AND public.has_household_role(
          puppy.household_id,
          ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
        )
    )
  );
