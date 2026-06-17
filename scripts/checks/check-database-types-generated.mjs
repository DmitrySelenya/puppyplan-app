import { existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const databaseTypesPath = 'src/contracts/database.types.ts';

if (!existsSync(databaseTypesPath) || statSync(databaseTypesPath).size === 0) {
  console.error(`${databaseTypesPath} must be generated before this gate can pass.`);
  process.exit(1);
}

const status = spawnSync('git', ['status', '--short', '--', databaseTypesPath], {
  encoding: 'utf8',
});

if (status.status !== 0) {
  process.stderr.write(status.stderr || 'Failed to inspect database type git status.\n');
  process.exit(status.status ?? 1);
}

if (status.stdout.trim()) {
  console.error([
    `${databaseTypesPath} is not committed or is out of date.`,
    'Run npm run db:types against the approved dev database, review the diff, and commit the generated file.',
    status.stdout.trim(),
  ].join('\n'));
  process.exit(1);
}
