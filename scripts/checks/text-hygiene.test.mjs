import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { listWorkspaceFiles, scanTextHygiene } from './text-hygiene.mjs';

describe('scanTextHygiene', () => {
  it('accepts clean text with a final newline', () => {
    assert.deepEqual(
      scanTextHygiene({
        path: 'docs/example.md',
        text: '# Example\n\nClean line.\n',
      }),
      [],
    );
  });

  it('rejects trailing whitespace', () => {
    const violations = scanTextHygiene({
      path: 'docs/example.md',
      text: '# Example   \n',
    });

    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.kind, 'trailing-whitespace');
  });

  it('rejects markdown files without a final newline', () => {
    const violations = scanTextHygiene({
      path: 'docs/example.md',
      text: '# Example',
    });

    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.kind, 'final-newline');
  });

  it('lists root-relative workspace files regardless of the caller cwd', () => {
    const files = listWorkspaceFiles();

    assert.equal(files.includes('package.json'), true);
    assert.equal(files.includes('src/test/README.md'), true);
  });
});
