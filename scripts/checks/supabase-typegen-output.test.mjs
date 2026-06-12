import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeGeneratedTypes } from '../supabase/typegen-output.mjs';

test('normalizes Supabase typegen output to the CI-stable shape', () => {
  const input = [
    'export type Database = {',
    '  // Allows to automatically instantiate createClient with right options',
    "  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)",
    '  __InternalSupabase: {',
    '    PostgrestVersion: "14.5"',
    '  }',
    '  public: {',
    '    Tables: {}',
    '  }',
    '} as const',
    '',
    '',
  ].join('\n');

  assert.equal(
    normalizeGeneratedTypes(input),
    [
      'export type Database = {',
      '  public: {',
      '    Tables: {}',
      '  }',
      '} as const',
      '',
    ].join('\n'),
  );
});
