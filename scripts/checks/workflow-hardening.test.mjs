import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const workflowPaths = [
  '.github/workflows/pr-metadata.yml',
  '.github/workflows/supabase-remote-dev.yml',
  '.github/workflows/verification.yml',
];

describe('workflow hardening', () => {
  it('disables persisted checkout credentials in PR-controlled jobs', () => {
    for (const path of workflowPaths) {
      const source = readFileSync(path, 'utf8');

      assert.match(source, /uses:\s*actions\/checkout@v4/);
      assert.match(source, /persist-credentials:\s*false/, path);
    }
  });
});
