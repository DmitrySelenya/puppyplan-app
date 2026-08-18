import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  formatPrivacyViolation,
  listWorkspaceFiles,
  repoRoot,
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

  it('does not list tracked paths that were removed from the working tree', () => {
    const files = listWorkspaceFiles();

    for (const file of files) {
      assert.equal(existsSync(join(repoRoot, file)), true, file);
    }
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

  it('rejects direct Sentry SDK calls in app code', () => {
    const sentryCalls = [
      `Sentry.${'captureException'}(error)`,
      `Sentry.${'captureMessage'}('failed')`,
      `Sentry.${'captureEvent'}({ message: 'failed' })`,
      `Sentry.${'addBreadcrumb'}({ category: 'quick_log' })`,
      `Sentry.${'setUser'}({ id: 'raw-user' })`,
      `Sentry.${'setContext'}('quick_log', {})`,
      `Sentry.${'withScope'}(() => undefined)`,
    ].join('\n');
    const violations = scanPrivacyText({
      path: 'src/features/example.ts',
      text: sentryCalls,
    });

    assert.equal(violations.length, 7);
    assert.deepEqual(
      violations.map((violation) => violation.kind),
      Array.from({ length: 7 }, () => 'telemetry-sdk'),
    );
  });

  it('rejects direct PostHog SDK calls in app code', () => {
    const posthogCalls = [
      `posthog.${'capture'}('quick_log_saved')`,
      `posthog.${'identify'}('raw-user-id')`,
      `posthog.${'alias'}('raw-user-id')`,
      `posthog.${'register'}({ household_id: 'raw-household' })`,
    ].join('\n');
    const violations = scanPrivacyText({
      path: 'src/features/example.ts',
      text: posthogCalls,
    });

    assert.equal(violations.length, 4);
    assert.deepEqual(
      violations.map((violation) => violation.kind),
      Array.from({ length: 4 }, () => 'telemetry-sdk'),
    );
  });

  it('allows telemetry SDK calls only in wrapper and privacy-scan test files', () => {
    assert.deepEqual(
      scanPrivacyText({
        path: 'src/lib/observability/sentry-adapter.ts',
        text: `Sentry.${'captureException'}(error)`,
      }),
      [],
    );
    assert.deepEqual(
      scanPrivacyText({
        path: 'src/lib/analytics/posthog-adapter.ts',
        text: `posthog.${'capture'}('quick_log_saved')`,
      }),
      [],
    );
    assert.deepEqual(
      scanPrivacyText({
        path: 'scripts/checks/privacy-scan.test.mjs',
        text: `Sentry.${'captureMessage'}('fixture')\nposthog.${'identify'}('fixture')`,
      }),
      [],
    );
  });

  it('rejects absolute local home paths that would leak a machine account', () => {
    const homePath = `/Users/${'someone'}/Projects/puppy_app/DESIGN.md`;
    const violations = scanPrivacyText({
      path: 'docs/plans/completed/example.md',
      text: `Design source: ${homePath}`,
    });

    assert.equal(violations.length, 1);
    assert.equal(violations[0].kind, 'publication');
  });

  it('rejects private issue-tracker and design-board URLs', () => {
    const issueUrl = `https://linear.${'app'}/acme/issue/PUP-9/example`;
    const boardUrl = `https://miro.${'com'}/app/board/uXjVexample=/`;
    const violations = scanPrivacyText({
      path: 'docs/plans/completed/example.md',
      text: `Tracker: ${issueUrl}\nBoard: ${boardUrl}`,
    });

    assert.equal(violations.length, 2);
    assert.deepEqual(violations.map((violation) => violation.kind), [
      'publication',
      'publication',
    ]);
  });

  it('allows sanitized home-path placeholders and bare issue ids', () => {
    assert.deepEqual(
      scanPrivacyText({
        path: 'docs/plans/completed/example.md',
        text: 'Design source: <home>/Downloads/export. Tracker: PUP-9.',
      }),
      [],
    );
  });

  it('rejects PostHog autocapture and session replay enablement in app code', () => {
    const autocapture = `posthog.init('key', { auto${'capture'}: true })`;
    const sessionReplay = `posthog.init('key', { session${'Replay'}: true })`;
    const violations = scanPrivacyText({
      path: 'src/lib/analytics/example.ts',
      text: `${autocapture}\n${sessionReplay}`,
    });

    assert.equal(violations.length, 2);
    assert.deepEqual(violations.map((violation) => violation.kind), [
      'telemetry-sdk',
      'telemetry-sdk',
    ]);
  });
});
