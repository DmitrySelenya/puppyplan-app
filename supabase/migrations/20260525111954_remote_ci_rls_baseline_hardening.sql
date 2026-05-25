-- Normalizes drift observed on the non-production PuppyPlan Dev database
-- after the local baseline was amended post-apply.
--
-- Prior dev state removed here:
-- - policies: household_insert, trusted_sitter_completion_event_insert,
--   share_link_owner_or_acceptor_read, share_scope_owner_or_acceptor_read.
-- - owner-read policies: share_link_owner_read, share_scope_owner_read are
--   dropped before recreation to keep reruns idempotent.
-- - grants: broad anon/authenticated table/function grants are revoked and
--   replaced below with table-specific SELECT, INSERT, UPDATE, and EXECUTE
--   privileges. No user data or private values are embedded in this migration.

DROP POLICY IF EXISTS household_insert ON public.household;
DROP POLICY IF EXISTS trusted_sitter_completion_event_insert ON public.trusted_sitter_completion_event;
DROP POLICY IF EXISTS share_link_owner_or_acceptor_read ON public.share_link;
DROP POLICY IF EXISTS share_scope_owner_or_acceptor_read ON public.share_scope;
DROP POLICY IF EXISTS share_link_owner_read ON public.share_link;
DROP POLICY IF EXISTS share_scope_owner_read ON public.share_scope;

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

DROP TRIGGER IF EXISTS event_log_prevent_identity_update ON public.event_log;
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

DROP TRIGGER IF EXISTS notification_preference_prevent_identity_update ON public.notification_preference;
CREATE TRIGGER notification_preference_prevent_identity_update
BEFORE UPDATE ON public.notification_preference
FOR EACH ROW EXECUTE FUNCTION public.prevent_notification_preference_identity_update();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    JOIN pg_attribute AS first_column
      ON first_column.attrelid = pg_constraint.conrelid
      AND first_column.attnum = pg_constraint.conkey[1]
    JOIN pg_attribute AS second_column
      ON second_column.attrelid = pg_constraint.conrelid
      AND second_column.attnum = pg_constraint.conkey[2]
    WHERE pg_constraint.conrelid = 'public.media_asset'::regclass
      AND pg_constraint.contype = 'f'
      AND first_column.attname = 'puppy_id'
      AND second_column.attname = 'household_id'
  ) THEN
    ALTER TABLE public.media_asset
      ADD CONSTRAINT media_asset_puppy_household_fk
      FOREIGN KEY (puppy_id, household_id) REFERENCES public.puppy(id, household_id) ON DELETE CASCADE;
  END IF;
END;
$$;

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
GRANT EXECUTE ON FUNCTION public.current_share_routine_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_share_selected_timeline() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_share_training_notes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_share_health_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_share_puppy_profile() TO authenticated;

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
