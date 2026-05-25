-- 20260525135121: route share link metadata view through the hardened RPC boundary.
--
-- The accepted-share projection views already delegate to SECURITY DEFINER RPCs
-- that apply the owner-or-accepted-share gate and puppy soft-delete filter.
-- Keep the owner permission preview metadata view on the same path instead of
-- the older security-invoker `active_share_link_ids()` helper path.

CREATE OR REPLACE VIEW public.share_link_view
WITH (security_barrier = true, security_invoker = true)
AS
SELECT * FROM public.current_share_link_metadata();

GRANT SELECT ON public.share_link_view TO authenticated;
