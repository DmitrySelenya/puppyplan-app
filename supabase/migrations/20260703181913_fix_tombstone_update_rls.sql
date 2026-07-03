DROP POLICY IF EXISTS health_record_read ON public.health_record;

CREATE POLICY health_record_read ON public.health_record
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = health_record.puppy_id
        AND (
          (
            health_record.deleted_at IS NULL
            AND puppy.household_id IN (SELECT public.current_household_ids())
          )
          OR (
            health_record.deleted_at IS NOT NULL
            AND public.has_household_role(
              puppy.household_id,
              ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS reminder_read ON public.reminder;

CREATE POLICY reminder_read ON public.reminder
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.puppy
      WHERE puppy.id = reminder.puppy_id
        AND (
          (
            reminder.deleted_at IS NULL
            AND puppy.household_id IN (SELECT public.current_household_ids())
          )
          OR (
            reminder.deleted_at IS NOT NULL
            AND public.has_household_role(
              puppy.household_id,
              ARRAY['owner'::public.household_role, 'caregiver'::public.household_role]
            )
          )
        )
    )
  );
