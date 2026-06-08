import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { assertKnownDevSupabaseTarget } from './dev-project-guard.mjs';

const accessToken = readEnvValue('SUPABASE_ACCESS_TOKEN');
const projectRef = readEnvValue('SUPABASE_PROJECT_REF');

if (!accessToken || !projectRef) {
  console.error([
    'SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required.',
    'Set them in the shell or local .env before updating the dev Auth email OTP templates.',
  ].join('\n'));
  process.exit(2);
}

try {
  assertKnownDevSupabaseTarget({
    projectRef,
    scriptName: 'dev Auth email OTP template helper',
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid Supabase dev target.');
  process.exit(2);
}

const otpSubject = 'Your PuppyPlan verification code';
const otpContent = [
  '<h2>Your PuppyPlan verification code</h2>',
  '<p>Enter this 6-digit code in PuppyPlan:</p>',
  '<p><strong>{{ .Token }}</strong></p>',
  '<p>This code expires shortly. If you did not request it, you can ignore this email.</p>',
].join('');

const authConfigUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const updatePayload = {
  mailer_otp_length: 6,
  mailer_subjects_confirmation: otpSubject,
  mailer_templates_confirmation_content: otpContent,
  mailer_subjects_magic_link: otpSubject,
  mailer_templates_magic_link_content: otpContent,
};

const currentResponse = await fetch(authConfigUrl, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

if (!currentResponse.ok) {
  console.error(`Could not read dev Auth config: HTTP ${currentResponse.status}`);
  process.exit(1);
}

const currentConfig = await currentResponse.json();
const currentUsesOtp =
  templateUsesOtp(currentConfig.mailer_templates_confirmation_content) &&
  templateUsesOtp(currentConfig.mailer_templates_magic_link_content);

const updateResponse = await fetch(authConfigUrl, {
  body: JSON.stringify(updatePayload),
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  method: 'PATCH',
});

if (!updateResponse.ok) {
  console.error(`Could not update dev Auth email OTP templates: HTTP ${updateResponse.status}`);
  process.exit(1);
}

console.log([
  `Updated dev Auth email OTP templates for project ${projectRef}.`,
  `Previously code-based: ${currentUsesOtp ? 'yes' : 'no'}.`,
  'Updated config: mailer_otp_length=6, confirmation template, magic_link template.',
].join('\n'));

function templateUsesOtp(value) {
  return typeof value === 'string' && value.includes('{{ .Token }}');
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
