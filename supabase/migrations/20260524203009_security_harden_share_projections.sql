CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT household_id
  FROM public.household_membership
  WHERE user_id = auth.uid()
    AND revoked_at IS NULL
    AND accepted_at IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.has_household_role(
  target_household_id uuid,
  allowed_roles public.household_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_membership
    WHERE household_id = target_household_id
      AND user_id = auth.uid()
      AND role = ANY(allowed_roles)
      AND revoked_at IS NULL
      AND accepted_at IS NOT NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.active_share_link_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT id
  FROM public.share_link
  WHERE revoked_at IS NULL
    AND expires_at > now()
    AND public.has_household_role(household_id, ARRAY['owner'::public.household_role])
$$;

CREATE OR REPLACE FUNCTION public.share_link_has_scope(
  target_share_link_id uuid,
  target_scope public.share_scope_type
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.share_scope
    WHERE share_link_id = target_share_link_id
      AND scope = target_scope
  )
$$;

ALTER VIEW public.share_link_view SET (security_invoker = true);
ALTER VIEW public.share_routine_summary SET (security_invoker = true);
ALTER VIEW public.share_selected_timeline SET (security_invoker = true);
ALTER VIEW public.share_training_notes SET (security_invoker = true);
ALTER VIEW public.share_health_summary SET (security_invoker = true);
ALTER VIEW public.share_puppy_profile SET (security_invoker = true);
