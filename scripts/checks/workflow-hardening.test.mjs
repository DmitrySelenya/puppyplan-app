import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const workflowPaths = [
  '.github/workflows/pr-metadata.yml',
  '.github/workflows/supabase-remote-dev.yml',
  '.github/workflows/verification.yml',
];

const pinnedActions = {
  'actions/checkout': {
    sha: 'de0fac2e4500dabe0009e67214ff5f5447ce83dd',
    version: 'v6.0.2',
  },
  'actions/setup-node': {
    sha: '48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e',
    version: 'v6.4.0',
  },
  'actions/upload-artifact': {
    sha: 'ea165f8d65b6e75b540449e92b4886f43607fa02',
    version: 'v4.6.2',
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
});
