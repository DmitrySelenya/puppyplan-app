import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const databaseTypesPath = 'src/contracts/database.types.ts';
const supabaseContractPath = 'src/contracts/supabase.ts';

if (!existsSync(databaseTypesPath) || statSync(databaseTypesPath).size === 0) {
  writeError(`${databaseTypesPath} must be generated before this gate can pass.`);
  process.exit(1);
}

try {
  const databaseTypes = readFileSync(databaseTypesPath, 'utf8');
  const supabaseContract = readFileSync(supabaseContractPath, 'utf8');
  const expectedEventTypes = exportedArrayValues(supabaseContract, 'eventTypes');

  assert.deepEqual(
    databaseTypeUnionValues(databaseTypes, 'event_type'),
    expectedEventTypes,
    'Database public.Enums.event_type union must match src/contracts/supabase.ts eventTypes.',
  );
  assert.deepEqual(
    databaseConstantsEnumValues(databaseTypes, 'event_type'),
    expectedEventTypes,
    'Database Constants.public.Enums.event_type must match src/contracts/supabase.ts eventTypes.',
  );
} catch (error) {
  writeError(`${databaseTypesPath} is out of date with the Supabase contract.`);
  writeError(error instanceof Error ? error.message : String(error));
  writeError('Run npm run db:types against the approved dev database or update the generated type artifact, then review the diff.');
  process.exit(1);
}

if (process.env.CI === 'true') {
  const status = spawnSync('git', ['status', '--short', '--', databaseTypesPath], {
    encoding: 'utf8',
  });

  if (status.status !== 0) {
    process.stderr.write(status.stderr || 'Failed to inspect database type git status.\n');
    process.exit(status.status ?? 1);
  }

  if (status.stdout.trim()) {
    writeError([
      `${databaseTypesPath} changed during generated type verification.`,
      'Run npm run db:types against the approved dev database, review the diff, and commit the generated file.',
      status.stdout.trim(),
    ].join('\n'));
    process.exit(1);
  }
}

function writeError(message) {
  process.stderr.write(`${message}\n`);
}

function exportedArrayValues(source, name) {
  const match = source.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`, 'u'));
  assert.ok(match, `missing ${name} export`);

  return [...match[1].matchAll(/'([^']+)'/gu)].map((item) => item[1]);
}

function databaseTypeUnionValues(source, enumName) {
  const match = source.match(new RegExp(`${enumName}:\\n([\\s\\S]*?)(?:\\n\\s{6}[a-z_]+:|\\n\\s{4}\\})`, 'u'));
  assert.ok(match, `missing Database public.Enums.${enumName} type union`);

  return [...match[1].matchAll(/\\| "([^"]+)"/gu)].map((item) => item[1]);
}

function databaseConstantsEnumValues(source, enumName) {
  const match = source.match(new RegExp(`${enumName}: \\[([\\s\\S]*?)\\]`, 'u'));
  assert.ok(match, `missing Database Constants.public.Enums.${enumName} array`);

  return [...match[1].matchAll(/"([^"]+)"/gu)].map((item) => item[1]);
}
