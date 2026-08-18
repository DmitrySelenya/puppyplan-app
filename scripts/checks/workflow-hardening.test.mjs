import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const workflowPaths = [
  '.github/workflows/pr-metadata-autofill.yml',
  '.github/workflows/pr-metadata.yml',
  '.github/workflows/supabase-remote-dev.yml',
  '.github/workflows/verification.yml',
];

const pinnedActions = {
  'actions/checkout': {
    sha: '3d3c42e5aac5ba805825da76410c181273ba90b1',
    version: 'v7.0.1',
  },
  'actions/setup-node': {
    sha: '820762786026740c76f36085b0efc47a31fe5020',
    version: 'v7.0.0',
  },
  'actions/upload-artifact': {
    sha: '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a',
    version: 'v7.0.1',
  },
};

function getUsesLines(source) {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('uses: '));
}

describe('workflow hardening', () => {
  it('disables persisted checkout credentials in PR-controlled jobs', () => {
    for (const path of workflowPaths) {
      const source = readFileSync(path, 'utf8');

      assert.match(source, /persist-credentials:\s*false/, path);
    }
  });

  it('pins GitHub Actions to full commit SHAs with version comments', () => {
    for (const path of workflowPaths) {
      const source = readFileSync(path, 'utf8');
      const usesLines = getUsesLines(source);

      for (const usesLine of usesLines) {
        const match = /^uses:\s*([^@\s]+)@([a-f0-9]{40})\s+#\s+(v[0-9]+\.[0-9]+\.[0-9]+)$/u
          .exec(usesLine);

        assert.notEqual(match, null, `${path} has unpinned or uncommented action: ${usesLine}`);

        if (match === null) {
          continue;
        }

        const [, action, sha, version] = match;
        const knownPin = pinnedActions[action];

        assert.notEqual(knownPin, undefined, `${path} has an unregistered action pin: ${action}`);
        assert.equal(sha, knownPin.sha, `${path} must pin ${action} to ${knownPin.sha}`);
        assert.equal(version, knownPin.version, `${path} must comment ${action} as ${knownPin.version}`);
      }
    }
  });

  it('keeps SHA-pinned GitHub Actions current through Dependabot', () => {
    assert.equal(existsSync('.github/dependabot.yml'), true);

    const source = readFileSync('.github/dependabot.yml', 'utf8');

    assert.match(source, /package-ecosystem:\s*["']?github-actions["']?/);
    assert.match(source, /directory:\s*["']?\/["']?/);
    assert.match(source, /interval:\s*["']?weekly["']?/);
  });

  it('auto-fills PR metadata from the base workflow without executing PR code', () => {
    const source = readFileSync('.github/workflows/pr-metadata-autofill.yml', 'utf8');

    assert.match(source, /pull_request_target:/);
    assert.match(source, /pull-requests:\s*write/);
    assert.match(source, /ref:\s*\$\{\{\s*github\.event\.repository\.default_branch\s*\}\}/);
    assert.match(source, /node scripts\/checks\/pr-metadata-autofill\.mjs --apply/);
  });
});
