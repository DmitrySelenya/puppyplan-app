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

const SKIPPED_PATHS = [
  /^node_modules\//,
  /^\.git\//,
  /^\.expo\//,
  /^coverage\//,
  /^docs\/design\/v1\/raw\//,
  /(^|\/)package-lock\.json$/,
];

export function shouldScanTextHygienePath(path) {
  if (SKIPPED_PATHS.some((pattern) => pattern.test(path))) {
    return false;
  }

  return TEXT_EXTENSIONS.has(extname(path)) || path.startsWith('.github/');
}

export function scanTextHygiene({ path, text }) {
  const violations = [];
  const lines = text.split(/\n/);

  lines.forEach((line, index) => {
    if (/[ \t]$/.test(line)) {
      violations.push({
        kind: 'trailing-whitespace',
        line: index + 1,
        message: 'trailing whitespace',
        path,
      });
    }
  });

  if (text.length > 0 && !text.endsWith('\n')) {
    violations.push({
      kind: 'final-newline',
      line: lines.length,
      message: 'missing final newline',
      path,
    });
  }

  return violations;
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
    if (!shouldScanTextHygienePath(path)) {
      continue;
    }

    const text = readFileSync(join(repoRoot, path), 'utf8');
    violations.push(...scanTextHygiene({ path, text }));
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`${violation.path}:${violation.line}: ${violation.message}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log('text hygiene ok');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
