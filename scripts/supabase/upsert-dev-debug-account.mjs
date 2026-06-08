import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { assertKnownDevSupabaseTarget } from './dev-project-guard.mjs';

const configSchema = z
  .object({
    adminKey: z.string().min(16),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(12),
    url: z.string().url(),
  })
  .strict();

const parsedConfig = configSchema.safeParse({
  adminKey: readEnvValue('PUPPYPLAN_DEV_SUPABASE_AUTH_ADMIN_KEY'),
  email: readEnvValue('EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_EMAIL'),
  password: readEnvValue('EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_PASSWORD'),
  url: readEnvValue('EXPO_PUBLIC_SUPABASE_URL'),
});

if (!parsedConfig.success) {
  console.error([
    'Dev debug account setup requires local Supabase URL, admin auth key, and synthetic debug credentials.',
    'Required env: EXPO_PUBLIC_SUPABASE_URL, PUPPYPLAN_DEV_SUPABASE_AUTH_ADMIN_KEY, EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_EMAIL, EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_PASSWORD.',
  ].join('\n'));
  process.exit(2);
}

const { adminKey, email, password, url } = parsedConfig.data;

try {
  assertKnownDevSupabaseTarget({
    scriptName: 'dev debug account helper',
    url,
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid Supabase dev target.');
  process.exit(2);
}

const supabase = createClient(url, adminKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const createResult = await supabase.auth.admin.createUser({
  email,
  email_confirm: true,
  password,
  user_metadata: {
    debug_account: true,
  },
});

if (!createResult.error) {
  console.log('Created synthetic dev debug account.');
  process.exit(0);
}

const existingUser = await findUserByEmail(email);

if (!existingUser) {
  console.error(`Could not create synthetic dev debug account: ${createResult.error.name}`);
  process.exit(1);
}

const updateResult = await supabase.auth.admin.updateUserById(existingUser.id, {
  email_confirm: true,
  password,
  user_metadata: {
    ...existingUser.user_metadata,
    debug_account: true,
  },
});

if (updateResult.error) {
  console.error(`Could not update synthetic dev debug account: ${updateResult.error.name}`);
  process.exit(1);
}

console.log('Updated synthetic dev debug account.');

async function findUserByEmail(targetEmail) {
  const listResult = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listResult.error) {
    return null;
  }

  return listResult.data.users.find((user) => user.email?.toLowerCase() === targetEmail) ?? null;
}

function readEnvValue(key) {
  return process.env[key] || readDotenvValue(key);
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

  return value;
}
