-- PUP-42 cold-start correction (remote history version 20260724193951): an authenticated
-- caregiver/viewer already belongs to a
-- household, so normal session restoration must reuse that membership instead of creating a
-- stray owner household. When legacy data contains an older empty household, prefer a household
-- that has an active puppy; otherwise keep deterministic oldest-membership behavior.
CREATE OR REPLACE FUNCTION public.bootstrap_current_user(p_display_name text DEFAULT NULL)
RETURNS TABLE (household_id uuid, created boolean)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_household_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'bootstrap_current_user requires an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  SELECT hm.household_id
  INTO v_household_id
  FROM public.household_membership hm
  JOIN public.household h
    ON h.id = hm.household_id
  WHERE hm.user_id = v_user_id
    AND hm.accepted_at IS NOT NULL
    AND hm.revoked_at IS NULL
    AND h.deleted_at IS NULL
  ORDER BY EXISTS (
    SELECT 1
    FROM public.puppy p
    WHERE p.household_id = hm.household_id
      AND p.deleted_at IS NULL
  ) DESC,
    hm.created_at ASC,
    hm.id ASC
  LIMIT 1;

  IF v_household_id IS NOT NULL THEN
    household_id := v_household_id;
    created := false;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.household (created_by, display_name)
  VALUES (v_user_id, NULLIF(btrim(COALESCE(p_display_name, '')), ''))
  RETURNING id INTO v_household_id;

  INSERT INTO public.household_membership (household_id, user_id, role, invited_by, accepted_at)
  VALUES (v_household_id, v_user_id, 'owner', v_user_id, now());

  household_id := v_household_id;
  created := true;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_current_user(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_current_user(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text) TO authenticated;
