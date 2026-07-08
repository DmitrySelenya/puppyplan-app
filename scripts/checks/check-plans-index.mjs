import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const plansDir = join(repoRoot, 'docs', 'plans');
const readme = readFileSync(join(plansDir, 'README.md'), 'utf8');

const activePlans = readdirSync(join(plansDir, 'active')).filter((name) => name.endsWith('.md'));

const missing = activePlans.filter((name) => !readme.includes(`active/${name}`));
assert.deepEqual(
  missing,
  [],
  `Every docs/plans/active/*.md file must be registered in the docs/plans/README.md Current Plans table. Missing: ${missing.join(', ')}`,
);

const staleActiveRefs = [...readme.matchAll(/active\/([\w.-]+\.md)/g)]
  .map((match) => match[1])
  .filter((name) => !activePlans.includes(name));
assert.deepEqual(
  staleActiveRefs,
  [],
  `docs/plans/README.md references active plans that do not exist (moved or renamed without updating the index): ${[...new Set(staleActiveRefs)].join(', ')}`,
);

console.log(`check-plans-index: ${activePlans.length} active plans registered in docs/plans/README.md`);
