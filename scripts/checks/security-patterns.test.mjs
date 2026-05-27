import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const securityPatternsPath = '.claude/security-patterns.json';
const securityGuidancePath = '.claude/claude-security-guidance.md';

function readSecurityPatterns() {
  return JSON.parse(readFileSync(securityPatternsPath, 'utf8')).patterns;
}

function getRule(ruleName) {
  const rule = readSecurityPatterns().find((pattern) => pattern.rule_name === ruleName);

  assert.notEqual(rule, undefined, `Expected ${ruleName} security pattern`);

  return rule;
}

describe('Claude security pattern guardrails', () => {
  it('keeps ts-ignore and ts-nocheck separate from test-safe ts-expect-error', () => {
    const rule = getRule('ts_ignore_or_nocheck');

    assert.deepEqual(rule.substrings, ['@ts-ignore', '@ts-nocheck']);
    assert.doesNotMatch(rule.reminder, /AGENTS\.md[^.]*@ts-nocheck/u);
    assert.match(rule.reminder, /AGENTS\.md forbids @ts-ignore/u);
    assert.match(rule.reminder, /treats @ts-nocheck as equivalent/u);
  });

  it('flags ts-expect-error outside tests while excluding type-contract test paths', () => {
    const rule = getRule('ts_expect_error_outside_tests');

    assert.deepEqual(rule.substrings, ['@ts-expect-error']);
    assert.match(rule.reminder, /production code/u);
    assert.match(rule.reminder, /tracked upstream bug or ADR/u);
    const testAndSpecExclusions = rule.exclude_paths.filter((path) =>
      path === '**/src/test/**' || path.includes('.test.') || path.includes('.spec.'));

    assert.deepEqual(testAndSpecExclusions, [
      '**/src/test/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ]);
  });

  it('excludes security config files from rules that mention TypeScript directives', () => {
    const directiveRules = [
      getRule('ts_ignore_or_nocheck'),
      getRule('ts_expect_error_outside_tests'),
    ];
    const expectedExclusions = [
      '**/.claude/security-patterns.json',
      '**/.claude/security-patterns.yaml',
      '**/.claude/security-patterns.yml',
      '**/.claude/claude-security-guidance.md',
    ];

    for (const rule of directiveRules) {
      assert.deepEqual(
        rule.exclude_paths.filter((path) => path.includes('.claude/')),
        expectedExclusions,
      );
    }
  });

  it('keeps the model-backed guidance aligned with the config semantics', () => {
    const guidance = readFileSync(securityGuidancePath, 'utf8');

    assert.match(guidance, /AGENTS\.md forbids `any`, `as unknown as`, and `@ts-ignore` without/u);
    assert.match(guidance, /Treat `@ts-nocheck` as equivalent/u);
    assert.match(guidance, /`@ts-expect-error` is allowed in type-contract tests/u);
  });
});
