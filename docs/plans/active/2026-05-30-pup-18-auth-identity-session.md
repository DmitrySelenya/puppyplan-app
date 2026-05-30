# PUP-18 Auth, Identity, Session Persistence, And New-User Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> This is the first implementation slice off the [Full PRD Native App Master Roadmap](2026-05-29-full-prd-native-app-master-roadmap.md) (Phase 1A). Read `AGENTS.md`, the roadmap, `docs/architecture/07-backend-topology.md`, `docs/architecture/08-data-model-and-rls.md`, and ADR-0007 before starting. Do not implement the whole roadmap from here — this plan is scoped to `PUP-18` only.

**Status:** Active.

**Plan type:** Active task plan.

**Current phase:** Phase 0 — Approvals and dependency gate.

**Linear:** `PUP-18` — Auth/identity ADR, session persistence, account boundary (to be created after roadmap approval; see roadmap "Suggested Linear Split").

**Goal:** A real Supabase Auth identity exists for every durable app session: a signed-out user signs in with an email one-time code, the session persists across app restarts and auto-refreshes, the router gates signed-out vs signed-in surfaces, a first-time user is bootstrapped into a household + owner membership, and the user can sign out.

**Architecture:** Supabase Auth (GoTrue) is the identity provider (already committed in `07-backend-topology.md`). The first sign-in method is **passwordless email OTP** (6-digit code). The session/identity layer in `src/lib/auth` is **provider-agnostic** — it only depends on the Supabase session — so Apple/Google sign-in can be added later by extending `src/lib/auth/api.ts` and the sign-in screen's provider list, without rewriting session, gating, or bootstrap. Session persistence uses **Expo SecureStore** (per the roadmap auth/session invariant). New-user bootstrap goes through a **SECURITY DEFINER RPC** because RLS denies direct `household`/`household_membership` inserts (proven by `supabase/tests/rls_baseline.sql`).

**Tech Stack:** Expo Router, React 19, TypeScript strict, `@supabase/supabase-js` Auth, TanStack Query (mutations), Zod contracts, `expo-secure-store` (new dep — gated), `react-i18next` typed keys, design primitives in `src/design`, pgTAP for RLS/RPC tests, Jest + `@testing-library/react-native`.

**Out of scope (non-goals):**
- Apple / Google / magic-link sign-in (architecture must accommodate; not wired here).
- Anonymous auth and anonymous→permanent upgrade (`enable_anonymous_sign_ins = false`; deferred).
- Account deletion / data export (deferred to PUP-30 settings).
- Onboarding / puppy profile / tracker setup (PUP-21) — bootstrap only creates an empty household + owner membership.
- Wiring Quick Log production mutations to the real session actor (PUP-23); this plan only provides the session so later slices can consume it.
- Deep-link invite/share pending-intent storage (PUP-26/PUP-28).

---

## Critical Constraints (read before coding)

1. **`app/` stays route-thin and Supabase-free.** `scripts/checks/check-navigation-contract.mjs` fails any file under `app/` that contains `@/lib/supabase`, `@supabase/supabase-js`, `createClient(`, or `console.*`. Route files may import `@/lib/auth` (the `useAuth` hook) and feature screens only.
2. **No raw user-facing strings.** Every visible string is a typed i18n key. `scripts/checks/check-i18n.mjs` enforces EN/RU/ES parity, placeholder parity, string budgets, and that every static `t('…')` key exists in `STRINGS.en.json`. Add `auth.*` keys to all three `STRINGS.*.json` files together.
3. **Design boundary.** Feature code uses `src/design` primitives only — no raw colors/spacing/`Pressable`. There is no text-input primitive yet, so this plan adds a `TextField` primitive.
4. **No new dependency without explicit user approval.** `expo-secure-store` is new — Task 0.1 is a hard gate.
5. **Supabase boundary.** Feature/UI never imports `@supabase/supabase-js`; it goes through `src/lib/auth` (which wraps `src/lib/supabase`).
6. **Privacy.** Never log or surface raw emails, tokens, or backend errors. Auth wrappers throw generic coded errors (`auth_request_otp_failed`), and the UI maps codes to i18n copy.
7. **Tests live in `src/test/**`** (flat; `testMatch` only matches `src/test/**`). pgTAP tests live in `supabase/tests/*.sql`, each file self-contained with its own `plan()`.
8. **TS strict, no `any`/`as unknown as` without an ADR.** ADR-0017 (this slice) authorizes exactly one narrow boundary cast for the not-yet-generated `bootstrap_current_user` RPC type; remove it when `database.types.ts` is regenerated.

---

## File Structure

**Database**
- Create `supabase/migrations/20260530120000_auth_bootstrap_rpc.sql` — `public.bootstrap_current_user(text)` SECURITY DEFINER; idempotently creates household + owner membership for `auth.uid()`.
- Create `supabase/tests/auth_bootstrap.sql` — pgTAP: bootstrap creates owner membership, is idempotent, isolates users, denies anon, and the function is SECURITY DEFINER with pinned `search_path`.

**Contracts**
- Create `src/contracts/auth.ts` — `authMethodSchema`/`AuthMethod` (`email_otp`|`apple`|`google`), `enabledAuthMethods`, `emailSchema`, `otpCodeSchema`, `sessionUserSchema`/`SessionUser`, `AuthStatus`, `bootstrapResultSchema`/`BootstrapResult`.

**Supabase / session persistence (provider-agnostic infra)**
- Create `src/lib/supabase/authStorage.ts` — SecureStore-backed `SupportedStorage` adapter with an in-memory fallback for non-native/test contexts.
- Modify `src/lib/supabase/client.ts` — `persistSession: true`, `autoRefreshToken: true`, `storage` adapter.
- Create `src/lib/auth/api.ts` — provider-agnostic Supabase Auth wrappers (OTP request/verify, session read, sign-out, auth-change subscription, auto-refresh start/stop).
- Create `src/lib/auth/bootstrap.ts` — `ensureUserBootstrapped()` calling the RPC.
- Create `src/lib/auth/context.tsx` — `AuthProvider` + `useAuth()` (status/user/signOut), runs bootstrap on sign-in, wires AppState auto-refresh.
- Create `src/lib/auth/index.ts` — barrel.

**Design primitive**
- Create `src/design/primitives/TextField.tsx` — labeled text input with optional error, tokenized + accessible.
- Modify `src/design/primitives/index.ts` — export `TextField`.

**Auth feature (UI)**
- Create `src/features/auth/hooks/useSignInFlow.ts` — local step machine (email ↔ code) via `useReducer` (no new dep; UI/workflow state).
- Create `src/features/auth/hooks/useEmailOtpSignIn.ts` — TanStack mutations for request + verify.
- Create `src/features/auth/components/SocialSignInButtons.tsx` — provider seam; renders enabled non-email methods (currently none).
- Create `src/features/auth/screens/SignInScreen.tsx` — email entry → code entry, design primitives + i18n.
- Create `src/features/auth/components/SignOutButton.tsx` — self-contained sign-out affordance.
- Create `src/features/auth/index.ts` — barrel.

**Routing**
- Modify `app/_layout.tsx` — wrap routes in `AuthProvider`, register `sign-in` screen.
- Modify `app/index.tsx` — gate by auth status.
- Create `app/sign-in.tsx` — renders `<SignInScreen />`; redirects to `/today` if already signed in.
- Modify `src/features/more/screens/MoreScreen.tsx` — render `<SignOutButton />`.

**i18n**
- Modify `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json` — add `auth` namespace (parity across all three).

**Docs**
- Create `docs/architecture/adr/0017-auth-identity-session.md`.
- Modify `docs/architecture/07-backend-topology.md`, `docs/architecture/08-data-model-and-rls.md`.
- Modify `docs/plans/active/2026-05-29-full-prd-native-app-master-roadmap.md` (status + resolved open question) and `docs/plans/README.md`.

**Tests (`src/test/**`)**
- `src/test/auth-contracts.test.ts`, `src/test/supabase-client.test.ts` (modify), `src/test/auth-storage.test.ts`, `src/test/auth-api.test.ts`, `src/test/auth-bootstrap.test.ts`, `src/test/auth-context.test.tsx`, `src/test/text-field.render.test.tsx`, `src/test/sign-in-screen.render.test.tsx`, `src/test/setup.ts` (modify — mock `expo-secure-store`).

---

## Phase 0 — Approvals And Dependency Gate

### Task 0.1: Get explicit approval for the `expo-secure-store` dependency

**Files:** none (process gate).

- [ ] **Step 1: Ask the user for explicit approval**

Per `AGENTS.md` ("Add dependencies only after explicit approval") request approval for exactly: add `expo-secure-store` (Expo SDK 55 compatible) to `dependencies`. State why: the roadmap auth/session invariant requires SecureStore-backed session persistence, and the current `src/lib/supabase/client.ts` uses `persistSession: false` as a deliberate placeholder until this adapter exists.

Do not proceed to Task 0.2 until the user names the action as approved.

- [ ] **Step 2: Install the approved dependency**

Run: `npx expo install expo-secure-store`
Expected: `expo-secure-store` is added to `package.json` `dependencies` with an SDK-55-compatible version, and `package-lock.json` updates.

- [ ] **Step 3: Verify install does not break the typecheck baseline**

Run: `npm run typecheck`
Expected: PASS (no new errors; no source references it yet).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "PUP-18 add expo-secure-store dependency for session persistence"
```

---

## Phase 1 — Auth Contracts

### Task 1.1: Define the auth contracts

**Files:**
- Create: `src/contracts/auth.ts`
- Test: `src/test/auth-contracts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/auth-contracts.test.ts
import {
  authMethodSchema,
  bootstrapResultSchema,
  emailSchema,
  enabledAuthMethods,
  otpCodeSchema,
  sessionUserSchema,
} from '@/contracts/auth';

describe('auth contracts', () => {
  it('reserves apple and google in the method union but enables only email_otp now', () => {
    expect(authMethodSchema.options).toEqual(['email_otp', 'apple', 'google']);
    expect(enabledAuthMethods).toEqual(['email_otp']);
  });

  it('normalizes emails to trimmed lowercase and rejects invalid input', () => {
    expect(emailSchema.parse('  Owner@Example.COM ')).toBe('owner@example.com');
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('accepts only six-digit OTP codes', () => {
    expect(otpCodeSchema.parse('123456')).toBe('123456');
    expect(otpCodeSchema.safeParse('12345').success).toBe(false);
    expect(otpCodeSchema.safeParse('abcdef').success).toBe(false);
  });

  it('parses a session user with a nullable email', () => {
    const id = '00000000-0000-4000-8000-000000000101';
    expect(sessionUserSchema.parse({ id, email: 'owner@example.com' })).toEqual({
      id,
      email: 'owner@example.com',
    });
    expect(sessionUserSchema.parse({ id, email: null })).toEqual({ id, email: null });
  });

  it('parses the bootstrap RPC result row', () => {
    const householdId = '00000000-0000-4000-8000-000000000201';
    expect(bootstrapResultSchema.parse({ household_id: householdId, created: true })).toEqual({
      household_id: householdId,
      created: true,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/test/auth-contracts.test.ts`
Expected: FAIL — cannot find module `@/contracts/auth`.

- [ ] **Step 3: Write the contract**

```ts
// src/contracts/auth.ts
import { z } from 'zod';

import { uuidSchema } from './supabase';

export const authMethods = ['email_otp', 'apple', 'google'] as const;
export const authMethodSchema = z.enum(authMethods);
export type AuthMethod = z.infer<typeof authMethodSchema>;

// Apple/Google are reserved in the union so the session layer and sign-in UI
// accept them without a rewrite. Only email_otp is wired in PUP-18.
export const enabledAuthMethods = ['email_otp'] as const satisfies readonly AuthMethod[];

export const emailSchema = z.string().trim().toLowerCase().pipe(z.string().email());
export type Email = z.infer<typeof emailSchema>;

export const otpCodeSchema = z.string().trim().regex(/^\d{6}$/);
export type OtpCode = z.infer<typeof otpCodeSchema>;

export const sessionUserSchema = z
  .object({
    id: uuidSchema,
    email: z.string().email().nullable(),
  })
  .strict();
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const authStatuses = ['loading', 'signedOut', 'signedIn'] as const;
export type AuthStatus = (typeof authStatuses)[number];

// SECURITY DEFINER bootstrap_current_user(text) returns one row.
export const bootstrapResultSchema = z
  .object({
    household_id: uuidSchema,
    created: z.boolean(),
  })
  .strict();
export type BootstrapResult = z.infer<typeof bootstrapResultSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/test/auth-contracts.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/contracts/auth.ts src/test/auth-contracts.test.ts
git commit -m "PUP-18 add auth contracts"
```

---

## Phase 2 — New-User Bootstrap (Database)

> RLS denies direct `household` and `household_membership` inserts from authenticated clients (`supabase/tests/rls_baseline.sql` lines ~952-966). A SECURITY DEFINER RPC is the only path to create the first household + owner membership. Follow ADR-0006 (migrations + pgTAP) and `07-backend-topology.md` (SECURITY DEFINER pins `search_path`, checks `auth.uid()`).

### Task 2.1: Add the bootstrap RPC migration

**Files:**
- Create: `supabase/migrations/20260530120000_auth_bootstrap_rpc.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Sanity-check SQL shape locally**

Run: `node -e "const s=require('fs').readFileSync('supabase/migrations/20260530120000_auth_bootstrap_rpc.sql','utf8'); if(!/SECURITY DEFINER/.test(s)||!/SET search_path = ''/.test(s)||!/GRANT EXECUTE ON FUNCTION public.bootstrap_current_user\(text\) TO authenticated/.test(s)) {throw new Error('bootstrap migration missing required clauses')}; console.log('bootstrap migration shape ok')"`
Expected: `bootstrap migration shape ok`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260530120000_auth_bootstrap_rpc.sql
git commit -m "PUP-18 add bootstrap_current_user RPC migration"
```

### Task 2.2: Add pgTAP coverage for the bootstrap RPC

**Files:**
- Create: `supabase/tests/auth_bootstrap.sql`

- [ ] **Step 1: Write the pgTAP test (self-contained file with its own plan)**

```sql
-- supabase/tests/auth_bootstrap.sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(9);

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

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-0000000a0001', 'authenticated', 'authenticated', 'bootstrap-a@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-0000000a0002', 'authenticated', 'authenticated', 'bootstrap-b@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

-- Function shape: SECURITY DEFINER with a pinned empty search_path.
SELECT results_eq(
  $$SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'bootstrap_current_user'
      AND p.prosecdef
      AND 'search_path=' = ANY(coalesce(p.proconfig, ARRAY[]::text[]))$$,
  ARRAY[1],
  'bootstrap_current_user is SECURITY DEFINER with a pinned empty search_path'
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
SELECT isnt(
  (SELECT household_id FROM public.bootstrap_current_user(NULL)),
  (SELECT household_id FROM public.household_membership
     WHERE user_id = '00000000-0000-4000-8000-0000000a0001' LIMIT 1),
  'a second user is bootstrapped into a distinct household'
);

SELECT results_eq(
  $$SELECT count(*)::int FROM public.household_membership
    WHERE user_id = '00000000-0000-4000-8000-0000000a0002' AND role = 'owner'$$,
  ARRAY[1],
  'second user has exactly one owner membership'
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
```

- [ ] **Step 2: Run the remote Supabase test gate (requires credentials + user approval)**

The bootstrap pgTAP runs against the hosted dev project via the existing CLI wrapper. Pushing the new migration to remote dev is a gated action — request explicit approval naming "run `npm run supabase:ci:remote` for PUP-18 (push dev migration + pgTAP)" before running it.

Run (after approval): `npm run supabase:ci:remote`
Expected: pgTAP reports the bootstrap file passing (9 of N tests added), lint clean, dry-run clean.

If approval/credentials are unavailable, mark this step blocked in Linear and proceed with the rest of the plan; the migration + test files are still committed and reviewable.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/auth_bootstrap.sql
git commit -m "PUP-18 add pgTAP coverage for bootstrap_current_user"
```

---

## Phase 3 — Session Persistence (SecureStore + Supabase client)

### Task 3.1: Add the SecureStore auth-storage adapter

**Files:**
- Create: `src/lib/supabase/authStorage.ts`
- Test: `src/test/auth-storage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/auth-storage.test.ts
import { createSecureStoreAuthStorage } from '@/lib/supabase/authStorage';

describe('SecureStore auth storage adapter', () => {
  it('delegates get/set/remove to the injected SecureStore module', async () => {
    const store = new Map<string, string>();
    const secureStore = {
      getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
      setItemAsync: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      deleteItemAsync: jest.fn(async (key: string) => {
        store.delete(key);
      }),
    };
    const storage = createSecureStoreAuthStorage(secureStore);

    await storage.setItem('sb-session', 'token');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('sb-session', 'token');
    expect(await storage.getItem('sb-session')).toBe('token');

    await storage.removeItem('sb-session');
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('sb-session');
    expect(await storage.getItem('sb-session')).toBeNull();
  });

  it('falls back to in-memory storage when SecureStore is unavailable', async () => {
    const storage = createSecureStoreAuthStorage(null);

    expect(await storage.getItem('missing')).toBeNull();
    await storage.setItem('k', 'v');
    expect(await storage.getItem('k')).toBe('v');
    await storage.removeItem('k');
    expect(await storage.getItem('k')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/test/auth-storage.test.ts`
Expected: FAIL — cannot find module `@/lib/supabase/authStorage`.

- [ ] **Step 3: Write the adapter**

```ts
// src/lib/supabase/authStorage.ts
import type { SupportedStorage } from '@supabase/supabase-js';

export type SecureStoreModule = Readonly<{
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}>;

// SecureStore is resolved lazily so unit tests and any non-native context that
// never builds the real client do not require the native module.
function loadSecureStore(): SecureStoreModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as SecureStoreModule;
  } catch {
    return null;
  }
}

export function createSecureStoreAuthStorage(
  secureStore: SecureStoreModule | null = loadSecureStore(),
): SupportedStorage {
  if (secureStore === null) {
    const memory = new Map<string, string>();

    return {
      getItem: async (key) => memory.get(key) ?? null,
      setItem: async (key, value) => {
        memory.set(key, value);
      },
      removeItem: async (key) => {
        memory.delete(key);
      },
    };
  }

  return {
    getItem: (key) => secureStore.getItemAsync(key),
    setItem: (key, value) => secureStore.setItemAsync(key, value),
    removeItem: (key) => secureStore.deleteItemAsync(key),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/test/auth-storage.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/authStorage.ts src/test/auth-storage.test.ts
git commit -m "PUP-18 add SecureStore auth storage adapter"
```

### Task 3.2: Mock `expo-secure-store` in the Jest setup

**Files:**
- Modify: `src/test/setup.ts`

- [ ] **Step 1: Add the mock at the top of the setup file**

Add to `src/test/setup.ts` (after the existing `react-native-safe-area-context` mock):

```ts
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
```

- [ ] **Step 2: Run the full unit suite to confirm no regressions**

Run: `npm run test:unit`
Expected: PASS (existing suites still green; new auth suites green).

- [ ] **Step 3: Commit**

```bash
git add src/test/setup.ts
git commit -m "PUP-18 mock expo-secure-store in jest setup"
```

### Task 3.3: Persist and auto-refresh the Supabase session

**Files:**
- Modify: `src/lib/supabase/client.ts`
- Modify: `src/test/supabase-client.test.ts`

- [ ] **Step 1: Update the failing test to assert persistence + storage**

Replace the first assertion test in `src/test/supabase-client.test.ts` with:

```ts
  it('creates the client with a persisted, auto-refreshed, SecureStore-backed session', () => {
    createClient.mockReturnValue({ kind: 'supabase-client' });

    const client = createPuppyPlanSupabaseClient(config);

    expect(client).toEqual({ kind: 'supabase-client' });
    expect(createClient).toHaveBeenCalledWith(
      config.url,
      config.publishableKey,
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          detectSessionInUrl: false,
          persistSession: true,
          storage: expect.objectContaining({
            getItem: expect.any(Function),
            setItem: expect.any(Function),
            removeItem: expect.any(Function),
          }),
        }),
      }),
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/test/supabase-client.test.ts`
Expected: FAIL — current client uses `persistSession: false` and no `storage`.

- [ ] **Step 3: Update the client**

```ts
// src/lib/supabase/client.ts
import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { createSecureStoreAuthStorage } from './authStorage';
import { readSupabasePublicConfig, type SupabasePublicConfig } from './env';

let cachedClient: SupabaseClient | undefined;

export function createPuppyPlanSupabaseClient(
  config: SupabasePublicConfig = readSupabasePublicConfig(),
): SupabaseClient {
  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: createSecureStoreAuthStorage(),
    },
  });
}

export function getSupabaseClient(): SupabaseClient {
  cachedClient ??= createPuppyPlanSupabaseClient();
  return cachedClient;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/test/supabase-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/client.ts src/test/supabase-client.test.ts
git commit -m "PUP-18 persist and auto-refresh Supabase session via SecureStore"
```

---

## Phase 4 — Provider-Agnostic Auth API

> This module is the only place that touches `supabase.auth`. The session-shaped functions (`getCurrentUser`, `subscribeToAuthChanges`, `signOut`, auto-refresh) are method-agnostic. The OTP functions are the method-specific seam; future `signInWithApple`/`signInWithGoogle` go here too. All errors are generic coded `Error`s — never surface raw backend errors or the email.

### Task 4.1: Implement the auth API wrappers

**Files:**
- Create: `src/lib/auth/api.ts`
- Test: `src/test/auth-api.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/auth-api.test.ts
import {
  getCurrentUser,
  requestEmailOtp,
  signOut,
  subscribeToAuthChanges,
  toSessionUser,
  verifyEmailOtp,
} from '@/lib/auth/api';
import { getSupabaseClient } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ getSupabaseClient: jest.fn() }));

const getSupabaseClientMock = getSupabaseClient as jest.MockedFunction<typeof getSupabaseClient>;

function mockAuth(auth: Record<string, unknown>) {
  getSupabaseClientMock.mockReturnValue({ auth } as never);
}

const userId = '00000000-0000-4000-8000-000000000101';

describe('auth api', () => {
  beforeEach(() => {
    getSupabaseClientMock.mockReset();
  });

  it('maps a supabase session into a parsed SessionUser', () => {
    expect(toSessionUser({ user: { id: userId, email: 'owner@example.com' } } as never)).toEqual({
      id: userId,
      email: 'owner@example.com',
    });
    expect(toSessionUser(null)).toBeNull();
  });

  it('requests an email OTP and creates the user when needed', async () => {
    const signInWithOtp = jest.fn(async () => ({ error: null }));
    mockAuth({ signInWithOtp });

    await requestEmailOtp('owner@example.com');

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'owner@example.com',
      options: { shouldCreateUser: true },
    });
  });

  it('throws a generic error when OTP request fails', async () => {
    mockAuth({ signInWithOtp: jest.fn(async () => ({ error: { message: 'rate limited' } })) });

    await expect(requestEmailOtp('owner@example.com')).rejects.toThrow('auth_request_otp_failed');
  });

  it('verifies an OTP and returns the session user', async () => {
    mockAuth({
      verifyOtp: jest.fn(async () => ({
        data: { session: { user: { id: userId, email: 'owner@example.com' } } },
        error: null,
      })),
    });

    await expect(verifyEmailOtp({ email: 'owner@example.com', token: '123456' })).resolves.toEqual({
      id: userId,
      email: 'owner@example.com',
    });
  });

  it('throws a generic error when OTP verification has no session', async () => {
    mockAuth({ verifyOtp: jest.fn(async () => ({ data: { session: null }, error: null })) });

    await expect(verifyEmailOtp({ email: 'owner@example.com', token: '000000' })).rejects.toThrow(
      'auth_verify_otp_failed',
    );
  });

  it('reads the current user from the active session', async () => {
    mockAuth({
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: userId, email: null } } },
      })),
    });

    await expect(getCurrentUser()).resolves.toEqual({ id: userId, email: null });
  });

  it('signs out through the supabase client', async () => {
    const supaSignOut = jest.fn(async () => ({ error: null }));
    mockAuth({ signOut: supaSignOut });

    await signOut();

    expect(supaSignOut).toHaveBeenCalledTimes(1);
  });

  it('subscribes to auth changes and forwards mapped users', () => {
    const unsubscribe = jest.fn();
    let captured: (event: string, session: unknown) => void = () => {};
    mockAuth({
      onAuthStateChange: jest.fn((handler: (event: string, session: unknown) => void) => {
        captured = handler;
        return { data: { subscription: { unsubscribe } } };
      }),
    });
    const received: unknown[] = [];

    const dispose = subscribeToAuthChanges((user) => received.push(user));
    captured('SIGNED_IN', { user: { id: userId, email: 'owner@example.com' } });
    captured('SIGNED_OUT', null);
    dispose();

    expect(received).toEqual([{ id: userId, email: 'owner@example.com' }, null]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/test/auth-api.test.ts`
Expected: FAIL — cannot find module `@/lib/auth/api`.

- [ ] **Step 3: Implement the API**

```ts
// src/lib/auth/api.ts
import type { Session } from '@supabase/supabase-js';

import { sessionUserSchema, type SessionUser } from '@/contracts/auth';
import { getSupabaseClient } from '@/lib/supabase';

export type AuthChangeHandler = (user: SessionUser | null) => void;

export function toSessionUser(session: Session | null): SessionUser | null {
  if (!session?.user) {
    return null;
  }

  return sessionUserSchema.parse({
    id: session.user.id,
    email: session.user.email ?? null,
  });
}

export async function requestEmailOtp(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    throw new Error('auth_request_otp_failed');
  }
}

export async function verifyEmailOtp(input: Readonly<{ email: string; token: string }>): Promise<SessionUser> {
  const { data, error } = await getSupabaseClient().auth.verifyOtp({
    email: input.email,
    token: input.token,
    type: 'email',
  });

  const user = error ? null : toSessionUser(data.session ?? null);

  if (!user) {
    throw new Error('auth_verify_otp_failed');
  }

  return user;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const { data } = await getSupabaseClient().auth.getSession();

  return toSessionUser(data.session ?? null);
}

export async function signOut(): Promise<void> {
  await getSupabaseClient().auth.signOut();
}

export function subscribeToAuthChanges(handler: AuthChangeHandler): () => void {
  const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
    handler(toSessionUser(session));
  });

  return () => data.subscription.unsubscribe();
}

export function startAutoRefresh(): void {
  void getSupabaseClient().auth.startAutoRefresh();
}

export function stopAutoRefresh(): void {
  void getSupabaseClient().auth.stopAutoRefresh();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/test/auth-api.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/lib/auth/api.ts src/test/auth-api.test.ts
git commit -m "PUP-18 add provider-agnostic auth api wrappers"
```

---

## Phase 5 — New-User Bootstrap Client

### Task 5.1: Implement `ensureUserBootstrapped`

**Files:**
- Create: `src/lib/auth/bootstrap.ts`
- Test: `src/test/auth-bootstrap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/auth-bootstrap.test.ts
import { ensureUserBootstrapped } from '@/lib/auth/bootstrap';

const householdId = '00000000-0000-4000-8000-000000000201';

describe('ensureUserBootstrapped', () => {
  it('calls the bootstrap RPC with a null display name and parses the row', async () => {
    const rpc = jest.fn(async () => ({
      data: [{ household_id: householdId, created: true }],
      error: null,
    }));

    await expect(ensureUserBootstrapped(rpc)).resolves.toEqual({
      household_id: householdId,
      created: true,
    });
    expect(rpc).toHaveBeenCalledWith({ p_display_name: null });
  });

  it('accepts a single-object RPC result as well as a row array', async () => {
    const rpc = jest.fn(async () => ({
      data: { household_id: householdId, created: false },
      error: null,
    }));

    await expect(ensureUserBootstrapped(rpc)).resolves.toEqual({
      household_id: householdId,
      created: false,
    });
  });

  it('throws a generic error when the RPC fails', async () => {
    const rpc = jest.fn(async () => ({ data: null, error: { message: 'denied' } }));

    await expect(ensureUserBootstrapped(rpc)).rejects.toThrow('auth_bootstrap_failed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/test/auth-bootstrap.test.ts`
Expected: FAIL — cannot find module `@/lib/auth/bootstrap`.

- [ ] **Step 3: Implement bootstrap**

```ts
// src/lib/auth/bootstrap.ts
import { bootstrapResultSchema, type BootstrapResult } from '@/contracts/auth';
import { getSupabaseClient } from '@/lib/supabase';

export type BootstrapRpc = (
  args: Readonly<{ p_display_name: string | null }>,
) => PromiseLike<{ data: unknown; error: unknown }>;

function defaultBootstrapRpc(): BootstrapRpc {
  // ADR-0017: database.types.ts will type this RPC once the bootstrap migration
  // is approved and pushed. Until then the rpc name is reached through this one
  // documented narrow boundary cast. Remove the cast after `npm run db:types`.
  const client = getSupabaseClient() as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  };

  return (args) => client.rpc('bootstrap_current_user', { ...args });
}

export async function ensureUserBootstrapped(
  rpc: BootstrapRpc = defaultBootstrapRpc(),
): Promise<BootstrapResult> {
  const { data, error } = await rpc({ p_display_name: null });

  if (error) {
    throw new Error('auth_bootstrap_failed');
  }

  const row = Array.isArray(data) ? data[0] : data;

  return bootstrapResultSchema.parse(row);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/test/auth-bootstrap.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/lib/auth/bootstrap.ts src/test/auth-bootstrap.test.ts
git commit -m "PUP-18 add new-user bootstrap client"
```

---

## Phase 6 — Auth Context (session state, bootstrap-on-sign-in, auto-refresh)

### Task 6.1: Implement `AuthProvider` + `useAuth`

**Files:**
- Create: `src/lib/auth/context.tsx`
- Test: `src/test/auth-context.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/test/auth-context.test.tsx
import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';

import { AuthProvider, useAuth, type AuthProviderDependencies } from '@/lib/auth/context';
import type { SessionUser } from '@/contracts/auth';

const userId = '00000000-0000-4000-8000-000000000101';
const user: SessionUser = { id: userId, email: 'owner@example.com' };

function Probe() {
  const { status, user: current } = useAuth();
  return <Text>{`${status}:${current?.id ?? 'none'}`}</Text>;
}

function makeDeps(overrides: Partial<AuthProviderDependencies> = {}) {
  let emit: (next: SessionUser | null) => void = () => {};
  const deps: AuthProviderDependencies = {
    getCurrentUser: jest.fn(async () => null),
    subscribeToAuthChanges: jest.fn((handler: (u: SessionUser | null) => void) => {
      emit = handler;
      return jest.fn();
    }),
    signOut: jest.fn(async () => {}),
    bootstrap: jest.fn(async () => ({ household_id: 'h', created: true })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
    appState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
    ...overrides,
  };
  return { deps, emit: (next: SessionUser | null) => emit(next) };
}

describe('AuthProvider', () => {
  it('resolves to signedOut when there is no restored session', async () => {
    const { deps } = makeDeps();

    render(
      <AuthProvider dependencies={deps}>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('signedOut:none')).toBeTruthy());
  });

  it('restores a signed-in session and bootstraps the user once', async () => {
    const bootstrap = jest.fn(async () => ({ household_id: 'h', created: true }));
    const { deps } = makeDeps({ getCurrentUser: jest.fn(async () => user), bootstrap });

    render(
      <AuthProvider dependencies={deps}>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText(`signedIn:${userId}`)).toBeTruthy());
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });

  it('updates status when auth changes are emitted', async () => {
    const { deps, emit } = makeDeps();

    render(
      <AuthProvider dependencies={deps}>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('signedOut:none')).toBeTruthy());
    await act(async () => {
      emit(user);
    });
    await waitFor(() => expect(screen.getByText(`signedIn:${userId}`)).toBeTruthy());
  });

  it('starts auto-refresh on mount and wires AppState', () => {
    const addEventListener = jest.fn(() => ({ remove: jest.fn() }));
    const startAutoRefresh = jest.fn();
    const { deps } = makeDeps({
      startAutoRefresh,
      appState: { currentState: 'active', addEventListener },
    });

    render(
      <AuthProvider dependencies={deps}>
        <Probe />
      </AuthProvider>,
    );

    expect(startAutoRefresh).toHaveBeenCalled();
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/test/auth-context.test.tsx`
Expected: FAIL — cannot find module `@/lib/auth/context`.

- [ ] **Step 3: Implement the context**

```tsx
// src/lib/auth/context.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

import type { AuthStatus, SessionUser } from '@/contracts/auth';

import * as authApi from './api';
import { ensureUserBootstrapped } from './bootstrap';

export type AuthContextValue = Readonly<{
  status: AuthStatus;
  user: SessionUser | null;
  signOut: () => Promise<void>;
}>;

type AppStateLike = Readonly<{
  currentState: AppStateStatus;
  addEventListener: (type: 'change', handler: (state: AppStateStatus) => void) => NativeEventSubscription;
}>;

export type AuthProviderDependencies = Readonly<{
  getCurrentUser?: () => Promise<SessionUser | null>;
  subscribeToAuthChanges?: (handler: (user: SessionUser | null) => void) => () => void;
  signOut?: () => Promise<void>;
  bootstrap?: () => Promise<unknown>;
  startAutoRefresh?: () => void;
  stopAutoRefresh?: () => void;
  appState?: AppStateLike;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  dependencies,
}: PropsWithChildren<{ dependencies?: AuthProviderDependencies }>) {
  const deps = useMemo<Required<AuthProviderDependencies>>(
    () => ({
      getCurrentUser: dependencies?.getCurrentUser ?? authApi.getCurrentUser,
      subscribeToAuthChanges: dependencies?.subscribeToAuthChanges ?? authApi.subscribeToAuthChanges,
      signOut: dependencies?.signOut ?? authApi.signOut,
      bootstrap: dependencies?.bootstrap ?? ensureUserBootstrapped,
      startAutoRefresh: dependencies?.startAutoRefresh ?? authApi.startAutoRefresh,
      stopAutoRefresh: dependencies?.stopAutoRefresh ?? authApi.stopAutoRefresh,
      appState: dependencies?.appState ?? AppState,
    }),
    [dependencies],
  );

  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const bootstrappedUserIds = useRef(new Set<string>());

  useEffect(() => {
    let active = true;

    const applyUser = (nextUser: SessionUser | null) => {
      if (!active) {
        return;
      }

      setUser(nextUser);
      setStatus(nextUser ? 'signedIn' : 'signedOut');

      if (nextUser && !bootstrappedUserIds.current.has(nextUser.id)) {
        bootstrappedUserIds.current.add(nextUser.id);
        void deps.bootstrap().catch(() => {
          bootstrappedUserIds.current.delete(nextUser.id);
        });
      }
    };

    void deps
      .getCurrentUser()
      .then(applyUser)
      .catch(() => {
        if (active) {
          setStatus('signedOut');
        }
      });

    const unsubscribe = deps.subscribeToAuthChanges(applyUser);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [deps]);

  useEffect(() => {
    deps.startAutoRefresh();

    const subscription = deps.appState.addEventListener('change', (state) => {
      if (state === 'active') {
        deps.startAutoRefresh();
      } else {
        deps.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
      deps.stopAutoRefresh();
    };
  }, [deps]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signOut: async () => {
        await deps.signOut();
      },
    }),
    [status, user, deps],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return value;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/test/auth-context.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/context.tsx src/test/auth-context.test.tsx
git commit -m "PUP-18 add AuthProvider session context with bootstrap and auto-refresh"
```

### Task 6.2: Add the auth barrel

**Files:**
- Create: `src/lib/auth/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
// src/lib/auth/index.ts
export {
  getCurrentUser,
  requestEmailOtp,
  signOut,
  startAutoRefresh,
  stopAutoRefresh,
  subscribeToAuthChanges,
  toSessionUser,
  verifyEmailOtp,
  type AuthChangeHandler,
} from './api';
export { ensureUserBootstrapped, type BootstrapRpc } from './bootstrap';
export {
  AuthProvider,
  useAuth,
  type AuthContextValue,
  type AuthProviderDependencies,
} from './context';
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/lib/auth/index.ts
git commit -m "PUP-18 add auth lib barrel"
```

---

## Phase 7 — i18n Copy And `TextField` Primitive

### Task 7.1: Add the `auth` i18n namespace to all three locales

**Files:**
- Modify: `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json`

- [ ] **Step 1: Add the `auth` block to `STRINGS.en.json`**

Insert a top-level `"auth"` key (object). Use exactly these keys/values:

```json
  "auth": {
    "title": "Sign in to PuppyPlan",
    "subtitle": "We keep your puppy's data private to your household.",
    "email": {
      "label": "Email",
      "placeholder": "you@example.com",
      "cta": "Send code"
    },
    "code": {
      "label": "6-digit code",
      "placeholder": "123456",
      "sent-helper": "Enter the code we sent to {email}.",
      "cta": "Verify code",
      "resend": "Send a new code",
      "back": "Use a different email"
    },
    "sign-out": {
      "cta": "Sign out"
    },
    "errors": {
      "invalid-email": "Enter a valid email address.",
      "invalid-code": "Enter the 6-digit code.",
      "request-failed": "We couldn't send a code. Check your connection and try again.",
      "verify-failed": "That code didn't work. Request a new one and try again."
    }
  }
```

- [ ] **Step 2: Add the parity `auth` block to `STRINGS.ru.json`**

```json
  "auth": {
    "title": "Вход в PuppyPlan",
    "subtitle": "Данные о щенке доступны только вашей семье.",
    "email": {
      "label": "Эл. почта",
      "placeholder": "you@example.com",
      "cta": "Отправить код"
    },
    "code": {
      "label": "Код из 6 цифр",
      "placeholder": "123456",
      "sent-helper": "Введите код, отправленный на {email}.",
      "cta": "Подтвердить",
      "resend": "Отправить новый код",
      "back": "Другой адрес почты"
    },
    "sign-out": {
      "cta": "Выйти"
    },
    "errors": {
      "invalid-email": "Введите корректный адрес почты.",
      "invalid-code": "Введите код из 6 цифр.",
      "request-failed": "Не удалось отправить код. Проверьте связь и повторите.",
      "verify-failed": "Код не подошёл. Запросите новый и повторите."
    }
  }
```

- [ ] **Step 3: Add the parity `auth` block to `STRINGS.es.json`**

```json
  "auth": {
    "title": "Inicia sesión en PuppyPlan",
    "subtitle": "Los datos de tu cachorro son privados para tu hogar.",
    "email": {
      "label": "Correo",
      "placeholder": "tu@ejemplo.com",
      "cta": "Enviar código"
    },
    "code": {
      "label": "Código de 6 dígitos",
      "placeholder": "123456",
      "sent-helper": "Escribe el código que enviamos a {email}.",
      "cta": "Verificar",
      "resend": "Enviar un código nuevo",
      "back": "Usar otro correo"
    },
    "sign-out": {
      "cta": "Cerrar sesión"
    },
    "errors": {
      "invalid-email": "Escribe un correo válido.",
      "invalid-code": "Escribe el código de 6 dígitos.",
      "request-failed": "No pudimos enviar el código. Revisa tu conexión e inténtalo otra vez.",
      "verify-failed": "Ese código no funcionó. Solicita uno nuevo e inténtalo otra vez."
    }
  }
```

- [ ] **Step 4: Verify i18n parity, placeholder parity, and budgets**

Run: `node scripts/checks/check-i18n.mjs`
Expected: `i18n parity, typed helper usage, and string budgets ok` (the `{email}` placeholder is present in all three `code.sent-helper` values; `email.cta`, `code.cta`, and `sign-out.cta` are within the 34-grapheme `fab-cta-labels` budget).

- [ ] **Step 5: Commit**

```bash
git add STRINGS.en.json STRINGS.ru.json STRINGS.es.json
git commit -m "PUP-18 add auth i18n copy in EN/RU/ES"
```

### Task 7.2: Add the `TextField` design primitive

**Files:**
- Create: `src/design/primitives/TextField.tsx`
- Modify: `src/design/primitives/index.ts`
- Test: `src/test/text-field.render.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/test/text-field.render.test.tsx
import { render, screen } from '@testing-library/react-native';

import { TextField } from '@/design/primitives/TextField';

describe('TextField', () => {
  it('renders the label and uses it as the input accessibility label', () => {
    render(<TextField label="Email" value="" onChangeText={() => {}} />);

    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('shows error text and marks the field invalid when errorText is set', () => {
    render(<TextField label="Email" value="x" onChangeText={() => {}} errorText="Enter a valid email address." />);

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByLabelText('Email').props.accessibilityState).toMatchObject({ invalid: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/test/text-field.render.test.tsx`
Expected: FAIL — cannot find module `@/design/primitives/TextField`.

- [ ] **Step 3: Implement the primitive**

```tsx
// src/design/primitives/TextField.tsx
import { forwardRef } from 'react';
import type { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/design/primitives/AppText';
import { tokens } from '@/design/tokens';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  errorText?: string;
};

export const TextField = forwardRef<RNTextInput, TextFieldProps>(function TextField(
  { label, errorText, accessibilityLabel, ...props },
  ref,
) {
  const hasError = Boolean(errorText);

  return (
    <View style={styles.root}>
      <AppText tone="secondary" variant="subheadline">
        {label}
      </AppText>
      <TextInput
        {...props}
        ref={ref}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ invalid: hasError }}
        placeholderTextColor={tokens.color.text.tertiary}
        style={[styles.input, hasError ? styles.inputError : null]}
      />
      {hasError ? (
        <AppText style={styles.errorText} variant="footnote">
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  errorText: {
    color: tokens.color.status.danger,
  },
  input: {
    backgroundColor: tokens.color.surface.base,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    color: tokens.color.text.primary,
    fontSize: tokens.typography.scale.body.fontSize,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  inputError: {
    borderColor: tokens.color.status.danger,
  },
  root: {
    gap: tokens.space[2],
  },
});
```

- [ ] **Step 4: Export from the primitives barrel**

Add to `src/design/primitives/index.ts` (keep alphabetical grouping near `SwitchRow`/`TrackerTile`):

```ts
export { TextField, type TextFieldProps } from '@/design/primitives/TextField';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit -- src/test/text-field.render.test.tsx`
Expected: PASS (2 tests).

> Token names confirmed against `design-tokens.json` at authoring time: `color.surface.base`, `color.stroke.default`, `color.status.danger`, `color.text.tertiary`, `color.text.primary`, `radius.sm`, `space[2]`, `space[3]`, `typography.scale.body.fontSize`. If any drift, open `src/design/tokens.ts` and substitute the nearest existing token.

- [ ] **Step 6: Commit**

```bash
git add src/design/primitives/TextField.tsx src/design/primitives/index.ts src/test/text-field.render.test.tsx
git commit -m "PUP-18 add TextField design primitive"
```

---

## Phase 8 — Sign-In Feature UI

### Task 8.1: Add the sign-in flow step machine

**Files:**
- Create: `src/features/auth/hooks/useSignInFlow.ts`
- Test: `src/test/sign-in-flow.test.ts`

- [ ] **Step 1: Write the failing test (pure reducer)**

```ts
// src/test/sign-in-flow.test.ts
import { signInFlowReducer, initialSignInFlowState } from '@/features/auth/hooks/useSignInFlow';

describe('signInFlowReducer', () => {
  it('starts on the email step', () => {
    expect(initialSignInFlowState).toEqual({ step: 'email', email: '' });
  });

  it('moves to the code step and stores the email when a code is requested', () => {
    expect(signInFlowReducer(initialSignInFlowState, { type: 'codeRequested', email: 'owner@example.com' })).toEqual({
      step: 'code',
      email: 'owner@example.com',
    });
  });

  it('returns to the email step on back', () => {
    const codeState = { step: 'code', email: 'owner@example.com' } as const;
    expect(signInFlowReducer(codeState, { type: 'backToEmail' })).toEqual({
      step: 'email',
      email: 'owner@example.com',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/test/sign-in-flow.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement the hook + reducer**

```ts
// src/features/auth/hooks/useSignInFlow.ts
import { useReducer } from 'react';

export type SignInStep = 'email' | 'code';

export type SignInFlowState = Readonly<{
  step: SignInStep;
  email: string;
}>;

export type SignInFlowAction =
  | Readonly<{ type: 'codeRequested'; email: string }>
  | Readonly<{ type: 'backToEmail' }>;

export const initialSignInFlowState: SignInFlowState = { step: 'email', email: '' };

export function signInFlowReducer(state: SignInFlowState, action: SignInFlowAction): SignInFlowState {
  switch (action.type) {
    case 'codeRequested':
      return { step: 'code', email: action.email };
    case 'backToEmail':
      return { step: 'email', email: state.email };
    default:
      return state;
  }
}

export function useSignInFlow() {
  const [state, dispatch] = useReducer(signInFlowReducer, initialSignInFlowState);

  return {
    step: state.step,
    email: state.email,
    goToCode: (email: string) => dispatch({ type: 'codeRequested', email }),
    backToEmail: () => dispatch({ type: 'backToEmail' }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/test/sign-in-flow.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/hooks/useSignInFlow.ts src/test/sign-in-flow.test.ts
git commit -m "PUP-18 add sign-in flow step machine"
```

### Task 8.2: Add the email-OTP mutations hook

**Files:**
- Create: `src/features/auth/hooks/useEmailOtpSignIn.ts`

- [ ] **Step 1: Implement the hook (covered by the screen integration test in Task 8.4)**

```ts
// src/features/auth/hooks/useEmailOtpSignIn.ts
import { useMutation } from '@tanstack/react-query';

import { requestEmailOtp, verifyEmailOtp } from '@/lib/auth';

export type SignInActions = Readonly<{
  requestCode: (email: string) => Promise<void>;
  verifyCode: (input: Readonly<{ email: string; token: string }>) => Promise<void>;
  isBusy: boolean;
}>;

export function useEmailOtpSignIn(): SignInActions {
  const requestMutation = useMutation({ mutationFn: (email: string) => requestEmailOtp(email) });
  const verifyMutation = useMutation({
    mutationFn: (input: Readonly<{ email: string; token: string }>) => verifyEmailOtp(input),
  });

  return {
    requestCode: (email) => requestMutation.mutateAsync(email),
    verifyCode: (input) => verifyMutation.mutateAsync(input),
    isBusy: requestMutation.isPending || verifyMutation.isPending,
  };
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/features/auth/hooks/useEmailOtpSignIn.ts
git commit -m "PUP-18 add email OTP mutations hook"
```

### Task 8.3: Add the provider seam component

**Files:**
- Create: `src/features/auth/components/SocialSignInButtons.tsx`

- [ ] **Step 1: Implement the seam (renders enabled non-email methods; currently none)**

```tsx
// src/features/auth/components/SocialSignInButtons.tsx
import { Button } from '@/design/primitives/Button';
import { Stack } from '@/design/primitives/Stack';
import { enabledAuthMethods, type AuthMethod } from '@/contracts/auth';

// Seam for additional providers. When Apple/Google are wired, add them to
// enabledAuthMethods in the contract and a handler here; no other sign-in code
// needs to change. Today only email_otp is enabled, so this renders nothing.
const socialMethods: readonly AuthMethod[] = enabledAuthMethods.filter((method) => method !== 'email_otp');

export type SocialSignInButtonsProps = Readonly<{
  onSelectMethod?: (method: AuthMethod) => void;
}>;

export function SocialSignInButtons({ onSelectMethod }: SocialSignInButtonsProps) {
  if (socialMethods.length === 0) {
    return null;
  }

  return (
    <Stack gap="sm">
      {socialMethods.map((method) => (
        <Button
          key={method}
          label={method}
          onPress={() => onSelectMethod?.(method)}
          variant="secondary"
        />
      ))}
    </Stack>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/features/auth/components/SocialSignInButtons.tsx
git commit -m "PUP-18 add provider-seam social sign-in component"
```

### Task 8.4: Add the sign-in screen

**Files:**
- Create: `src/features/auth/screens/SignInScreen.tsx`
- Test: `src/test/sign-in-screen.render.test.tsx`

- [ ] **Step 1: Write the failing integration test (against the injectable view)**

```tsx
// src/test/sign-in-screen.render.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SignInScreenView } from '@/features/auth/screens/SignInScreen';
import { i18n } from '@/lib/i18n';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

function makeActions() {
  return {
    requestCode: jest.fn(async () => {}),
    verifyCode: jest.fn(async () => {}),
    isBusy: false,
  };
}

describe('SignInScreenView', () => {
  it('shows a validation error for an invalid email and does not request a code', () => {
    const actions = makeActions();
    render(<SignInScreenView actions={actions} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.email.label')), 'not-an-email');
    fireEvent.press(screen.getByText(i18n.t('auth.email.cta')));

    expect(screen.getByText(i18n.t('auth.errors.invalid-email'))).toBeTruthy();
    expect(actions.requestCode).not.toHaveBeenCalled();
  });

  it('requests a code for a valid email and advances to the code step', async () => {
    const actions = makeActions();
    render(<SignInScreenView actions={actions} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.email.label')), 'Owner@Example.com');
    fireEvent.press(screen.getByText(i18n.t('auth.email.cta')));

    await waitFor(() => expect(actions.requestCode).toHaveBeenCalledWith('owner@example.com'));
    expect(screen.getByLabelText(i18n.t('auth.code.label'))).toBeTruthy();
  });

  it('verifies a 6-digit code with the normalized email', async () => {
    const actions = makeActions();
    render(<SignInScreenView actions={actions} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.email.label')), 'owner@example.com');
    fireEvent.press(screen.getByText(i18n.t('auth.email.cta')));
    await waitFor(() => expect(screen.getByLabelText(i18n.t('auth.code.label'))).toBeTruthy());

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.code.label')), '123456');
    fireEvent.press(screen.getByText(i18n.t('auth.code.cta')));

    await waitFor(() =>
      expect(actions.verifyCode).toHaveBeenCalledWith({ email: 'owner@example.com', token: '123456' }),
    );
  });

  it('surfaces a request failure as localized copy', async () => {
    const actions = { ...makeActions(), requestCode: jest.fn(async () => { throw new Error('auth_request_otp_failed'); }) };
    render(<SignInScreenView actions={actions} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.email.label')), 'owner@example.com');
    fireEvent.press(screen.getByText(i18n.t('auth.email.cta')));

    await waitFor(() => expect(screen.getByText(i18n.t('auth.errors.request-failed'))).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/test/sign-in-screen.render.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement the screen (connected `SignInScreen` + injectable `SignInScreenView`)**

```tsx
// src/features/auth/screens/SignInScreen.tsx
import { useState } from 'react';

import { emailSchema, otpCodeSchema } from '@/contracts/auth';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Screen } from '@/design/primitives/Screen';
import { Stack } from '@/design/primitives/Stack';
import { TextField } from '@/design/primitives/TextField';
import { useAppTranslation } from '@/lib/i18n';

import { SocialSignInButtons } from '../components/SocialSignInButtons';
import { useEmailOtpSignIn, type SignInActions } from '../hooks/useEmailOtpSignIn';
import { useSignInFlow } from '../hooks/useSignInFlow';

export type SignInScreenViewProps = Readonly<{
  actions: SignInActions;
}>;

export function SignInScreen() {
  const actions = useEmailOtpSignIn();

  return <SignInScreenView actions={actions} />;
}

export function SignInScreenView({ actions }: SignInScreenViewProps) {
  const { t } = useAppTranslation();
  const flow = useSignInFlow();
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [errorKey, setErrorKey] = useState<
    'auth.errors.invalid-email' | 'auth.errors.invalid-code' | 'auth.errors.request-failed' | 'auth.errors.verify-failed' | null
  >(null);

  const submitEmail = async () => {
    const parsed = emailSchema.safeParse(emailInput);

    if (!parsed.success) {
      setErrorKey('auth.errors.invalid-email');
      return;
    }

    setErrorKey(null);

    try {
      await actions.requestCode(parsed.data);
      flow.goToCode(parsed.data);
      setCodeInput('');
    } catch {
      setErrorKey('auth.errors.request-failed');
    }
  };

  const submitCode = async () => {
    const parsed = otpCodeSchema.safeParse(codeInput);

    if (!parsed.success) {
      setErrorKey('auth.errors.invalid-code');
      return;
    }

    setErrorKey(null);

    try {
      await actions.verifyCode({ email: flow.email, token: parsed.data });
    } catch {
      setErrorKey('auth.errors.verify-failed');
    }
  };

  return (
    <Screen>
      <Stack gap="lg">
        <Stack gap="sm">
          <AppText variant="title">{t('auth.title')}</AppText>
          <AppText tone="secondary">{t('auth.subtitle')}</AppText>
        </Stack>

        {flow.step === 'email' ? (
          <Stack gap="md">
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              errorText={errorKey === 'auth.errors.invalid-email' || errorKey === 'auth.errors.request-failed' ? t(errorKey) : undefined}
              inputMode="email"
              keyboardType="email-address"
              label={t('auth.email.label')}
              onChangeText={setEmailInput}
              placeholder={t('auth.email.placeholder')}
              value={emailInput}
            />
            <Button label={t('auth.email.cta')} loading={actions.isBusy} onPress={submitEmail} />
            <SocialSignInButtons />
          </Stack>
        ) : (
          <Stack gap="md">
            <AppText tone="secondary">{t('auth.code.sent-helper', { email: flow.email })}</AppText>
            <TextField
              errorText={errorKey === 'auth.errors.invalid-code' || errorKey === 'auth.errors.verify-failed' ? t(errorKey) : undefined}
              inputMode="numeric"
              keyboardType="number-pad"
              label={t('auth.code.label')}
              maxLength={6}
              onChangeText={setCodeInput}
              placeholder={t('auth.code.placeholder')}
              value={codeInput}
            />
            <Button label={t('auth.code.cta')} loading={actions.isBusy} onPress={submitCode} />
            <Button label={t('auth.code.resend')} onPress={submitEmail} variant="tertiary" />
            <Button label={t('auth.code.back')} onPress={flow.backToEmail} variant="tertiary" />
          </Stack>
        )}
      </Stack>
    </Screen>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/test/sign-in-screen.render.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/screens/SignInScreen.tsx src/test/sign-in-screen.render.test.tsx
git commit -m "PUP-18 add email OTP sign-in screen"
```

### Task 8.5: Add the sign-out button and feature barrel

**Files:**
- Create: `src/features/auth/components/SignOutButton.tsx`
- Create: `src/features/auth/index.ts`

- [ ] **Step 1: Implement the sign-out button**

```tsx
// src/features/auth/components/SignOutButton.tsx
import { Button } from '@/design/primitives/Button';
import { useAuth } from '@/lib/auth';
import { useAppTranslation } from '@/lib/i18n';

export function SignOutButton() {
  const { t } = useAppTranslation();
  const { signOut } = useAuth();

  return (
    <Button
      label={t('auth.sign-out.cta')}
      onPress={() => {
        void signOut();
      }}
      variant="secondary"
    />
  );
}
```

- [ ] **Step 2: Implement the feature barrel**

```ts
// src/features/auth/index.ts
export { SignInScreen } from './screens/SignInScreen';
export { SignOutButton } from './components/SignOutButton';
```

- [ ] **Step 3: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/features/auth/components/SignOutButton.tsx src/features/auth/index.ts
git commit -m "PUP-18 add sign-out button and auth feature barrel"
```

---

## Phase 9 — Routing, Gating, And More-Tab Sign-Out

### Task 9.1: Add a pure auth-landing resolver

**Files:**
- Create: `src/features/auth/navigation.ts`
- Test: `src/test/auth-navigation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/auth-navigation.test.ts
import { resolveAuthLanding } from '@/features/auth/navigation';

describe('resolveAuthLanding', () => {
  it('returns null while the session is still loading', () => {
    expect(resolveAuthLanding('loading')).toBeNull();
  });

  it('routes signed-out users to the sign-in screen', () => {
    expect(resolveAuthLanding('signedOut')).toBe('/sign-in');
  });

  it('routes signed-in users to Today', () => {
    expect(resolveAuthLanding('signedIn')).toBe('/today');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/test/auth-navigation.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement the resolver**

```ts
// src/features/auth/navigation.ts
import type { AuthStatus } from '@/contracts/auth';

export type AuthLanding = '/sign-in' | '/today';

export function resolveAuthLanding(status: AuthStatus): AuthLanding | null {
  switch (status) {
    case 'signedIn':
      return '/today';
    case 'signedOut':
      return '/sign-in';
    case 'loading':
    default:
      return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/test/auth-navigation.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Export from the feature barrel and commit**

Add to `src/features/auth/index.ts`:

```ts
export { resolveAuthLanding, type AuthLanding } from './navigation';
```

```bash
git add src/features/auth/navigation.ts src/features/auth/index.ts src/test/auth-navigation.test.ts
git commit -m "PUP-18 add pure auth landing resolver"
```

### Task 9.2: Wire `AuthProvider` and the sign-in route into the app shell

**Files:**
- Modify: `app/_layout.tsx`
- Create: `app/sign-in.tsx`
- Modify: `app/index.tsx`

- [ ] **Step 1: Wrap routes in `AuthProvider` and register the sign-in screen**

```tsx
// app/_layout.tsx
import 'react-native-reanimated';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { QuickLogFeedbackProvider } from '@/features/quick-log/QuickLogFeedbackProvider';
import { AuthProvider } from '@/lib/auth';
import { AppProviders } from '@/lib/providers/AppProviders';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <AuthProvider>
          <QuickLogFeedbackProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
              <Stack.Screen name="invite/[token]" />
              <Stack.Screen name="share/[token]" />
            </Stack>
          </QuickLogFeedbackProvider>
        </AuthProvider>
        <StatusBar style="dark" />
      </AppProviders>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Add the sign-in route**

```tsx
// app/sign-in.tsx
import { Redirect } from 'expo-router';

import { SignInScreen } from '@/features/auth';
import { useAuth } from '@/lib/auth';

export default function SignInRoute() {
  const { status } = useAuth();

  if (status === 'signedIn') {
    return <Redirect href="/today" />;
  }

  return <SignInScreen />;
}
```

- [ ] **Step 3: Gate the index route by auth status**

```tsx
// app/index.tsx
import { Redirect } from 'expo-router';

import { resolveAuthLanding } from '@/features/auth';
import { useAuth } from '@/lib/auth';

export default function IndexRoute() {
  const { status } = useAuth();
  const landing = resolveAuthLanding(status);

  if (!landing) {
    return null;
  }

  return <Redirect href={landing} />;
}
```

- [ ] **Step 4: Verify the navigation + scaffold guardrails still pass**

Run: `node scripts/checks/check-navigation-contract.mjs && node scripts/checks/check-scaffold-guardrails.mjs`
Expected: both pass (no `@/lib/supabase`, `@supabase/supabase-js`, `createClient(`, or `console.*` in `app/`; required route files still present).

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS (Expo Router typed routes recognize `/sign-in`).

```bash
git add app/_layout.tsx app/sign-in.tsx app/index.tsx
git commit -m "PUP-18 gate routes by auth status and add sign-in route"
```

### Task 9.3: Add sign-out to the More tab

**Files:**
- Modify: `src/features/more/screens/MoreScreen.tsx`
- Modify: `src/test/app-shell.render.test.tsx`

- [ ] **Step 1: Update the More-screen render test to provide an AuthProvider and assert the sign-out control**

In `src/test/app-shell.render.test.tsx`, add the import:

```tsx
import { AuthProvider, type AuthProviderDependencies } from '@/lib/auth';
```

Add a stub dependency factory near the top of the file:

```tsx
const stubAuthDependencies: AuthProviderDependencies = {
  getCurrentUser: async () => ({ id: '00000000-0000-4000-8000-000000000101', email: null }),
  subscribeToAuthChanges: () => () => {},
  signOut: async () => {},
  bootstrap: async () => ({ household_id: 'h', created: true }),
  startAutoRefresh: () => {},
  stopAutoRefresh: () => {},
  appState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
};
```

Replace the existing "renders the More shell with localized support copy" test body with:

```tsx
  it('renders the More shell with localized support copy and a sign-out control', () => {
    render(
      <AppProviders>
        <AuthProvider dependencies={stubAuthDependencies}>
          <QuickLogFeedbackProvider>
            <MoreScreen openTimeline={noop} />
          </QuickLogFeedbackProvider>
        </AuthProvider>
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('more.screen-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.rows.timeline'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.sections.support'))).toBeTruthy();
    expect(screen.getByText(i18n.t('auth.sign-out.cta'))).toBeTruthy();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/test/app-shell.render.test.tsx`
Expected: FAIL — `auth.sign-out.cta` not yet rendered by `MoreScreen`.

- [ ] **Step 3: Render the sign-out button in the More screen**

```tsx
// src/features/more/screens/MoreScreen.tsx
import { AppText } from '@/design/primitives/AppText';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { SignOutButton } from '@/features/auth';
import { useAppTranslation } from '@/lib/i18n';

export type MoreScreenProps = Readonly<{
  openTimeline: () => void;
}>;

export function MoreScreen({ openTimeline }: MoreScreenProps) {
  const { t } = useAppTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('more.screen-title')}</AppText>
      <ListRow
        onPress={openTimeline}
        title={t('more.rows.timeline')}
      />
      <AppText>{t('more.sections.support')}</AppText>
      <SignOutButton />
    </Screen>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/test/app-shell.render.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/more/screens/MoreScreen.tsx src/test/app-shell.render.test.tsx
git commit -m "PUP-18 add sign-out control to More tab"
```

---

## Phase 10 — Decision Record And Docs

### Task 10.1: Write ADR-0017

**Files:**
- Create: `docs/architecture/adr/0017-auth-identity-session.md`

- [ ] **Step 1: Write the ADR**

```markdown
# ADR-0017: Auth, Identity, Session Persistence, And New-User Bootstrap

Status: Accepted

## Context

The roadmap (Phase 1A) makes identity a foundation dependency: durable writes, RLS ownership, sharing, and multi-device behavior require a real Supabase session actor. The Supabase client previously used `persistSession: false` as a placeholder. RLS denies direct `household`/`household_membership` inserts (see `supabase/tests/rls_baseline.sql`), so a first-time user has no household to write into.

## Decision

- **Provider:** Supabase Auth (GoTrue), consistent with `07-backend-topology.md`.
- **First sign-in method:** passwordless email OTP (6-digit code). Apple/Google/magic-link are deferred; `enable_anonymous_sign_ins` stays `false`.
- **Provider-agnostic session layer:** `src/lib/auth` depends only on the Supabase session. The OTP-specific calls live in `src/lib/auth/api.ts` alongside future social methods; session restore, gating, sign-out, and bootstrap are method-agnostic. `AuthMethod` reserves `apple`/`google`; `enabledAuthMethods` currently lists only `email_otp`.
- **Session persistence:** Expo SecureStore via a `SupportedStorage` adapter, with `persistSession: true` and `autoRefreshToken: true`. Token auto-refresh is started/stopped on React Native `AppState`.
- **New-user bootstrap:** `public.bootstrap_current_user(text)` SECURITY DEFINER RPC (pinned `search_path`, checks `auth.uid()`), idempotently creating a household + accepted owner membership. It is provider-agnostic by construction.
- **RPC typing exception:** until the bootstrap migration is approved, pushed, and `database.types.ts` is regenerated, `src/lib/auth/bootstrap.ts` reaches the RPC through one documented narrow boundary cast. This ADR authorizes that single cast; it must be removed after `npm run db:types`.

## Consequences

- Routes gate on auth status: signed-out → `/sign-in`, signed-in → `/today`.
- Account deletion/export, anonymous→permanent upgrade, and deep-link invite intent remain future work (PUP-26/PUP-28/PUP-30).
- Adding Apple/Google later requires only a new handler in `src/lib/auth/api.ts` plus an entry in `enabledAuthMethods` and `SocialSignInButtons`; session, gating, and bootstrap are unchanged.
- `expo-secure-store` is a new runtime dependency.
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture/adr/0017-auth-identity-session.md
git commit -m "PUP-18 add ADR-0017 auth identity and session"
```

### Task 10.2: Update architecture docs

**Files:**
- Modify: `docs/architecture/07-backend-topology.md`
- Modify: `docs/architecture/08-data-model-and-rls.md`

- [ ] **Step 1: Document the bootstrap RPC in `07-backend-topology.md`**

Under the "Edge Functions" / privileged-mutation discussion, add a short subsection:

```markdown
## New-User Bootstrap

Creating the first household and owner membership is denied to direct client writes by RLS. New-user bootstrap goes through `public.bootstrap_current_user(text)` (SECURITY DEFINER, pinned `search_path`, checks `auth.uid()`, idempotent). It is provider-agnostic — it works for any Supabase sign-in method. Session persistence uses an Expo SecureStore `SupportedStorage` adapter with `autoRefreshToken` driven by React Native `AppState`. See ADR-0017.
```

- [ ] **Step 2: Add a bootstrap note to the RLS test list in `08-data-model-and-rls.md`**

Add to the "RLS Negative Tests" P0 list:

```markdown
- new-user bootstrap creates exactly one accepted owner membership, is idempotent, isolates users, and is denied to the anonymous role (`supabase/tests/auth_bootstrap.sql`).
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/07-backend-topology.md docs/architecture/08-data-model-and-rls.md
git commit -m "PUP-18 document bootstrap RPC and session persistence in architecture docs"
```

### Task 10.3: Update the roadmap and plan index

**Files:**
- Modify: `docs/plans/active/2026-05-29-full-prd-native-app-master-roadmap.md`
- Modify: `docs/plans/README.md`

- [ ] **Step 1: Mark Phase 1A in progress and record the auth decision in the roadmap**

In `2026-05-29-full-prd-native-app-master-roadmap.md`:
- In the **Phase 1A** section, note that `PUP-18` is the active slice implementing it, that the method is email OTP with a provider-agnostic seam for Apple/Google, and that persistence uses SecureStore.
- Add a changelog entry dated `2026-05-30`: "Started Phase 1A as `PUP-18`: Supabase Auth email-OTP sign-in, SecureStore session persistence + AppState auto-refresh, route gating, and a SECURITY DEFINER `bootstrap_current_user` RPC; ADR-0017 accepted. Apple/Google reserved behind a provider-agnostic seam."

- [ ] **Step 2: Add the plan to the index**

In `docs/plans/README.md`, add a row to the Current Plans table:

```markdown
| Active task plan | [PUP-18 Auth, Identity, Session, And Bootstrap](active/2026-05-30-pup-18-auth-identity-session.md) | `PUP-18` | Phase 0 dependency gate → implement phase-by-phase |
```

- [ ] **Step 3: Commit**

```bash
git add docs/plans/active/2026-05-29-full-prd-native-app-master-roadmap.md docs/plans/README.md
git commit -m "PUP-18 link auth slice into roadmap and plan index"
```

---

## Phase 11 — Full Verification And Handoff

### Task 11.1: Run the full local gate

**Files:** none.

- [ ] **Step 1: Run the complete check suite**

Run: `npm run check`
Expected: `lint`, `typecheck`, and all `test` sub-suites (unit + node + scaffold) PASS, including `check-i18n.mjs`, `check-navigation-contract.mjs`, `privacy-scan.mjs`, and `text-hygiene.mjs`.

- [ ] **Step 2: Run the remote Supabase gate (gated — needs approval + credentials)**

Request explicit approval to "run `npm run supabase:ci:remote` for PUP-18 (push dev migration + pgTAP + typegen)". After approval:

Run: `npm run supabase:ci:remote`
Expected: migration dry-run clean, lint clean, pgTAP (including `auth_bootstrap.sql`) passing, and `database.types.ts` regenerated.

- [ ] **Step 3: Remove the bootstrap RPC typing cast once types are regenerated**

After `database.types.ts` includes `bootstrap_current_user`, update `src/lib/auth/bootstrap.ts` to call `getSupabaseClient().rpc('bootstrap_current_user', { p_display_name: null })` directly (typed), dropping the `as unknown as` cast. Re-run `npm run typecheck` and `npm run test:unit -- src/test/auth-bootstrap.test.ts`. If the remote gate is blocked, leave the documented cast and record the follow-up in Linear.

- [ ] **Step 4: Manual smoke (when a dev build exists)**

On a device/simulator: launch signed-out → land on Sign in → enter email → receive 6-digit code → enter code → land on Today → confirm a household + owner membership exists (bootstrap) → kill and relaunch app → session restored to Today (no re-sign-in) → More → Sign out → returns to Sign in.

- [ ] **Step 5: Update Linear**

Move `PUP-18` to In Review with verification evidence (check output, pgTAP result or blocked note, manual smoke status). Do not perform release/push actions beyond the approved remote gate.

### Task 11.2: Decide branch completion

- [ ] **Step 1: Use the finishing-a-development-branch skill**

REQUIRED SUB-SKILL: superpowers:finishing-a-development-branch to choose merge/PR/cleanup. Opening a PR is a remote mutation — get explicit user approval naming the action first (`AGENTS.md` release guardrail).

---

## Self-Review

**Spec coverage (vs. roadmap Phase 1A + the two locked decisions):**
- Supabase Auth session identity before durable flows → Phases 3–6, 9 (persistence, context, gating). ✓
- Email-OTP sign-in with provider-agnostic seam for Apple/Google → Tasks 1.1 (`AuthMethod`/`enabledAuthMethods`), 4.1 (api seam), 8.3 (`SocialSignInButtons`), 8.4 (screen). ✓
- SecureStore-backed persistence + AppState auto-refresh → Tasks 3.1, 3.3, 6.1. ✓
- New-user bootstrap (first household + owner membership) → Phase 2 (RPC + pgTAP), Task 5.1 (client), wired in 6.1. ✓
- Route gating signed-out↔signed-in → Tasks 9.1, 9.2. ✓
- Sign-out included; account deletion deferred → Task 8.5, 9.3; deletion called out as non-goal. ✓
- Typed EN/RU/ES copy + parity → Task 7.1. ✓
- ADR (mandated ADR-0017) + docs → Phase 10. ✓
- RLS/auth invariants mapped to tests → pgTAP (Phase 2), client/session unit tests (Phases 3–6). ✓

**Placeholder scan:** No `TBD`/"add error handling"/"write tests for the above" — every code and test step contains full content. Token-name fallback note included for `TextField` only (explicit, with substitution guidance).

**Type consistency:** `SessionUser`, `AuthStatus`, `BootstrapResult` defined in Task 1.1 and reused unchanged in api/bootstrap/context. `SignInActions` defined in 8.2 and consumed by 8.4. `AuthProviderDependencies` defined in 6.1 and reused in the 9.3 test. `resolveAuthLanding` returns `/sign-in`|`/today` matching the routes added in 9.2. Function names (`requestEmailOtp`, `verifyEmailOtp`, `ensureUserBootstrapped`, `subscribeToAuthChanges`, `startAutoRefresh`/`stopAutoRefresh`) are consistent across api, barrel, and context.

**Known risk flagged in-plan:** the bootstrap RPC type cast (authorized by ADR-0017, removed in Task 11.1 Step 3); the `expo-secure-store` dependency (gated in Task 0.1); the remote Supabase push/pgTAP/typegen (gated in Tasks 2.2 and 11.1).

---

## Changelog

- 2026-05-30: Created the PUP-18 plan from the master roadmap (Phase 1A). Decisions captured: email-OTP first with a provider-agnostic seam for Apple/Google, SecureStore session persistence with AppState auto-refresh, SECURITY DEFINER `bootstrap_current_user` RPC for new-user household/owner-membership creation, route gating, and sign-out (account deletion deferred). ADR target is ADR-0017.
