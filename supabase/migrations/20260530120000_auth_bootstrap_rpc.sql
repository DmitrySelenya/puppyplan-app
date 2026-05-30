-- supabase/migrations/20260530120000_auth_bootstrap_rpc.sql
-- New-user bootstrap: create the first household + owner membership for the
-- current authenticated user. Idempotent; SECURITY DEFINER because RLS denies
-- direct household/household_membership inserts. Provider-agnostic: it only
-- uses auth.uid(), so it works for any sign-in method (OTP today, Apple/Google
-- later). See ADR-0017.
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
  WHERE hm.user_id = v_user_id
    AND hm.role = 'owner'
    AND hm.accepted_at IS NOT NULL
    AND hm.revoked_at IS NULL
  ORDER BY hm.created_at ASC
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

REVOKE ALL ON FUNCTION public.bootstrap_current_user(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text) TO authenticated;
