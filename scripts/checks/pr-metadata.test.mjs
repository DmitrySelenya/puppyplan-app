import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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
});
