import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';

const baselineMigrationPath = 'supabase/migrations/20260524202620_mvp_schema_baseline.sql';
const hardeningMigrationPath = 'supabase/migrations/20260524203009_security_harden_share_projections.sql';
const reviewFixesMigrationPath = 'supabase/migrations/20260525090000_review_fix_privacy_and_share_rpc.sql';
const remoteCiHardeningMigrationPath = 'supabase/migrations/20260525111954_remote_ci_rls_baseline_hardening.sql';
const shareSoftDeleteFixMigrationPath = 'supabase/migrations/20260525123000_fix_share_projection_puppy_soft_delete.sql';
const shareLinkViewRpcMigrationPath =
  'supabase/migrations/20260525135121_route_share_link_view_through_metadata_rpc.sql';
const puppyQuickTrackerMigrationPath =
  'supabase/migrations/20260608212607_puppy_quick_tracker_ids.sql';
const puppyQuickTrackerNonEmptyMigrationPath =
  'supabase/migrations/20260609120000_puppy_quick_tracker_ids_non_empty.sql';
const eventObservationPayloadV2MigrationPath =
  'supabase/migrations/20260711180000_event_observation_payload_v2.sql';
const householdInviteAdrPath =
  'docs/architecture/adr/0023-household-invite-token-sha256.md';
const adrIndexPath = 'docs/architecture/ADR_INDEX.md';
const rlsTestPath = 'supabase/tests/rls_baseline.sql';
const remoteCliPath = 'scripts/supabase/run-remote-cli.mjs';
const supabaseContractPath = 'src/contracts/supabase.ts';
const packageJsonPath = 'package.json';
const envExamplePath = '.env.example';
const remoteWorkflowPath = '.github/workflows/supabase-remote-dev.yml';
const databaseTypesGeneratedCheckPath = 'scripts/checks/check-database-types-generated.mjs';
const migrationDir = 'supabase/migrations';

function migrationSource() {
  return readFileSync(baselineMigrationPath, 'utf8');
}

function migrationPaths() {
  return readdirSync(migrationDir)
    .filter((filename) => /^20\d+_.*\.sql$/u.test(filename))
    .sort()
    .map((filename) => `${migrationDir}/${filename}`);
}

function allMigrationSource() {
  return migrationPaths().map((path) => readFileSync(path, 'utf8')).join('\n');
}

function canonicalQuickTrackerMigrationPaths() {
  const paths = readdirSync(migrationDir)
    .filter((filename) => /^20\d+_.*(?:canonical.*quick.*tracker|quick.*tracker.*canonical|quick.*log.*tracker|tracker.*taxonomy|taxonomy.*tracker).*\.sql$/u.test(filename))
    .map((filename) => `${migrationDir}/${filename}`)
    .filter((path) => path !== puppyQuickTrackerMigrationPath && path !== puppyQuickTrackerNonEmptyMigrationPath);

  assert.ok(
    paths.length > 0,
    'missing a new canonical Quick Log tracker taxonomy migration',
  );

  return paths;
}

function canonicalQuickTrackerMigrationSource() {
  return canonicalQuickTrackerMigrationPaths()
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
}

function householdInviteMigrationPath() {
  const paths = readdirSync(migrationDir)
    .filter((filename) => /^20\d+_household_invite_rpcs\.sql$/u.test(filename))
    .map((filename) => `${migrationDir}/${filename}`);

  assert.equal(
    paths.length,
    1,
    `expected exactly one household invite RPC migration, found ${paths.length}`,
  );

  return paths[0];
}

function householdInviteOutcomeMigrationPath() {
  const paths = readdirSync(migrationDir)
    .filter((filename) => /^20\d+_household_invite_already_member_outcome\.sql$/u.test(filename))
    .map((filename) => `${migrationDir}/${filename}`);

  assert.equal(
    paths.length,
    1,
    `expected exactly one household invite outcome migration, found ${paths.length}`,
  );

  return paths[0];
}

function bootstrapMembershipResolutionMigrationPath() {
  const paths = readdirSync(migrationDir)
    .filter((filename) => /^20\d+_bootstrap_current_user_membership_resolution\.sql$/u.test(filename))
    .map((filename) => `${migrationDir}/${filename}`);

  assert.equal(
    paths.length,
    1,
    `expected exactly one bootstrap membership resolution migration, found ${paths.length}`,
  );

  return paths[0];
}

function bootstrapSerializationMigrationPath() {
  const paths = readdirSync(migrationDir)
    .filter((filename) => /^20\d+_bootstrap_current_user_serialization\.sql$/u.test(filename))
    .map((filename) => `${migrationDir}/${filename}`);

  assert.equal(
    paths.length,
    1,
    `expected exactly one bootstrap serialization migration, found ${paths.length}`,
  );

  return paths[0];
}

function namedFunctionBlock(source, functionName) {
  const match = source.match(
    new RegExp(
      `CREATE OR REPLACE FUNCTION public\\.${functionName}\\([\\s\\S]*?\\n\\$\\$;`,
      'u',
    ),
  );
  assert.ok(match, `missing ${functionName} function`);
  return match[0];
}

function selectedTimelineShareScopeHardeningMigrationPath() {
  const paths = readdirSync(migrationDir)
    .filter((filename) => /^20\d+_.*(?:share.*scope.*selected.*timeline|selected.*timeline.*share.*scope).*\.sql$/u.test(filename))
    .map((filename) => `${migrationDir}/${filename}`);

  assert.equal(
    paths.length,
    1,
    `expected exactly one new selected-timeline share-scope hardening migration, found ${paths.length}`,
  );

  return paths[0];
}

function viewBlock(source, viewName) {
  const match = source.match(new RegExp(`CREATE VIEW public\\.${viewName}\\n[\\s\\S]*?;`, 'u'));
  assert.ok(match, `missing ${viewName} view`);
  return match[0];
}

function latestViewBlock(source, viewName) {
  const matches = [
    ...source.matchAll(
      new RegExp(`CREATE (?:OR REPLACE )?VIEW public\\.${viewName}\\n[\\s\\S]*?;`, 'gu'),
    ),
  ];
  assert.ok(matches.length > 0, `missing ${viewName} view`);
  return matches.at(-1)?.[0] ?? '';
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

function latestConstraintBlock(source, constraintName) {
  const matches = [
    ...source.matchAll(
      new RegExp(`ADD CONSTRAINT ${constraintName} CHECK \\([\\s\\S]*?\\);`, 'gu'),
    ),
  ];
  assert.ok(matches.length > 0, `missing ${constraintName} constraint`);
  return matches.at(-1)?.[0] ?? '';
}

function latestValidatedConstraintBlock(source, constraintName) {
  const matches = [
    ...source.matchAll(
      new RegExp(
        `ADD CONSTRAINT ${constraintName} CHECK \\([\\s\\S]*?\\)(?:\\s+NOT VALID)?\\s*;`,
        'gu',
      ),
    ),
  ];
  assert.ok(matches.length > 0, `missing ${constraintName} constraint`);
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

function effectivePostgresEnumValues(name) {
  const values = postgresEnumValues(migrationSource(), name);

  for (const source of migrationPaths().map((path) => readFileSync(path, 'utf8'))) {
    const alterPattern = new RegExp(
      [
        `ALTER\\s+TYPE\\s+public\\.${name}\\s+ADD\\s+VALUE`,
        `(?:\\s+IF\\s+NOT\\s+EXISTS)?`,
        `\\s+'([^']+)'`,
        `(?:\\s+(BEFORE|AFTER)\\s+'([^']+)')?`,
        `\\s*;`,
      ].join(''),
      'giu',
    );

    for (const match of source.matchAll(alterPattern)) {
      const value = match[1];
      const placement = match[2]?.toUpperCase();
      const neighbor = match[3];

      if (values.includes(value)) {
        continue;
      }

      if (placement === undefined) {
        values.push(value);
        continue;
      }

      const neighborIndex = values.indexOf(neighbor);
      assert.notEqual(
        neighborIndex,
        -1,
        `${name} enum migration adds ${value} ${placement} missing neighbor ${neighbor}`,
      );

      values.splice(placement === 'BEFORE' ? neighborIndex : neighborIndex + 1, 0, value);
    }
  }

  return values;
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
    assert.deepEqual(effectivePostgresEnumValues('event_type'), exportedArrayValues(contract, 'eventTypes'));
    assert.deepEqual(publicTables, exportedArrayValues(contract, 'supabaseMvpTableNames'));
    assert.deepEqual(appPrivateTables, exportedArrayValues(contract, 'appPrivateMvpTableNames'));
    assert.ok(!publicTables.includes('minimal_quick_log_queue_item'));
  });

  it('re-exports generated database types from the Supabase contract boundary', () => {
    const contract = readFileSync(supabaseContractPath, 'utf8');

    assert.match(contract, /export type \{ Database \} from '\.\/database\.types';/u);
  });

  it('keeps payload v2 additive and excludes observation from broad/training share projections', () => {
    const migration = readFileSync(eventObservationPayloadV2MigrationPath, 'utf8');
    const source = allMigrationSource();

    assert.match(
      migration,
      /ALTER TYPE public\.event_type ADD VALUE IF NOT EXISTS 'observation' BEFORE 'walk'/u,
    );
    assert.match(
      latestConstraintBlock(source, 'event_log_payload_version_check'),
      /payload_version IN \(1, 2\)/u,
    );
    assert.match(
      functionBlock(source, 'current_share_routine_summary'),
      /event_log\.event_type::text <> 'observation'/u,
    );
    assert.match(
      functionBlock(source, 'current_share_training_notes'),
      /event_log\.event_type = 'training'/u,
    );
    assert.doesNotMatch(migration, /CREATE TABLE|CREATE TYPE|DROP TABLE/u);
  });

  it('AC-P2-SHARE-2 AC-P2-SHARE-3 AC-P2-SHARE-5: hardens explicit selected timeline event types without historical rewrites', () => {
    const migrationPath = selectedTimelineShareScopeHardeningMigrationPath();
    const migration = readFileSync(migrationPath, 'utf8');
    const source = allMigrationSource();
    const constraint = latestValidatedConstraintBlock(
      source,
      'share_scope_selected_timeline_event_types_required',
    );
    const selectedTimelineProjection = functionBlock(source, 'current_share_selected_timeline');
    const observationMigration = readFileSync(eventObservationPayloadV2MigrationPath, 'utf8');
    const observationExecutableBody = observationMigration.slice(
      observationMigration.indexOf('ALTER TYPE'),
    );

    assert.match(constraint, /scope\s*<>\s*'selected_timeline_range'\s+OR/iu);
    assert.match(constraint, /selected_event_types\s+IS\s+NOT\s+NULL/iu);
    assert.match(constraint, /cardinality\s*\(\s*selected_event_types\s*\)\s*>\s*0/iu);
    assert.match(
      migration,
      /VALIDATE CONSTRAINT share_scope_selected_timeline_event_types_required/iu,
    );
    assert.doesNotMatch(
      migration,
      /\b(?:INSERT|UPDATE|DELETE|REVOKE|GRANT)\b|CREATE\s+POLICY|ALTER\s+POLICY|ROW\s+LEVEL\s+SECURITY/iu,
    );
    assert.match(
      selectedTimelineProjection,
      /event_log\.event_type\s*=\s*ANY\s*\(\s*share_scope\.selected_event_types\s*\)/iu,
    );
    assert.doesNotMatch(
      selectedTimelineProjection,
      /selected_event_types\s+IS\s+NULL/iu,
    );
    assert.equal(
      createHash('sha256').update(observationExecutableBody).digest('hex'),
      '28816edf86bca859f4136699ac0401812aadce57005496103e74a790e9f1fc09',
    );
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
      /20260525135121: route share link metadata view through the hardened RPC boundary/u,
    ]) {
      assert.match(source, expected);
    }

    assert.match(
      reviewFixes,
      /CREATE OR REPLACE FUNCTION public\.current_share_link_metadata\(\)/u,
      'review-fix migration must repair remote dev baseline drift before projection RPCs',
    );
  });

  it('keeps the share metadata view on the hardened metadata RPC path', () => {
    const block = latestViewBlock(allMigrationSource(), 'share_link_view');

    assert.match(block, /WITH \(security_barrier = true, security_invoker = true\)/u);
    assert.match(block, /SELECT \* FROM public\.current_share_link_metadata\(\)/u);
    assert.doesNotMatch(block, /active_share_link_ids/u);
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

  it('persists selected quick trackers as constrained puppy profile state', () => {
    const source = [
      puppyQuickTrackerMigrationPath,
      puppyQuickTrackerNonEmptyMigrationPath,
    ].map((path) => readFileSync(path, 'utf8')).join('\n');

    for (const expected of [
      /ADD COLUMN quick_tracker_ids text\[\] NOT NULL DEFAULT ARRAY/u,
      /puppy_quick_tracker_ids_allowed/u,
      /puppy_quick_tracker_ids_visible_count/u,
      /cardinality\(quick_tracker_ids\) <= 5/u,
      /puppy_quick_tracker_ids_non_empty/u,
      /cardinality\(quick_tracker_ids\) >= 1/u,
      /puppy_quick_tracker_ids_unique/u,
      /public\.quick_tracker_ids_are_unique\(quick_tracker_ids\)/u,
      /potty_pee_outside/u,
      /feeding_meal/u,
      /training/u,
    ]) {
      assert.match(source, expected);
    }
  });

  it('AC-6: keeps applied quick tracker migrations historical and adds a new canonical migration', () => {
    const originalQuickTrackerMigration = readFileSync(puppyQuickTrackerMigrationPath, 'utf8');
    const originalNonEmptyMigration = readFileSync(puppyQuickTrackerNonEmptyMigrationPath, 'utf8');

    assert.match(originalQuickTrackerMigration, /potty_pee_outside/u);
    assert.match(originalQuickTrackerMigration, /feeding_meal/u);
    assert.match(originalQuickTrackerMigration, /training/u);
    assert.match(originalNonEmptyMigration, /potty_pee_outside/u);
    assert.match(canonicalQuickTrackerMigrationSource(), /quick_tracker_ids/u);
  });

  it('AC-6 AC-7: canonical tracker migration remaps selected ids before enforcing final constraints', () => {
    const source = canonicalQuickTrackerMigrationSource();
    const finalAllowedConstraint = latestConstraintBlock(source, 'puppy_quick_tracker_ids_allowed');

    for (const expected of [
      /DROP CONSTRAINT IF EXISTS puppy_quick_tracker_ids_allowed/u,
      /ALTER COLUMN quick_tracker_ids SET DEFAULT ARRAY\[\s*'potty',\s*'feeding',\s*'sleep',\s*'walk',\s*'zoomies'\s*\]::text\[\]/u,
      /potty_pee_outside[\s\S]*potty/u,
      /potty_pee_inside[\s\S]*potty/u,
      /potty_poop[\s\S]*potty/u,
      /feeding_meal[\s\S]*feeding/u,
      /sleep_nap[\s\S]*sleep/u,
      /cardinality\(quick_tracker_ids\) = 0[\s\S]*ARRAY\[\s*'potty',\s*'feeding',\s*'sleep',\s*'walk',\s*'zoomies'\s*\]::text\[\]/u,
      /public\.quick_tracker_ids_are_unique\(quick_tracker_ids\)/u,
    ]) {
      assert.match(source, expected);
    }

    assert.match(
      finalAllowedConstraint,
      /quick_tracker_ids <@ ARRAY\[\s*'potty',\s*'feeding',\s*'sleep',\s*'walk',\s*'zoomies'\s*\]::text\[\]/u,
    );

    for (const rejectedLegacyId of [
      'potty_pee_outside',
      'potty_pee_inside',
      'potty_poop',
      'feeding_meal',
      'sleep_nap',
      'training',
      'weight',
    ]) {
      assert.doesNotMatch(finalAllowedConstraint, new RegExp(rejectedLegacyId, 'u'));
    }
  });

  it('AC-8: canonical tracker migration rewrites legacy potty quick_action payloads to subtype', () => {
    const source = canonicalQuickTrackerMigrationSource();

    for (const expected of [
      /event_log/u,
      /event_type = 'potty'/u,
      /payload\s*\?\s*'quick_action'/u,
      /jsonb_set\([\s\S]*payload[\s\S]*\{subtype\}/u,
      /pee_outside[\s\S]*outside/u,
      /pee_inside[\s\S]*inside/u,
      /poop[\s\S]*poop/u,
      /payload - 'quick_action'/u,
      /payload\s*\?\s*'subtype'/u,
    ]) {
      assert.match(source, expected);
    }
  });

  it('AC-2 AC-9: migration and TypeScript contracts expose walk without Quick Log weight', () => {
    const source = canonicalQuickTrackerMigrationSource();
    const contract = readFileSync(supabaseContractPath, 'utf8');

    assert.match(source, /ALTER TYPE public\.event_type ADD VALUE IF NOT EXISTS 'walk'/u);
    assert.deepEqual(exportedArrayValues(contract, 'puppyQuickTrackerIds'), [
      'potty',
      'feeding',
      'sleep',
      'walk',
      'zoomies',
    ]);
    assert.match(contract, /export const walkEventPayloadSchema/u);
    assert.doesNotMatch(contract, /'weight'/u);
  });
});

describe('Supabase RLS pgTAP coverage guardrails', () => {
  it('AC-P2-SHARE-2 AC-P2-SHARE-3 AC-P2-SHARE-5: locks eight explicit selected timeline assertions', () => {
    const source = readFileSync(rlsTestPath, 'utf8');
    const labels = [
      'selected timeline share scope has required event-types constraint',
      'selected timeline share scope rejects null selected event types',
      'selected timeline share scope rejects empty selected event types',
      'selected timeline share scope accepts explicit non-empty selected event types',
      'non-selected share scope preserves null selected event types',
      'accepted trainer selected timeline excludes observation without explicit selection',
      'selected timeline share scope accepts explicit observation opt-in',
      'accepted trainer selected timeline includes explicitly selected sanitized observation',
    ];

    assert.match(source, /SELECT plan\(144\);/u);

    for (const label of labels) {
      assert.equal(source.split(label).length - 1, 1, `${label} must appear exactly once`);
    }
  });

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
      'accepted trainer broad routine summary excludes observation rows',
      'accepted trainer training notes exclude observation rows',
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

  it('covers selected quick tracker puppy profile write permissions and constraints', () => {
    const source = readFileSync(rlsTestPath, 'utf8');

    for (const expected of [
      'non-member cannot update puppy selected quick trackers',
      'viewer cannot update puppy selected quick trackers',
      'caregiver cannot update puppy selected quick trackers',
      'owner can update puppy selected quick trackers',
      'puppy selected quick trackers reject duplicate ids',
      'puppy selected quick trackers reject more than five ids',
      'puppy selected quick trackers reject empty selected set',
      'puppy selected quick trackers reject unknown tracker ids',
      'puppy selected quick trackers reject legacy tracker ids',
      'puppy selected quick trackers reject health-only weight tracker',
    ]) {
      assert.ok(source.includes(expected), `missing RLS coverage text: ${expected}`);
    }

    for (const expected of [
      /ARRAY\['feeding', 'walk'\]::text\[\]/u,
      /ARRAY\['potty', 'feeding', 'sleep', 'walk', 'zoomies'\]::text\[\]/u,
    ]) {
      assert.ok(expected.test(source), `missing canonical selected-tracker fixture: ${expected}`);
    }

    for (const rejectedLegacyId of [
      'potty_pee_outside',
      'potty_pee_inside',
      'potty_poop',
      'feeding_meal',
      'sleep_nap',
      'training',
    ]) {
      const legacyFixturePattern = new RegExp(`ARRAY\\[[^\\]]*${rejectedLegacyId}[^\\]]*\\]::text\\[\\]`, 'u');
      assert.ok(
        !legacyFixturePattern.test(source),
        `RLS selected-tracker fixtures still use legacy id: ${rejectedLegacyId}`,
      );
    }
  });

  it('covers household invite RPC permissions, lifecycle, membership, and hash formats', () => {
    const source = readFileSync(rlsTestPath, 'utf8');
    const labels = [
      'owner can create a 64-character caregiver invite',
      'create leaves exactly one active household invite',
      'caregiver cannot create household invites',
      'non-owner cannot revoke household invites',
      'owner can revoke household invites',
      'revoked household invite cannot be accepted',
      'AC-F1 existing owner keeps actual role and receives already-member outcome',
      'AC-F1 existing caregiver keeps actual role and receives already-member outcome',
      'AC-F1 existing viewer keeps actual role and receives already-member outcome',
      'AC-F1 existing members leave unused household invites unconsumed',
      'AC-F2 new member receives accepted outcome in owner household as caregiver',
      'accepting household invite adds caregiver membership',
      'expired household invite cannot be accepted',
      'reused household invite is rejected for a different user',
      'AC-F3 accepted household invite retry returns actual role and already-member outcome',
      'AC-F3 consumed invite is unavailable after accepted membership is revoked',
      'invite secret accepts exact lowercase sha256 hash format',
      'invite secret preserves Argon2id hash compatibility',
      'authenticated owner cannot directly create household invites',
    ];

    for (const label of labels) {
      assert.equal(source.split(label).length - 1, 1, `${label} must appear exactly once`);
    }

    assert.match(source, /public\.create_household_invite\('caregiver', interval '7 days'\)/u);
    assert.match(source, /public\.accept_household_invite\(repeat\('a', 64\)\)/u);
    assert.match(source, /extensions\.digest\(repeat\('a', 64\), 'sha256'\)/u);
    assert.match(source, /'P4202'/u);
    assert.match(source, /'P4203'/u);
    assert.doesNotMatch(source, /argon2id:invite-hash/u);
  });
});

describe('PUP-42 Phase 0 household invite migration guardrails', () => {
  it('defines authenticated-only SECURITY DEFINER RPCs with pinned search paths', () => {
    const migration = readFileSync(householdInviteMigrationPath(), 'utf8');
    const expectedSignatures = [
      [
        'create_household_invite',
        /p_role text DEFAULT 'caregiver', p_ttl interval DEFAULT '7 days'/u,
        /RETURNS TABLE \(token text, expires_at timestamptz\)/u,
      ],
      [
        'accept_household_invite',
        /p_token text/u,
        /RETURNS TABLE \(household_id uuid, role text\)/u,
      ],
      [
        'revoke_household_invite',
        /p_invite_id uuid/u,
        /RETURNS boolean/u,
      ],
    ];

    for (const [name, argumentsPattern, returnPattern] of expectedSignatures) {
      const block = namedFunctionBlock(migration, name);

      assert.match(block, argumentsPattern);
      assert.match(block, returnPattern);
      assert.match(block, /SECURITY DEFINER\s+SET search_path = ''/u);
      assert.match(block, /auth\.uid\(\)/u);
      assert.match(
        migration,
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^;]+\\) FROM PUBLIC;`, 'u'),
      );
      assert.match(
        migration,
        new RegExp(
          `REVOKE ALL ON FUNCTION public\\.${name}\\([^;]+\\) FROM anon, authenticated;`,
          'u',
        ),
      );
      assert.match(
        migration,
        new RegExp(
          `GRANT EXECUTE ON FUNCTION public\\.${name}\\([^;]+\\) TO authenticated;`,
          'u',
        ),
      );
    }
  });

  it('generates a 256-bit token once and stores only its SHA-256 digest', () => {
    const migration = readFileSync(householdInviteMigrationPath(), 'utf8');
    const createBlock = namedFunctionBlock(migration, 'create_household_invite');
    const acceptBlock = namedFunctionBlock(migration, 'accept_household_invite');

    assert.match(
      createBlock,
      /v_token := encode\(extensions\.gen_random_bytes\(32\), 'hex'\);/u,
    );
    assert.match(
      createBlock,
      /'sha256:' \|\| encode\(extensions\.digest\(v_token, 'sha256'\), 'hex'\)/u,
    );
    assert.match(createBlock, /right\(v_token, 4\)/u);
    assert.match(createBlock, /INSERT INTO public\.invite/u);
    assert.match(createBlock, /INSERT INTO app_private\.invite_secret/u);
    assert.match(
      createBlock,
      /FROM public\.household AS household[\s\S]*?FOR UPDATE OF household;/u,
    );
    assert.doesNotMatch(createBlock, /token_hash\s*\)\s*VALUES\s*\([^)]*\bv_token\b/u);
    assert.match(
      acceptBlock,
      /'sha256:' \|\| encode\(extensions\.digest\(p_token, 'sha256'\), 'hex'\)/u,
    );
    assert.match(acceptBlock, /ERRCODE = 'P4201'/u);
    assert.match(acceptBlock, /ERRCODE = 'P4202'/u);
    assert.match(acceptBlock, /ERRCODE = 'P4203'/u);
  });

  it('keeps Argon2 fixtures valid while admitting only exact lowercase SHA-256 digests', () => {
    const migration = readFileSync(householdInviteMigrationPath(), 'utf8');
    const source = allMigrationSource();
    const constraint = latestConstraintBlock(source, 'invite_secret_token_hash_format');

    assert.match(
      migration,
      /DROP CONSTRAINT invite_secret_token_hash_format/u,
    );
    assert.match(constraint, /argon2id:/u);
    assert.match(constraint, /\\\$argon2id\\\$/u);
    assert.match(constraint, /sha256:\[0-9a-f\]\{64\}/u);
    assert.doesNotMatch(constraint, /\[A-F\]/u);
  });

  it('records the SHA-256 security decision and indexes ADR-0023', () => {
    const adr = readFileSync(householdInviteAdrPath, 'utf8');
    const index = readFileSync(adrIndexPath, 'utf8');

    assert.match(adr, /256[- ]bit CSPRNG/iu);
    assert.match(adr, /sha-?256/iu);
    assert.match(adr, /argon2/iu);
    assert.match(adr, /pgcrypto/iu);
    assert.match(adr, /plaintext token.*once/iu);
    assert.match(adr, /ADR-0017/u);
    assert.match(index, /adr\/0023-household-invite-token-sha256\.md/u);
  });
});

describe('PUP-42 follow-up household invite outcome migration guardrails', () => {
  it('AC-F1 AC-F2 AC-F3: preserves active membership roles and consumes only new-member invites', () => {
    const migration = readFileSync(householdInviteOutcomeMigrationPath(), 'utf8');
    const acceptBlock = namedFunctionBlock(migration, 'accept_household_invite');
    const existingMemberBranch = acceptBlock.match(
      /IF v_membership_role IS NOT NULL THEN[\s\S]*?RETURN;\s+END IF;/u,
    )?.[0] ?? '';

    assert.match(
      migration,
      /DROP FUNCTION public\.accept_household_invite\(text\);/u,
    );
    assert.match(
      acceptBlock,
      /RETURNS TABLE \(household_id uuid, role text, outcome text\)/u,
    );
    assert.match(acceptBlock, /SECURITY DEFINER\s+SET search_path = ''/u);
    assert.match(existingMemberBranch, /role := v_membership_role::text;/u);
    assert.match(existingMemberBranch, /outcome := 'already_member';/u);
    assert.doesNotMatch(existingMemberBranch, /UPDATE public\.invite/u);
    assert.match(acceptBlock, /outcome := 'accepted';/u);
    assert.ok(
      acceptBlock.indexOf(existingMemberBranch) < acceptBlock.indexOf('UPDATE public.invite'),
      'existing-member return must happen before invite consumption',
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.accept_household_invite\(text\) FROM PUBLIC;/u,
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.accept_household_invite\(text\) FROM anon, authenticated;/u,
    );
    assert.match(
      migration,
      /GRANT EXECUTE ON FUNCTION public\.accept_household_invite\(text\) TO authenticated;/u,
    );
  });
});

describe('PUP-42 cold-start bootstrap migration guardrails', () => {
  it('reuses accepted memberships and prefers a household with an active puppy', () => {
    const migration = readFileSync(bootstrapMembershipResolutionMigrationPath(), 'utf8');
    const bootstrapBlock = namedFunctionBlock(migration, 'bootstrap_current_user');
    const existingMembershipBranch = bootstrapBlock.match(
      /IF v_household_id IS NOT NULL THEN[\s\S]*?RETURN;\s+END IF;/u,
    )?.[0] ?? '';

    assert.match(bootstrapBlock, /RETURNS TABLE \(household_id uuid, created boolean\)/u);
    assert.match(bootstrapBlock, /SECURITY DEFINER\s+SET search_path = ''/u);
    assert.match(bootstrapBlock, /hm\.accepted_at IS NOT NULL/u);
    assert.match(bootstrapBlock, /hm\.revoked_at IS NULL/u);
    assert.match(
      bootstrapBlock,
      /EXISTS \([\s\S]*?FROM public\.puppy p[\s\S]*?p\.deleted_at IS NULL[\s\S]*?\) DESC/u,
    );
    assert.match(bootstrapBlock, /hm\.created_at ASC/u);
    assert.doesNotMatch(bootstrapBlock, /hm\.role = 'owner'/u);
    assert.match(existingMembershipBranch, /created := false;/u);
    assert.ok(
      bootstrapBlock.indexOf(existingMembershipBranch)
        < bootstrapBlock.indexOf('INSERT INTO public.household'),
      'an accepted membership must return before household creation',
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.bootstrap_current_user\(text\) FROM PUBLIC;/u,
    );
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.bootstrap_current_user\(text\) FROM anon, authenticated;/u,
    );
    assert.match(
      migration,
      /GRANT EXECUTE ON FUNCTION public\.bootstrap_current_user\(text\) TO authenticated;/u,
    );
  });
});

describe('PUP-42 bootstrap serialization migration guardrails', () => {
  it('AC-F15 serializes bootstrap per authenticated user before membership resolution', () => {
    const migration = readFileSync(bootstrapSerializationMigrationPath(), 'utf8');
    const bootstrapBlock = namedFunctionBlock(migration, 'bootstrap_current_user');
    const lockCall = 'PERFORM pg_catalog.pg_advisory_xact_lock(';
    const membershipLookup = 'SELECT hm.household_id';

    assert.match(bootstrapBlock, /v_user_id uuid := auth\.uid\(\);/u);
    assert.match(
      bootstrapBlock,
      /PERFORM pg_catalog\.pg_advisory_xact_lock\(\s*pg_catalog\.hashtextextended\(v_user_id::text, 0\)\s*\);/u,
    );
    assert.ok(
      bootstrapBlock.indexOf(lockCall) < bootstrapBlock.indexOf(membershipLookup),
      'the per-user transaction lock must be acquired before membership resolution',
    );
    assert.match(bootstrapBlock, /SECURITY DEFINER\s+SET search_path = ''/u);
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.bootstrap_current_user\(text\) FROM PUBLIC;/u,
    );
    assert.match(
      migration,
      /GRANT EXECUTE ON FUNCTION public\.bootstrap_current_user\(text\) TO authenticated;/u,
    );
  });
});

describe('no-Docker Supabase guardrails', () => {
  it('keeps local aggregate gates on static checks, not Supabase CLI wrappers', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    assert.match(packageJson.scripts.check, /npm run lint && npm run typecheck && npm run test/u);
    assert.match(packageJson.scripts['test:node'], /scripts\/checks\/\*\.test\.mjs/u);

    for (const localScriptName of ['check', 'test', 'test:node', 'test:scaffold']) {
      assert.doesNotMatch(
        packageJson.scripts[localScriptName],
        /supabase:(?:test|lint|ci:remote|verify:remote)|db:push:remote:dry-run|run-remote-cli/u,
        `${localScriptName} must remain no-Docker and non-remote`,
      );
    }
  });

  it('provides an explicit static SQL/RLS/typegen guardrail script for schema work', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    assert.equal(
      packageJson.scripts['supabase:guardrails'],
      'node --test scripts/checks/supabase-baseline.test.mjs scripts/checks/supabase-typegen-output.test.mjs && node scripts/checks/check-database-types-generated.mjs',
    );
    assert.doesNotMatch(
      packageJson.scripts['supabase:guardrails'],
      /run-remote-cli|supabase:(?:test|lint|ci:remote|verify:remote)|db:push:remote:dry-run/u,
    );
  });

  it('keeps generated database type drift as a full-file git status gate', () => {
    const source = readFileSync(databaseTypesGeneratedCheckPath, 'utf8');

    assert.match(source, /spawnSync\('git', \['status', '--short', '--', databaseTypesPath\]/u);
    assert.match(source, /Run npm run db:types/u);
  });

  it('keeps remote database wrappers explicit-only and pins the Supabase CLI package', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const source = readFileSync(remoteCliPath, 'utf8');

    assert.equal(packageJson.scripts['supabase:test'], 'node scripts/supabase/run-remote-cli.mjs test');
    assert.equal(packageJson.scripts['supabase:lint'], 'node scripts/supabase/run-remote-cli.mjs lint');
    assert.equal(packageJson.scripts['db:types'], 'node scripts/supabase/run-remote-cli.mjs types');
    assert.match(source, /supabase@2\.101\.0/u);
    assert.doesNotMatch(source, /--linked/u);
    assert.match(source, /push: \['db', 'push', '--db-url', dbUrl, '--yes'\]/u);
    assert.match(source, /'push-dry-run': \['db', 'push', '--db-url', dbUrl, '--dry-run'\]/u);
    assert.match(source, /SUPABASE_DB_URL is required/u);
  });

  it('allows no-Docker typegen through project ref and disables Docker-only modes', () => {
    const source = readFileSync(remoteCliPath, 'utf8');

    assert.match(source, /SUPABASE_PROJECT_REF/u);
    assert.match(source, /--project-id/u);
    assert.doesNotMatch(source, /SUPABASE_CLI_DOCKER_ALLOWED/u);
    assert.match(source, /requires Docker/u);
    assert.match(source, /Docker is disabled/u);
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

  it('keeps the remote workflow off Docker and on static/typegen checks', () => {
    const workflow = readFileSync(remoteWorkflowPath, 'utf8');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    assert.match(workflow, /name: Supabase Remote Dev/u);
    assert.match(workflow, /runs-on: ubuntu-latest/u);
    assert.match(workflow, /persist-credentials:\s*false/u);
    assert.doesNotMatch(workflow, /SUPABASE_CLI_DOCKER_ALLOWED/u);
    assert.match(workflow, /SUPABASE_PROJECT_REF: olymqppxsadsxfrcyskh/u);
    assert.match(workflow, /PUPPYPLAN_DEV_SUPABASE_DB_URL/u);
    assert.match(workflow, /npm run supabase:ci:remote/u);
    assert.match(
      workflow,
      /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02\s+#\s+v4\.6\.2/u,
    );
    assert.match(workflow, /path: src\/contracts\/database\.types\.ts/u);
    assert.match(packageJson.scripts['supabase:verify:remote'], /supabase:lint/u);
    assert.doesNotMatch(packageJson.scripts['supabase:verify:remote'], /supabase:lint:remote/u);
    assert.doesNotMatch(packageJson.scripts['supabase:ci:remote'], /supabase:test/u);
    assert.match(packageJson.scripts['supabase:ci:remote'], /db:types/u);
    assert.doesNotMatch(packageJson.scripts['supabase:ci:remote'], /supabase:test:remote|db:types:remote/u);
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
