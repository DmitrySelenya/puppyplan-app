-- Harden the already-applied PUP-18 bootstrap RPC on remote dev.
-- SECURITY DEFINER functions grant EXECUTE to PUBLIC by default unless revoked.
REVOKE ALL ON FUNCTION public.bootstrap_current_user(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_current_user(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text) TO authenticated;
