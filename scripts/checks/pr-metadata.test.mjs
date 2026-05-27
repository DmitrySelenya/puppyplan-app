import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { autofillPullRequestMetadata } from './pr-metadata-autofill.mjs';
import { validatePullRequestMetadata } from './pr-metadata.mjs';

describe('validatePullRequestMetadata', () => {
  it('accepts a matching PUP issue id in the title and Work Tracking section', () => {
    assert.deepEqual(
      validatePullRequestMetadata({
        body: '## Work Tracking\n- Linear: PUP-4',
        title: 'PUP-4 Set up CI and local verification gates',
      }),
      [],
    );
  });

  it('rejects a PUP issue id that appears only outside the title or Work Tracking section', () => {
    assert.match(
      validatePullRequestMetadata({
        body: 'Notes mention PUP-4 somewhere, but no Work Tracking section.',
        title: 'Set up CI and local verification gates',
      }).join('\n'),
      /title.*PUP/i,
    );
  });

  it('accepts an explicit no-Linear exception with a real reason', () => {
    assert.deepEqual(
      validatePullRequestMetadata({
        body: 'Linear: no-Linear exception - reason: local tooling only',
        title: 'Refresh local tooling docs',
      }),
      [],
    );
  });

  it('rejects missing work tracking', () => {
    assert.match(
      validatePullRequestMetadata({
        body: 'No tracker here.',
        title: 'Refresh local tooling docs',
      }).join('\n'),
      /PUP-\d+/,
    );
  });

  it('rejects placeholder no-Linear exceptions', () => {
    assert.match(
      validatePullRequestMetadata({
        body: 'Linear: no-Linear exception - reason: ...',
        title: 'Refresh local tooling docs',
      }).join('\n'),
      /non-placeholder reason/,
    );
  });

  it('rejects mismatched issue ids between title and Work Tracking', () => {
    assert.match(
      validatePullRequestMetadata({
        body: '## Work Tracking\n- Linear: PUP-5',
        title: 'PUP-4 Set up CI and local verification gates',
      }).join('\n'),
      /same Linear issue/i,
    );
  });

  it('keeps the PR template aligned with the accepted no-Linear exception wording', () => {
    const template = readFileSync('.github/PULL_REQUEST_TEMPLATE.md', 'utf8');

    assert.match(template, /Linear:\s*PUP-___\s*\/\s*no-Linear exception - reason: \.\.\./);
  });

  it('autofills template metadata from a Linear branch before validation', () => {
    const body = readFileSync('.github/PULL_REQUEST_TEMPLATE.md', 'utf8')
      .replace('no-Linear exception - reason: ...', 'none - reason: ...');
    const result = autofillPullRequestMetadata({
      body,
      headRefName: 'dimaselenya/pup-14-quick-log-sheet-ui-and-interaction-states',
      title: 'Dimaselenya/pup 14 quick log sheet UI and interaction states',
    });

    assert.equal(result.changed, true);
    assert.equal(result.title, 'PUP-14 Quick Log sheet UI and interaction states');
    assert.match(result.body, /- Linear: PUP-14/u);
    assert.match(result.body, /- Branch: `dimaselenya\/pup-14-quick-log-sheet-ui-and-interaction-states`/u);
    assert.deepEqual(validatePullRequestMetadata(result), []);
  });

  it('keeps common workflow acronyms uppercase when deriving the title from a branch', () => {
    const result = autofillPullRequestMetadata({
      body: '## Work Tracking\n\n- Linear: PUP-___ / no-Linear exception - reason: ...',
      headRefName: 'codex/pup-14-pr-metadata-ci-followup',
      title: 'Codex/pup 14 pr metadata ci followup',
    });

    assert.equal(result.title, 'PUP-14 PR metadata CI followup');
  });

  it('does not fabricate tracking for branches without a Linear issue id', () => {
    const result = autofillPullRequestMetadata({
      body: '## Summary\n\nLocal cleanup only.',
      headRefName: 'codex/local-cleanup',
      title: 'Local cleanup',
    });

    assert.deepEqual(result, {
      body: '## Summary\n\nLocal cleanup only.',
      changed: false,
      issueId: null,
      title: 'Local cleanup',
    });
  });
});
