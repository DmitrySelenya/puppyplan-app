import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  PUPPYPLAN_DEV_SUPABASE_PROJECT_REF,
  PUPPYPLAN_DEV_SUPABASE_URL,
  assertKnownDevSupabaseTarget,
} from '../supabase/dev-project-guard.mjs';

const scriptPath = 'scripts/supabase/configure-dev-auth-email-otp.mjs';
const debugAccountScriptPath = 'scripts/supabase/upsert-dev-debug-account.mjs';

test('dev auth OTP template helper updates only code-based email templates', () => {
  const source = readFileSync(scriptPath, 'utf8');

  assert.match(source, /SUPABASE_ACCESS_TOKEN/u);
  assert.match(source, /SUPABASE_PROJECT_REF/u);
  assert.equal(source.includes('/v1/projects/'), true);
  assert.equal(source.includes('/config/auth'), true);
  assert.match(source, /mailer_subjects_confirmation/u);
  assert.match(source, /mailer_templates_confirmation_content/u);
  assert.match(source, /mailer_subjects_magic_link/u);
  assert.match(source, /mailer_templates_magic_link_content/u);
  assert.match(source, /mailer_otp_length:\s*6/u);
  assert.equal(source.includes('{{ .Token }}'), true);
  assert.doesNotMatch(source, /service[_-]?role|SECRET_KEY/u);
});

test('dev debug account helper uses server-only admin auth and local synthetic credentials', () => {
  const source = readFileSync(debugAccountScriptPath, 'utf8');

  assert.match(source, /PUPPYPLAN_DEV_SUPABASE_AUTH_ADMIN_KEY/u);
  assert.match(source, /EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_EMAIL/u);
  assert.match(source, /EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_PASSWORD/u);
  assert.match(source, /auth\.admin\.createUser/u);
  assert.match(source, /auth\.admin\.updateUserById/u);
  assert.doesNotMatch(source, /EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_ADMIN/u);
  assert.doesNotMatch(source, /service[_-]?role|SECRET_KEY/u);
});

test('dev Supabase helpers reject targets other than the known non-production project', () => {
  assert.doesNotThrow(() => assertKnownDevSupabaseTarget({
    projectRef: PUPPYPLAN_DEV_SUPABASE_PROJECT_REF,
    scriptName: 'test helper',
  }));
  assert.doesNotThrow(() => assertKnownDevSupabaseTarget({
    scriptName: 'test helper',
    url: PUPPYPLAN_DEV_SUPABASE_URL,
  }));

  assert.throws(
    () => assertKnownDevSupabaseTarget({
      projectRef: 'production-project-ref',
      scriptName: 'test helper',
    }),
    (error) => error instanceof Error &&
      /Refusing to run test helper/u.test(error.message) &&
      !error.message.includes('production-project-ref'),
  );
  assert.throws(
    () => assertKnownDevSupabaseTarget({
      scriptName: 'test helper',
      url: 'https://production-project-ref.supabase.co',
    }),
    (error) => error instanceof Error &&
      /Target must be the non-production PuppyPlan Dev project/u.test(error.message) &&
      !error.message.includes('production-project-ref'),
  );
  assert.throws(
    () => assertKnownDevSupabaseTarget({
      projectRef: PUPPYPLAN_DEV_SUPABASE_PROJECT_REF,
      scriptName: 'test helper',
      url: 'https://production-project-ref.supabase.co',
    }),
    /Refusing to run test helper/u,
  );
});

test('dev Supabase helpers assert the target before hosted privileged calls', () => {
  const templateSource = readFileSync(scriptPath, 'utf8');
  const debugSource = readFileSync(debugAccountScriptPath, 'utf8');

  assert.match(templateSource, /dev-project-guard\.mjs/u);
  assert.match(debugSource, /dev-project-guard\.mjs/u);
  assert.ok(
    templateSource.indexOf('assertKnownDevSupabaseTarget({') < templateSource.indexOf('fetch('),
    'template helper must assert the dev target before Management API requests',
  );
  assert.ok(
    debugSource.indexOf('assertKnownDevSupabaseTarget({') < debugSource.indexOf('createClient('),
    'debug account helper must assert the dev target before Auth Admin client creation',
  );
});
