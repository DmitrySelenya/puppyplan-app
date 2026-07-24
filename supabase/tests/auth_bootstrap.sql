-- supabase/tests/auth_bootstrap.sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(16);

CREATE SCHEMA IF NOT EXISTS tests;

CREATE OR REPLACE FUNCTION tests.as_auth(user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;
END;
$$;

CREATE OR REPLACE FUNCTION tests.as_anon()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  SET LOCAL ROLE anon;
END;
$$;

CREATE OR REPLACE FUNCTION tests.as_postgres()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', '', true);
END;
$$;

GRANT USAGE ON SCHEMA tests TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated;

SELECT tests.as_postgres();

CREATE TABLE tests.bootstrap_seen_households (
  user_label text PRIMARY KEY,
  household_id uuid NOT NULL
);

GRANT SELECT, INSERT ON tests.bootstrap_seen_households TO authenticated;

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000a0001', 'authenticated', 'authenticated', 'bootstrap-a@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-0000000a0002', 'authenticated', 'authenticated', 'bootstrap-b@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-0000000a0003', 'authenticated', 'authenticated', 'bootstrap-c@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-0000000a0004', 'authenticated', 'authenticated', 'bootstrap-d@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

-- Function shape: SECURITY DEFINER with a pinned empty search_path.
SELECT results_eq(
  $$SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'bootstrap_current_user'
      AND p.prosecdef
      AND 'search_path=""' = ANY(coalesce(p.proconfig, ARRAY[]::text[]))$$,
  ARRAY[1],
  'bootstrap_current_user is SECURITY DEFINER with a pinned empty search_path'
);

SELECT ok(
  position(
    'pg_advisory_xact_lock' IN
    pg_get_functiondef('public.bootstrap_current_user(text)'::regprocedure)
  ) > 0
  AND position(
    'pg_advisory_xact_lock' IN
    pg_get_functiondef('public.bootstrap_current_user(text)'::regprocedure)
  ) < position(
    'SELECT hm.household_id' IN
    pg_get_functiondef('public.bootstrap_current_user(text)'::regprocedure)
  ),
  'bootstrap serializes each user before resolving membership'
);

-- First call creates a household + owner membership.
SELECT tests.as_auth('00000000-0000-4000-8000-0000000a0001');
SELECT is(
  (SELECT created FROM public.bootstrap_current_user('Maple house')),
  true,
  'first bootstrap call reports created = true'
);

SELECT results_eq(
  $$SELECT count(*)::int FROM public.household_membership
    WHERE user_id = '00000000-0000-4000-8000-0000000a0001'
      AND role = 'owner' AND accepted_at IS NOT NULL AND revoked_at IS NULL$$,
  ARRAY[1],
  'bootstrap creates exactly one accepted owner membership'
);

SELECT results_eq(
  $$SELECT count(*)::int FROM public.household h
    JOIN public.household_membership hm ON hm.household_id = h.id
    WHERE hm.user_id = '00000000-0000-4000-8000-0000000a0001' AND h.created_by = hm.user_id$$,
  ARRAY[1],
  'bootstrap creates a household owned by the current user'
);

SELECT tests.as_postgres();
INSERT INTO tests.bootstrap_seen_households (user_label, household_id)
SELECT 'user_a', household_id
FROM public.household_membership
WHERE user_id = '00000000-0000-4000-8000-0000000a0001'
LIMIT 1;

INSERT INTO public.puppy (id, household_id, name, age_weeks_estimate)
SELECT
  '00000000-0000-4000-8000-0000000a0101',
  household_id,
  'Synthetic puppy',
  12
FROM tests.bootstrap_seen_households
WHERE user_label = 'user_a';

INSERT INTO public.household_membership (
  household_id,
  user_id,
  role,
  invited_by,
  accepted_at
)
SELECT
  household_id,
  '00000000-0000-4000-8000-0000000a0003',
  'caregiver',
  '00000000-0000-4000-8000-0000000a0001',
  now()
FROM tests.bootstrap_seen_households
WHERE user_label = 'user_a';

SELECT tests.as_auth('00000000-0000-4000-8000-0000000a0001');

-- Second call is idempotent: created = false, same household.
SELECT is(
  (SELECT created FROM public.bootstrap_current_user(NULL)),
  false,
  'second bootstrap call reports created = false'
);

SELECT results_eq(
  $$SELECT count(*)::int FROM public.household_membership
    WHERE user_id = '00000000-0000-4000-8000-0000000a0001' AND role = 'owner'$$,
  ARRAY[1],
  'idempotent bootstrap does not create a second membership'
);

-- A different user gets a distinct household.
SELECT tests.as_auth('00000000-0000-4000-8000-0000000a0002');
INSERT INTO tests.bootstrap_seen_households (user_label, household_id)
SELECT 'user_b', household_id
FROM public.bootstrap_current_user(NULL);

SELECT tests.as_postgres();
SELECT isnt(
  coalesce(
    (SELECT household_id FROM tests.bootstrap_seen_households WHERE user_label = 'user_b'),
    (SELECT household_id FROM tests.bootstrap_seen_households WHERE user_label = 'user_a')
  ),
  (SELECT household_id FROM tests.bootstrap_seen_households WHERE user_label = 'user_a'),
  'a second user is bootstrapped into a distinct household'
);

SELECT tests.as_auth('00000000-0000-4000-8000-0000000a0002');
SELECT results_eq(
  $$SELECT count(*)::int FROM public.household_membership
    WHERE user_id = '00000000-0000-4000-8000-0000000a0002' AND role = 'owner'$$,
  ARRAY[1],
  'second user has exactly one owner membership'
);

-- An invitee's accepted caregiver membership is a valid bootstrap target.
SELECT tests.as_auth('00000000-0000-4000-8000-0000000a0003');
SELECT is(
  (SELECT created FROM public.bootstrap_current_user(NULL)),
  false,
  'caregiver bootstrap reuses an accepted household'
);

SELECT is(
  (SELECT household_id FROM public.bootstrap_current_user(NULL)),
  (SELECT household_id FROM tests.bootstrap_seen_households WHERE user_label = 'user_a'),
  'caregiver bootstrap returns the shared household'
);

SELECT results_eq(
  $$SELECT count(*)::int FROM public.household_membership
    WHERE user_id = '00000000-0000-4000-8000-0000000a0003' AND role = 'owner'$$,
  ARRAY[0],
  'caregiver bootstrap does not create a stray owner membership'
);

-- Recover deterministically when an older empty owner household already exists.
SELECT tests.as_auth('00000000-0000-4000-8000-0000000a0004');
SELECT public.bootstrap_current_user(NULL);

SELECT tests.as_postgres();
INSERT INTO public.household_membership (
  household_id,
  user_id,
  role,
  invited_by,
  accepted_at
)
SELECT
  household_id,
  '00000000-0000-4000-8000-0000000a0004',
  'caregiver',
  '00000000-0000-4000-8000-0000000a0001',
  now()
FROM tests.bootstrap_seen_households
WHERE user_label = 'user_a';

SELECT tests.as_auth('00000000-0000-4000-8000-0000000a0004');
SELECT is(
  (SELECT created FROM public.bootstrap_current_user(NULL)),
  false,
  'bootstrap with an older empty household does not create another household'
);

SELECT is(
  (SELECT household_id FROM public.bootstrap_current_user(NULL)),
  (SELECT household_id FROM tests.bootstrap_seen_households WHERE user_label = 'user_a'),
  'bootstrap prefers the accepted household that has an active puppy'
);

SELECT results_eq(
  $$SELECT count(*)::int FROM public.household_membership
    WHERE user_id = '00000000-0000-4000-8000-0000000a0004'
      AND accepted_at IS NOT NULL AND revoked_at IS NULL$$,
  ARRAY[2],
  'bootstrap leaves existing memberships unchanged'
);

-- Anonymous SQL role lacks EXECUTE on the function.
SELECT tests.as_anon();
SELECT throws_ok(
  $$SELECT public.bootstrap_current_user(NULL)$$,
  '42501',
  NULL,
  'anonymous role cannot execute bootstrap_current_user'
);

SELECT * FROM finish();

ROLLBACK;
