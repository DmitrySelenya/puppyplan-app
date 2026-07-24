-- PUP-42 follow-up: preserve an existing member's real role and leave an
-- unused invite available when that member opens the link.

BEGIN;

DROP FUNCTION public.accept_household_invite(text);

CREATE OR REPLACE FUNCTION public.accept_household_invite(p_token text)
RETURNS TABLE (household_id uuid, role text, outcome text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_token_hash text;
  v_invite_id uuid;
  v_household_id uuid;
  v_invite_role public.household_role;
  v_invited_by uuid;
  v_expires_at timestamptz;
  v_accepted_at timestamptz;
  v_accepted_by uuid;
  v_revoked_at timestamptz;
  v_membership_role public.household_role;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'accept_household_invite requires an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'household invite is invalid'
      USING ERRCODE = 'P4201';
  END IF;

  v_token_hash :=
    'sha256:' || encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT
    invite.id,
    invite.household_id,
    invite.role,
    invite.created_by,
    invite.expires_at,
    invite.accepted_at,
    invite.accepted_by,
    invite.revoked_at
  INTO
    v_invite_id,
    v_household_id,
    v_invite_role,
    v_invited_by,
    v_expires_at,
    v_accepted_at,
    v_accepted_by,
    v_revoked_at
  FROM app_private.invite_secret AS secret
  INNER JOIN public.invite AS invite
    ON invite.id = secret.invite_id
  WHERE secret.token_hash = v_token_hash
  ORDER BY invite.created_at ASC
  LIMIT 1
  FOR UPDATE OF invite;

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'household invite is invalid'
      USING ERRCODE = 'P4201';
  END IF;

  IF v_accepted_at IS NOT NULL THEN
    IF v_accepted_by = v_user_id THEN
      SELECT membership.role
      INTO v_membership_role
      FROM public.household_membership AS membership
      WHERE membership.household_id = v_household_id
        AND membership.user_id = v_user_id
        AND membership.accepted_at IS NOT NULL
        AND membership.revoked_at IS NULL;

      IF v_membership_role IS NOT NULL THEN
        household_id := v_household_id;
        role := v_membership_role::text;
        outcome := 'already_member';
        RETURN NEXT;
        RETURN;
      END IF;
    END IF;

    RAISE EXCEPTION 'household invite was already used'
      USING ERRCODE = 'P4203';
  END IF;

  IF v_revoked_at IS NOT NULL OR v_expires_at <= now() THEN
    RAISE EXCEPTION 'household invite is unavailable'
      USING ERRCODE = 'P4202';
  END IF;

  SELECT membership.role
  INTO v_membership_role
  FROM public.household_membership AS membership
  WHERE membership.household_id = v_household_id
    AND membership.user_id = v_user_id
    AND membership.accepted_at IS NOT NULL
    AND membership.revoked_at IS NULL;

  IF v_membership_role IS NOT NULL THEN
    household_id := v_household_id;
    role := v_membership_role::text;
    outcome := 'already_member';
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.household_membership AS membership (
    household_id,
    user_id,
    role,
    invited_by,
    accepted_at,
    revoked_at
  )
  VALUES (
    v_household_id,
    v_user_id,
    v_invite_role,
    v_invited_by,
    now(),
    NULL
  )
  ON CONFLICT ON CONSTRAINT household_membership_household_id_user_id_key
  DO UPDATE SET
    role = EXCLUDED.role,
    invited_by = EXCLUDED.invited_by,
    accepted_at = EXCLUDED.accepted_at,
    revoked_at = NULL
  RETURNING membership.role INTO v_membership_role;

  UPDATE public.invite AS invite
  SET
    accepted_at = now(),
    accepted_by = v_user_id
  WHERE invite.id = v_invite_id;

  household_id := v_household_id;
  role := v_membership_role::text;
  outcome := 'accepted';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_household_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_household_invite(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_household_invite(text) TO authenticated;

COMMIT;
