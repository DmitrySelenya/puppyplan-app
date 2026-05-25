import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';

const baselineMigrationPath = 'supabase/migrations/20260524202620_mvp_schema_baseline.sql';
const hardeningMigrationPath = 'supabase/migrations/20260524203009_security_harden_share_projections.sql';
const reviewFixesMigrationPath = 'supabase/migrations/20260525090000_review_fix_privacy_and_share_rpc.sql';
const remoteCiHardeningMigrationPath = 'supabase/migrations/20260525111954_remote_ci_rls_baseline_hardening.sql';
const shareSoftDeleteFixMigrationPath = 'supabase/migrations/20260525123000_fix_share_projection_puppy_soft_delete.sql';
const rlsTestPath = 'supabase/tests/rls_baseline.sql';
const remoteCliPath = 'scripts/supabase/run-remote-cli.mjs';
const noLocalDockerPath = 'scripts/supabase/no-local-docker.mjs';
const supabaseContractPath = 'src/contracts/supabase.ts';
const packageJsonPath = 'package.json';
const envExamplePath = '.env.example';
const remoteWorkflowPath = '.github/workflows/supabase-remote-dev.yml';

function migrationSource() {
  return readFileSync(baselineMigrationPath, 'utf8');
}

function allMigrationSource() {
  return [
    baselineMigrationPath,
    hardeningMigrationPath,
    reviewFixesMigrationPath,
    remoteCiHardeningMigrationPath,
    shareSoftDeleteFixMigrationPath,
  ].map((path) => readFileSync(path, 'utf8')).join('\n');
}

function viewBlock(source, viewName) {
  const match = source.match(new RegExp(`CREATE VIEW public\\.${viewName}\\n[\\s\\S]*?;`, 'u'));
  assert.ok(match, `missing ${viewName} view`);
  return match[0];
}

function policyBlock(source, policyName) {
  const match = source.match(new RegExp(`CREATE POLICY ${policyName} ON [\\s\\S]*?;`, 'u'));
  assert.ok(match, `missing ${policyName} policy`);
  return match[0];
}

function functionBlock(source, functionName) {
  const matches = [
    ...source.matchAll(
      new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}\\(\\)[\\s\\S]*?\\$\\$;`, 'gu'),
    ),
  ];
  assert.ok(matches.length > 0, `missing ${functionName} function`);
  return matches.at(-1)?.[0] ?? '';
}

function exportedArrayValues(source, name) {
  const match = source.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`, 'u'));
  assert.ok(match, `missing ${name} export`);

  return [...match[1].matchAll(/'([^']+)'/gu)].map((item) => item[1]);
}

function postgresEnumValues(source, name) {
  const match = source.match(new RegExp(`CREATE TYPE public\\.${name} AS ENUM \\(([\\s\\S]*?)\\);`, 'u'));
  assert.ok(match, `missing ${name} enum`);

  return [...match[1].matchAll(/'([^']+)'/gu)].map((item) => item[1]);
}

describe('Supabase baseline migration guardrails', () => {
  it('keeps SQL enums and table names aligned with TypeScript contracts', () => {
    const sql = migrationSource();
    const contract = readFileSync(supabaseContractPath, 'utf8');
    const publicTables = [...sql.matchAll(/CREATE TABLE public\.([a-z_]+) \(/gu)]
      .map((match) => match[1]);
    const appPrivateTables = [...sql.matchAll(/CREATE TABLE app_private\.([a-z_]+) \(/gu)]
      .map((match) => match[1]);

    assert.deepEqual(postgresEnumValues(sql, 'household_role'), exportedArrayValues(contract, 'householdMembershipRoles'));
    assert.deepEqual(postgresEnumValues(sql, 'share_role'), exportedArrayValues(contract, 'shareRoles'));
    assert.deepEqual(postgresEnumValues(sql, 'share_scope_type'), exportedArrayValues(contract, 'shareScopes'));
    assert.deepEqual(postgresEnumValues(sql, 'event_type'), exportedArrayValues(contract, 'eventTypes'));
    assert.deepEqual(publicTables, exportedArrayValues(contract, 'supabaseMvpTableNames'));
    assert.deepEqual(appPrivateTables, exportedArrayValues(contract, 'appPrivateMvpTableNames'));
    assert.ok(!publicTables.includes('minimal_quick_log_queue_item'));
  });

  it('scopes event-backed share projections to the shared puppy', () => {
    const source = migrationSource();

    for (const viewName of ['share_routine_summary', 'share_selected_timeline', 'share_training_notes']) {
      assert.match(
        viewBlock(source, viewName),
        /event_log\.puppy_id = share_link\.puppy_id/u,
        `${viewName} must not include sibling puppy events`,
      );
    }
  });

  it('keeps owner grants out of household invite rows', () => {
    assert.match(
      migrationSource(),
      /role public\.household_role NOT NULL CHECK \(role IN \('caregiver', 'viewer'\)\)/u,
    );
  });

  it('does not let accepted trainers read base share_link rows', () => {
    assert.doesNotMatch(
      policyBlock(migrationSource(), 'share_link_owner_read'),
      /accepted_by\s*=\s*auth\.uid\(\)/u,
    );
  });

  it('makes notification preference identity immutable', () => {
    const source = migrationSource();

    assert.match(source, /CREATE OR REPLACE FUNCTION public\.prevent_notification_preference_identity_update\(\)/u);
    assert.match(source, /CREATE TRIGGER notification_preference_prevent_identity_update/u);
  });

  it('constrains sensitive hash-labeled columns to hash prefixes', () => {
    const source = allMigrationSource();

    for (const expected of [
      /invite_email_hash_format/u,
      /invite_secret_token_hash_format/u,
      /share_link_secret_token_hash_format/u,
      /subscription_entitlement_provider_customer_hash_format/u,
      /\^sha256:/u,
      /\^\(argon2id:\|\\\$argon2id\\\$\)/u,
    ]) {
      assert.match(source, expected);
    }
  });

  it('defines accepted-share RPC projections and keeps public views on that path', () => {
    const source = allMigrationSource();
    const reviewFixes = readFileSync(reviewFixesMigrationPath, 'utf8');

    for (const expected of [
      /CREATE OR REPLACE FUNCTION public\.current_share_routine_summary\(\)/u,
      /CREATE OR REPLACE FUNCTION public\.current_share_selected_timeline\(\)/u,
      /CREATE OR REPLACE FUNCTION public\.current_share_training_notes\(\)/u,
      /CREATE OR REPLACE FUNCTION public\.current_share_health_summary\(\)/u,
      /CREATE OR REPLACE FUNCTION public\.current_share_puppy_profile\(\)/u,
      /share_link\.accepted_by = auth\.uid\(\)/u,
      /SELECT \* FROM public\.current_share_routine_summary\(\)/u,
      /SELECT \* FROM public\.current_share_health_summary\(\)/u,
      /20260525123000: tighten accepted-share projections against soft-deleted puppies/u,
    ]) {
      assert.match(source, expected);
    }

    assert.match(
      reviewFixes,
      /CREATE OR REPLACE FUNCTION public\.current_share_link_metadata\(\)/u,
      'review-fix migration must repair remote dev baseline drift before projection RPCs',
    );
  });

  it('keeps accepted-share projection RPCs from leaking soft-deleted puppies', () => {
    const source = allMigrationSource();
    const metadataBlock = functionBlock(source, 'current_share_link_metadata');

    assert.match(metadataBlock, /JOIN public\.puppy/u);
    assert.match(metadataBlock, /puppy\.deleted_at IS NULL/u);

    for (const functionName of [
      'current_share_routine_summary',
      'current_share_selected_timeline',
      'current_share_training_notes',
      'current_share_health_summary',
      'current_share_puppy_profile',
    ]) {
      const block = functionBlock(source, functionName);

      assert.match(block, /JOIN public\.puppy/u, `${functionName} must join puppy`);
      assert.match(block, /puppy\.deleted_at IS NULL/u, `${functionName} must filter soft-deleted puppies`);
    }
  });

  it('keeps the remote CI hardening migration aligned with the amended baseline', () => {
    const source = readFileSync(remoteCiHardeningMigrationPath, 'utf8');

    for (const expected of [
      /DROP POLICY IF EXISTS household_insert ON public\.household/u,
      /DROP POLICY IF EXISTS trusted_sitter_completion_event_insert/u,
      /DROP POLICY IF EXISTS share_link_owner_or_acceptor_read/u,
      /DROP POLICY IF EXISTS share_scope_owner_or_acceptor_read/u,
      /CREATE OR REPLACE FUNCTION public\.prevent_event_log_identity_update\(\)/u,
      /CREATE OR REPLACE FUNCTION public\.prevent_notification_preference_identity_update\(\)/u,
      /ADD CONSTRAINT media_asset_puppy_household_fk/u,
      /REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated/u,
      /GRANT INSERT ON\s+public\.puppy,\s+public\.event_log,\s+public\.health_record,\s+public\.reminder,\s+public\.notification_preference,\s+public\.media_asset/su,
    ]) {
      assert.match(source, expected);
    }

    assert.match(source, /Normalizes drift observed on the non-production PuppyPlan Dev database/u);
    assert.match(source, /household_insert, trusted_sitter_completion_event_insert/u);
    assert.match(source, /share_link_owner_or_acceptor_read, share_scope_owner_or_acceptor_read/u);

    const insertGrants = [...source.matchAll(/GRANT INSERT ON([\s\S]*?)TO authenticated;/gu)]
      .map((match) => match[1]);

    assert.ok(insertGrants.length > 0, 'expected at least one authenticated INSERT grant block');

    for (const insertGrant of insertGrants) {
      assert.doesNotMatch(insertGrant, /public\.household/u);
      assert.doesNotMatch(insertGrant, /public\.trusted_sitter_completion_event/u);
    }
  });
});

describe('Supabase RLS pgTAP coverage guardrails', () => {
  it('covers denied invite, share, and share-scope mutations', () => {
    const source = readFileSync(rlsTestPath, 'utf8');

    for (const expected of [
      'authenticated owner cannot directly update household invites',
      'authenticated owner cannot directly delete household invites',
      'authenticated owner cannot directly update external share links',
      'authenticated owner cannot directly delete external share links',
      'authenticated owner cannot directly create share scopes',
      'authenticated owner cannot directly update share scopes',
      'authenticated owner cannot directly delete share scopes',
    ]) {
      assert.match(source, new RegExp(expected, 'u'));
    }
  });

  it('covers accepted-share positive projection reads', () => {
    const source = readFileSync(rlsTestPath, 'utf8');

    for (const expected of [
      'accepted trainer share can read sanitized routine summary projection rows',
      'accepted trainer share can read sanitized selected timeline projection rows',
      'accepted trainer share can read sanitized training notes projection rows',
      'accepted trainer share can read sanitized health summary projection rows',
      'accepted trainer share can read sanitized puppy profile projection rows',
      'accepted trainer routine summary has no sibling feeding rows',
      'accepted trainer selected timeline has no sibling feeding rows',
      'accepted trainer metadata excludes soft-deleted puppy shares',
      'accepted trainer routine summary excludes soft-deleted puppy events',
      'accepted trainer selected timeline excludes soft-deleted puppy events',
      'accepted trainer training notes exclude soft-deleted puppy events',
      'accepted trainer health summary excludes soft-deleted puppy health records',
      'accepted trainer puppy profile excludes soft-deleted puppies',
      'non-member cannot read accepted-share metadata RPC rows',
      'non-member cannot read routine summary projection RPC rows',
      'non-member cannot read selected timeline projection RPC rows',
      'non-member cannot read training notes projection RPC rows',
      'non-member cannot read health summary projection RPC rows',
      'non-member cannot read puppy profile projection RPC rows',
      'expired share reads no metadata projection rows',
      'expired share reads no routine summary projection RPC rows',
      'expired share reads no selected timeline projection RPC rows',
      'expired share reads no training notes projection RPC rows',
      'expired share reads no health summary projection RPC rows',
      'expired share reads no puppy profile projection RPC rows',
    ]) {
      assert.match(source, new RegExp(expected, 'u'));
    }
  });
});

describe('remote Supabase CLI wrapper guardrails', () => {
  it('keeps short Supabase scripts on the remote path instead of local Docker', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const noLocalDockerSource = readFileSync(noLocalDockerPath, 'utf8');

    assert.equal(
      packageJson.scripts['supabase:test'],
      'node scripts/supabase/run-remote-cli.mjs test',
    );
    assert.equal(
      packageJson.scripts['supabase:lint'],
      'node scripts/supabase/run-remote-cli.mjs lint',
    );
    assert.equal(
      packageJson.scripts['db:types'],
      'node scripts/supabase/run-remote-cli.mjs types',
    );
    assert.doesNotMatch(packageJson.scripts['supabase:test'], /--local|supabase start/u);
    assert.doesNotMatch(packageJson.scripts['supabase:lint'], /--local|supabase start/u);
    assert.doesNotMatch(packageJson.scripts['db:types'], /--local|supabase start/u);
    assert.match(noLocalDockerSource, /Local Supabase Docker commands are disabled/u);
  });

  it('requires an explicit DB URL for remote database checks and pins the Supabase CLI package', () => {
    const source = readFileSync(remoteCliPath, 'utf8');

    assert.match(source, /supabase@2\.101\.0/u);
    assert.doesNotMatch(source, /--linked/u);
    assert.match(source, /push: \['db', 'push', '--db-url', dbUrl, '--yes'\]/u);
    assert.match(source, /'push-dry-run': \['db', 'push', '--db-url', dbUrl, '--dry-run'\]/u);
    assert.match(source, /SUPABASE_DB_URL is required/u);
  });

  it('allows no-Docker typegen through project ref and blocks Docker-only modes unless explicitly allowed', () => {
    const source = readFileSync(remoteCliPath, 'utf8');

    assert.match(source, /SUPABASE_PROJECT_REF/u);
    assert.match(source, /--project-id/u);
    assert.match(source, /SUPABASE_CLI_DOCKER_ALLOWED !== '1'/u);
    assert.match(source, /requires Docker/u);
  });

  it('documents Expo public env and remote-only Supabase secrets separately', () => {
    const source = readFileSync(envExamplePath, 'utf8');

    assert.match(source, /EXPO_PUBLIC_SUPABASE_URL=https:\/\/olymqppxsadsxfrcyskh\.supabase\.co/u);
    assert.match(source, /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/u);
    assert.match(source, /SUPABASE_PROJECT_REF=olymqppxsadsxfrcyskh/u);
    assert.match(source, /SUPABASE_ACCESS_TOKEN=/u);
    assert.match(source, /SUPABASE_DB_URL=/u);
    assert.doesNotMatch(source, /SERVICE_ROLE|SECRET_KEY/u);
  });

  it('adds a Docker-capable CI gate for remote pgTAP and generated database types', () => {
    const workflow = readFileSync(remoteWorkflowPath, 'utf8');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    assert.match(workflow, /name: Supabase Remote Dev/u);
    assert.match(workflow, /runs-on: ubuntu-latest/u);
    assert.match(workflow, /persist-credentials:\s*false/u);
    assert.match(workflow, /SUPABASE_CLI_DOCKER_ALLOWED: '1'/u);
    assert.match(workflow, /PUPPYPLAN_DEV_SUPABASE_DB_URL/u);
    assert.match(workflow, /npm run supabase:ci:remote/u);
    assert.match(workflow, /actions\/upload-artifact@v4/u);
    assert.match(workflow, /path: src\/contracts\/database\.types\.ts/u);
    assert.match(packageJson.scripts['supabase:ci:remote'], /supabase:test:remote/u);
    assert.match(packageJson.scripts['supabase:ci:remote'], /db:types:remote/u);
  });

  it('redacts raw and percent-encoded database credentials from command output', () => {
    const fakeBin = mkdtempSync(join(tmpdir(), 'puppyplan-npx-'));
    const fakeNpx = join(fakeBin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
    const dbUrl = 'postgresql://reviewer:secret-password@example.test:5432/postgres';

    writeFileSync(
      fakeNpx,
      [
        '#!/bin/sh',
        'printf "raw=%s\\n" "$SUPABASE_DB_URL"',
        'printf "encoded=postgresql%%3A%%2F%%2Freviewer%%3Asecret-password%%40example.test:5432/postgres\\n" >&2',
        'exit 1',
        '',
      ].join('\n'),
    );
    chmodSync(fakeNpx, 0o755);

    const result = spawnSync(process.execPath, [resolve(remoteCliPath), 'lint'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
        SUPABASE_DB_URL: dbUrl,
      },
    });
    const output = `${result.stdout}${result.stderr}`;

    assert.equal(result.status, 1);
    assert.doesNotMatch(output, /secret-password/u);
    assert.match(output, /\[REDACTED_SUPABASE_DB_URL\]|\[REDACTED_CREDENTIALS\]/u);
  });

  it('normalizes raw special characters in database URL credentials before invoking the CLI', () => {
    const fakeBin = mkdtempSync(join(tmpdir(), 'puppyplan-npx-'));
    const fakeNpx = join(fakeBin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
    const dbUrl = 'postgresql://reviewer:secret[password]@example.test:5432/postgres';

    writeFileSync(
      fakeNpx,
      [
        '#!/bin/sh',
        'case "$6" in',
        '  *"%5B"*"%5D"*) printf "encoded_brackets=yes\\n" ;;',
        '  *"["*"]"*) printf "raw_brackets=yes\\n" ;;',
        '  *) printf "encoded_brackets=no\\n" ;;',
        'esac',
        'exit 0',
        '',
      ].join('\n'),
    );
    chmodSync(fakeNpx, 0o755);

    const result = spawnSync(process.execPath, [resolve(remoteCliPath), 'lint'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
        SUPABASE_DB_URL: dbUrl,
      },
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /encoded_brackets=yes/u);
  });

  it('redacts Supabase access tokens from project-ref typegen output', () => {
    const fakeBin = mkdtempSync(join(tmpdir(), 'puppyplan-npx-'));
    const fakeNpx = join(fakeBin, process.platform === 'win32' ? 'npx.cmd' : 'npx');
    const accessToken = 'sbp_secret-access-token';

    writeFileSync(
      fakeNpx,
      [
        '#!/bin/sh',
        'printf "args=%s\\n" "$*"',
        'printf "token=%s\\n" "$SUPABASE_ACCESS_TOKEN" >&2',
        'exit 1',
        '',
      ].join('\n'),
    );
    chmodSync(fakeNpx, 0o755);

    const result = spawnSync(process.execPath, [resolve(remoteCliPath), 'types'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
        SUPABASE_ACCESS_TOKEN: accessToken,
        SUPABASE_PROJECT_REF: 'olymqppxsadsxfrcyskh',
      },
    });
    const output = `${result.stdout}${result.stderr}`;

    assert.equal(result.status, 1);
    assert.match(output, /--project-id olymqppxsadsxfrcyskh/u);
    assert.doesNotMatch(output, /sbp_secret-access-token/u);
    assert.match(output, /\[REDACTED_SUPABASE_ACCESS_TOKEN\]/u);
  });
});
