import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const SAFE_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.net',
  'example.org',
  'example.test',
  'localhost',
]);
const SAFE_EMAIL_ADDRESSES = new Set(['support@puppyplan.app']);

const SKIPPED_PATHS = [
  /^node_modules\//,
  /^\.git\//,
  /^\.expo\//,
  /^coverage\//,
  /^docs\/design\/v1\/raw\//,
  /^docs\/design\/v2\/reference\//,
  /^scripts\/checks\/privacy-scan\.mjs$/,
  /^scripts\/design\/lib\/policy\.mjs$/,
  /^scripts\/design\/lib\/policy\.test\.mjs$/,
  /(^|\/)package-lock\.json$/,
];

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,}|localhost)\b/gi;
const TOKEN_PATTERNS = [
  /(?:^|[^A-Za-z0-9])AKIA[0-9A-Z]{16}\b/g,
  /\bghp_[A-Za-z0-9_]{30,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/g,
  /\bsk-[A-Za-z0-9]{20,}\b/g,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
];
const SECRET_ASSIGNMENT_PATTERN =
  /\b(?:api[_-]?key|secret|password|service[_-]?role[_-]?key|token)\b\s*[:=]\s*["']?([A-Za-z0-9_./+=-]{16,})["']?/gi;
const TELEMETRY_GUARDRAIL_PATH_PATTERN = /^(?:app|src|supabase\/functions)\//;
const TELEMETRY_DIRECT_SDK_ALLOWED_PATHS = [
  /^src\/lib\/observability\//,
  /^src\/lib\/analytics\//,
  /^scripts\/checks\/privacy-scan\.test\.mjs$/,
];
const FORBIDDEN_DIRECT_TELEMETRY_SDK_PATTERNS = [
  {
    pattern: /\bSentry\.[A-Za-z]\w*\s*\(/g,
    reason: 'direct Sentry SDK call outside observability wrapper',
  },
  {
    pattern: /\bposthog\.[A-Za-z]\w*\s*\(/gi,
    reason: 'direct PostHog SDK call outside analytics wrapper',
  },
];
const FORBIDDEN_TELEMETRY_CONFIG_PATTERNS = [
  {
    pattern: /\bposthog\.init\s*\([\s\S]*\bautocapture\s*:\s*true/gi,
    reason: 'PostHog autocapture must stay disabled',
  },
  {
    pattern: /\bsession_?replay\b\s*:\s*true/gi,
    reason: 'session replay must stay disabled',
  },
  {
    pattern: /\bsessionRecording\b\s*:\s*true/gi,
    reason: 'session recording must stay disabled',
  },
];
const FORBIDDEN_PRIVATE_FIXTURE_PATTERNS = [
  {
    pattern: /\b(?:Fido|Rex|Buddy|Fluffy|Olya|Luna|Bublik|Sarah|Sara)\b/g,
    reason: 'forbidden private-data fixture placeholder',
  },
  {
    pattern:
      /(?:Аня|Марк|Оля|Оли|Лена|Ирина|Ирины|Ирине|Ирину|Ириной|Томаш|Сара|Сары|Саре|Сару|Сарой|Луна|Луну|Бублика|Бублику|Бублик|Марина)/g,
    reason: 'forbidden private-data fixture placeholder',
  },
  {
    pattern: /Kind Hands Clinic|Mild swelling at injection site/g,
    reason: 'forbidden provider or note fixture placeholder',
  },
];

function lineForIndex(text, index = 0) {
  return text.slice(0, index).split('\n').length;
}

export function shouldScanPrivacyPath(path) {
  if (SKIPPED_PATHS.some((pattern) => pattern.test(path))) {
    return false;
  }

  return TEXT_EXTENSIONS.has(extname(path)) || path.startsWith('.github/');
}

function shouldScanDirectTelemetrySdkPath(path) {
  return TELEMETRY_GUARDRAIL_PATH_PATTERN.test(path)
    && !TELEMETRY_DIRECT_SDK_ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

export function scanPrivacyText({ path, text }) {
  const violations = [];

  for (const match of text.matchAll(EMAIL_PATTERN)) {
    const domain = match[1]?.toLowerCase();

    if (SAFE_EMAIL_ADDRESSES.has(match[0].toLowerCase())) {
      continue;
    }

    if (domain && !SAFE_EMAIL_DOMAINS.has(domain)) {
      violations.push({
        kind: 'email',
        line: lineForIndex(text, match.index),
        message: 'private-looking email address',
        path,
        value: match[0],
      });
    }
  }

  for (const pattern of TOKEN_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      violations.push({
        kind: 'token',
        line: lineForIndex(text, match.index),
        message: 'obvious token or credential pattern',
        path,
        value: match[0].trim(),
      });
    }
  }

  for (const match of text.matchAll(SECRET_ASSIGNMENT_PATTERN)) {
    const value = match[1] ?? '';

    if (!value.includes('...') && !value.includes('[token]') && !value.startsWith('<')) {
      violations.push({
        kind: 'token',
        line: lineForIndex(text, match.index),
        message: 'secret-like assignment',
        path,
        value: match[0],
      });
    }
  }

  if (shouldScanDirectTelemetrySdkPath(path)) {
    for (const { pattern, reason } of FORBIDDEN_DIRECT_TELEMETRY_SDK_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        violations.push({
          kind: 'telemetry-sdk',
          line: lineForIndex(text, match.index),
          message: reason,
          path,
          value: match[0],
        });
      }
    }
  }

  if (TELEMETRY_GUARDRAIL_PATH_PATTERN.test(path)) {
    for (const { pattern, reason } of FORBIDDEN_TELEMETRY_CONFIG_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        violations.push({
          kind: 'telemetry-sdk',
          line: lineForIndex(text, match.index),
          message: reason,
          path,
          value: match[0],
        });
      }
    }
  }

  for (const { pattern, reason } of FORBIDDEN_PRIVATE_FIXTURE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      violations.push({
        kind: 'private-fixture',
        line: lineForIndex(text, match.index),
        message: reason,
        path,
        value: match[0],
      });
    }
  }

  return violations;
}

export function formatPrivacyViolation(violation) {
  const line = violation.line ? `:${violation.line}` : '';
  return `${violation.path}${line}: ${violation.message} (${violation.kind}; value redacted)`;
}

export function listWorkspaceFiles() {
  return execFileSync('git', ['-C', repoRoot, 'ls-files', '--full-name', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .filter((path) => existsSync(join(repoRoot, path)));
}

function run() {
  const violations = [];

  for (const path of listWorkspaceFiles()) {
    if (!shouldScanPrivacyPath(path)) {
      continue;
    }

    const text = readFileSync(join(repoRoot, path), 'utf8');
    violations.push(...scanPrivacyText({ path, text }));
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(formatPrivacyViolation(violation));
    }

    process.exitCode = 1;
    return;
  }

  console.log('privacy scan ok');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
