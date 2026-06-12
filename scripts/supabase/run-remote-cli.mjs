import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { normalizeGeneratedTypes } from './typegen-output.mjs';

const mode = process.argv[2];
const rawDbUrl = process.env.SUPABASE_DB_URL || readDotenvValue('SUPABASE_DB_URL');
const dbUrl = normalizeDbUrl(rawDbUrl);
const projectRef = process.env.SUPABASE_PROJECT_REF || readDotenvValue('SUPABASE_PROJECT_REF');
const supabaseAccessToken =
  process.env.SUPABASE_ACCESS_TOKEN || readDotenvValue('SUPABASE_ACCESS_TOKEN');
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const supabaseCliPackage = 'supabase@2.101.0';

const commandByMode = {
  push: ['db', 'push', '--db-url', dbUrl, '--yes'],
  test: ['test', 'db', '--db-url', dbUrl, 'supabase/tests'],
  lint: ['db', 'lint', '--db-url', dbUrl],
  'push-dry-run': ['db', 'push', '--db-url', dbUrl, '--dry-run'],
};

if (!['push', 'test', 'lint', 'types', 'push-dry-run'].includes(mode)) {
  console.error('Usage: node scripts/supabase/run-remote-cli.mjs <push|test|lint|types|push-dry-run>');
  process.exit(2);
}

if (['push', 'test', 'lint', 'push-dry-run'].includes(mode) && !dbUrl) {
  console.error('SUPABASE_DB_URL is required for remote Supabase CLI checks.');
  process.exit(2);
}

if (mode === 'test' && process.env.SUPABASE_CLI_DOCKER_ALLOWED !== '1') {
  console.error([
    'Supabase CLI remote pgTAP requires Docker even when --db-url points at a remote database.',
    'Docker is disabled for this M1/8 GB workspace.',
    'Run this mode only on a Docker-capable CI/cloud runner with SUPABASE_CLI_DOCKER_ALLOWED=1.',
  ].join('\n'));
  process.exit(2);
}

if (mode === 'types') {
  runTypeGeneration();
} else if (mode in commandByMode) {
  runSupabase(commandByMode[mode]);
}

function runTypeGeneration() {
  if (projectRef) {
    runSupabase(
      ['gen', 'types', 'typescript', '--project-id', projectRef, '--schema', 'public'],
      { outputFile: 'src/contracts/database.types.ts' },
    );
    return;
  }

  if (!dbUrl) {
    console.error([
      'SUPABASE_PROJECT_REF is required for no-Docker Supabase type generation.',
      'Set SUPABASE_PROJECT_REF and authenticate the Supabase CLI, or run with SUPABASE_DB_URL on a Docker-capable CI/cloud runner.',
    ].join('\n'));
    process.exit(2);
  }

  if (process.env.SUPABASE_CLI_DOCKER_ALLOWED !== '1') {
    console.error([
      'Supabase CLI type generation with --db-url requires Docker.',
      'Docker is disabled for this M1/8 GB workspace.',
      'Set SUPABASE_PROJECT_REF for no-Docker typegen, or run this mode on a Docker-capable CI/cloud runner with SUPABASE_CLI_DOCKER_ALLOWED=1.',
    ].join('\n'));
    process.exit(2);
  }

  runSupabase(
    ['gen', 'types', 'typescript', '--db-url', dbUrl, '--schema', 'public'],
    { outputFile: 'src/contracts/database.types.ts' },
  );
}

function runSupabase(args, options = {}) {
  const result = spawnSync(npxCommand, ['--yes', supabaseCliPackage, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: supabaseAccessToken
      ? { ...process.env, SUPABASE_ACCESS_TOKEN: supabaseAccessToken }
      : process.env,
    maxBuffer: 50 * 1024 * 1024,
  });

  const status = typeof result.status === 'number' ? result.status : 1;
  const stdout = redact(result.stdout || '');
  const stderr = redact(result.stderr || '');

  if (options.outputFile) {
    if (status === 0) {
      const outputPath = resolve(options.outputFile);
      const tempPath = `${outputPath}.${process.pid}.tmp`;
      writeFileSync(tempPath, normalizeGeneratedTypes(stdout));
      renameSync(tempPath, outputPath);
    } else if (stdout) {
      process.stdout.write(stdout);
    }
  } else if (stdout) {
    process.stdout.write(stdout);
  }

  if (stderr) {
    process.stderr.write(stderr);
  }

  process.exit(status);
}

function readDotenvValue(key) {
  const path = resolve('.env');

  if (!existsSync(path)) {
    return '';
  }

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);

    if (!match || match[1] !== key) {
      continue;
    }

    return unquoteEnvValue(match[2].trim());
  }

  return '';
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value.replace(/\s+#.*$/u, '');
}

function normalizeDbUrl(value) {
  if (!value) {
    return '';
  }

  try {
    return new URL(value).href;
  } catch {
    return value;
  }
}

function redact(output) {
  const urlsToRedact = [rawDbUrl, dbUrl].filter(Boolean);
  const withoutExactDbUrl = urlsToRedact.reduce(
    (text, url) => text.split(url).join('[REDACTED_SUPABASE_DB_URL]'),
    output,
  );
  const withoutAccessToken = supabaseAccessToken
    ? withoutExactDbUrl.split(supabaseAccessToken).join('[REDACTED_SUPABASE_ACCESS_TOKEN]')
    : withoutExactDbUrl;

  return withoutAccessToken
    .replace(/\b(postgres(?:ql)?:\/\/)([^:\s/@]+):([^@\s]+)@/giu, '$1[REDACTED_CREDENTIALS]@')
    .replace(/\b(postgres(?:ql)?%3A%2F%2F)([^%\s]+?)(?:%3A|:)([^%\s]+?)(?:%40|@)/giu, '$1[REDACTED_CREDENTIALS]%40')
    .replace(/:([^:@/\s]+)@([A-Za-z0-9.-]+:\d+)/gu, ':[REDACTED_PASSWORD]@$2');
}
