-- PUP-42 household invite capability.
-- These SECURITY DEFINER RPCs are the only client write path for invites and
-- memberships. Plaintext invite tokens are returned once and never persisted.

ALTER TABLE app_private.invite_secret
  DROP CONSTRAINT invite_secret_token_hash_format;

ALTER TABLE app_private.invite_secret
  ADD CONSTRAINT invite_secret_token_hash_format CHECK (
    token_hash ~ '^((argon2id:|\$argon2id\$).+|sha256:[0-9a-f]{64})$'
  );

CREATE OR REPLACE FUNCTION public.create_household_invite(p_role text DEFAULT 'caregiver', p_ttl interval DEFAULT '7 days')
RETURNS TABLE (token text, expires_at timestamptz)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_household_id uuid;
  v_invite_id uuid;
  v_token text;
  v_token_last4 text;
  v_expires_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'create_household_invite requires an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  IF p_role IS DISTINCT FROM 'caregiver' THEN
    RAISE EXCEPTION 'create_household_invite supports the caregiver role only'
      USING ERRCODE = '22023';
  END IF;

  IF p_ttl IS NULL OR p_ttl <= interval '0 seconds' THEN
    RAISE EXCEPTION 'create_household_invite requires a positive TTL'
      USING ERRCODE = '22023';
  END IF;

  -- Lock the accepted owner membership so concurrent create calls serialize.
  SELECT membership.household_id
  INTO v_household_id
  FROM public.household_membership AS membership
  INNER JOIN public.household AS household
    ON household.id = membership.household_id
  WHERE membership.user_id = v_user_id
    AND membership.role = 'owner'
    AND membership.accepted_at IS NOT NULL
    AND membership.revoked_at IS NULL
    AND household.deleted_at IS NULL
  ORDER BY membership.created_at ASC
  LIMIT 1
  FOR UPDATE OF membership;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'create_household_invite requires one owned household'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.household_membership AS membership
    INNER JOIN public.household AS household
      ON household.id = membership.household_id
    WHERE membership.user_id = v_user_id
      AND membership.role = 'owner'
      AND membership.accepted_at IS NOT NULL
      AND membership.revoked_at IS NULL
      AND household.deleted_at IS NULL
      AND membership.household_id <> v_household_id
  ) THEN
    RAISE EXCEPTION 'create_household_invite requires exactly one owned household'
      USING ERRCODE = '42501';
  END IF;

  -- Serialize every owner of this household before replacing its active link.
  PERFORM household.id
  FROM public.household AS household
  WHERE household.id = v_household_id
  FOR UPDATE OF household;

  UPDATE public.invite AS invite
  SET
    revoked_at = now(),
    revoked_by = v_user_id
  WHERE invite.household_id = v_household_id
    AND invite.accepted_at IS NULL
    AND invite.revoked_at IS NULL
    AND invite.expires_at > now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_last4 := right(v_token, 4);
  v_expires_at := now() + p_ttl;

  INSERT INTO public.invite (
    household_id,
    token_last4,
    role,
    expires_at,
    created_by
  )
  VALUES (
    v_household_id,
    v_token_last4,
    'caregiver'::public.household_role,
    v_expires_at,
    v_user_id
  )
  RETURNING id INTO v_invite_id;

  INSERT INTO app_private.invite_secret (
    invite_id,
    token_hash,
    token_last4
  )
  VALUES (
    v_invite_id,
    'sha256:' || encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_token_last4
  );

  token := v_token;
  expires_at := v_expires_at;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_household_invite(p_token text)
RETURNS TABLE (household_id uuid, role text)
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
        role := v_invite_role::text;
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

  IF v_membership_role IS NULL THEN
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
  END IF;

  UPDATE public.invite AS invite
  SET
    accepted_at = now(),
    accepted_by = v_user_id
  WHERE invite.id = v_invite_id;

  household_id := v_household_id;
  role := v_invite_role::text;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_household_invite(p_invite_id uuid)
RETURNS boolean
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
    RAISE EXCEPTION 'revoke_household_invite requires an authenticated user'
      USING ERRCODE = '28000';
  END IF;

  IF p_invite_id IS NULL THEN
    RAISE EXCEPTION 'revoke_household_invite requires an invite id'
      USING ERRCODE = '22023';
  END IF;

  SELECT invite.household_id
  INTO v_household_id
  FROM public.invite AS invite
  WHERE invite.id = p_invite_id
  FOR UPDATE;

  IF v_household_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.household_membership AS membership
    WHERE membership.household_id = v_household_id
      AND membership.user_id = v_user_id
      AND membership.role = 'owner'
      AND membership.accepted_at IS NOT NULL
      AND membership.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'revoke_household_invite requires household ownership'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.invite AS invite
  SET
    revoked_at = now(),
    revoked_by = v_user_id
  WHERE invite.id = p_invite_id
    AND invite.accepted_at IS NULL
    AND invite.revoked_at IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.create_household_invite(text, interval) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_household_invite(text, interval) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_household_invite(text, interval) TO authenticated;

REVOKE ALL ON FUNCTION public.accept_household_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_household_invite(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_household_invite(text) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_household_invite(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_household_invite(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_household_invite(uuid) TO authenticated;
