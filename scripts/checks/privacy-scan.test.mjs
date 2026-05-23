import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatPrivacyViolation,
  listWorkspaceFiles,
  scanPrivacyText,
  shouldScanPrivacyPath,
} from './privacy-scan.mjs';

describe('scanPrivacyText', () => {
  it('allows documented route token placeholders and synthetic example email domains', () => {
    assert.deepEqual(
      scanPrivacyText({
        path: 'docs/example.md',
        text: 'Use /invite/[token] and contact caregiver@example.test for synthetic docs.',
      }),
      [],
    );
  });

  it('rejects private-looking email addresses', () => {
    const email = `person@${'gmail'}.com`;
    const violations = scanPrivacyText({
      path: 'src/test/example.ts',
      text: `const ownerEmail = "${email}";`,
    });

    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.kind, 'email');
  });

  it('rejects obvious API tokens', () => {
    const token = `sk-${'abcdefghijklmnopqrstuvwxyz'}123456`;
    const violations = scanPrivacyText({
      path: 'docs/example.md',
      text: `OPENAI_API_KEY=${token}`,
    });

    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.kind, 'token');
  });

  it('rejects forbidden private-data fixture placeholders', () => {
    const privateFixture = `Fi${'do'}`;
    const violations = scanPrivacyText({
      path: 'src/test/example.ts',
      text: `const puppyName = "${privateFixture}";`,
    });

    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.kind, 'private-fixture');
  });

  it('rejects canonical private-data fixture placeholders from the shared design policy', () => {
    const privateFixture = `Lu${'na'}`;
    const violations = scanPrivacyText({
      path: 'src/test/example.ts',
      text: `const puppyName = "${privateFixture}";`,
    });

    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.kind, 'private-fixture');
  });

  it('redacts matched values from failure output', () => {
    const email = `person@${'gmail'}.com`;
    const [violation] = scanPrivacyText({
      path: 'src/test/example.ts',
      text: `const ownerEmail = "${email}";`,
    });

    const output = formatPrivacyViolation(violation);
    assert.match(output, /src\/test\/example\.ts:1/);
    assert.match(output, /private-looking email address/);
    assert.doesNotMatch(output, /gmail\.com/);
    assert.doesNotMatch(output, /person@/);
  });

  it('scans future script tests instead of excluding every test file', () => {
    assert.equal(shouldScanPrivacyPath('scripts/checks/future-leak.test.mjs'), true);
  });

  it('lists root-relative workspace files regardless of the caller cwd', () => {
    const files = listWorkspaceFiles();

    assert.equal(files.includes('package.json'), true);
    assert.equal(files.includes('src/test/README.md'), true);
  });

  it('allows common lowercase words like blind spot', () => {
    assert.deepEqual(
      scanPrivacyText({
        path: 'docs/example.md',
        text: 'Check the blind spot in this workflow.',
      }),
      [],
    );
  });
});
