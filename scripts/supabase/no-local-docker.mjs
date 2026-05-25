const fallbackScript = process.argv[2] || 'the matching :remote script';

console.error([
  'Local Supabase Docker commands are disabled for this workspace.',
  'Use the non-production remote dev database with an explicit SUPABASE_DB_URL instead:',
  `  npm run ${fallbackScript}`,
  'Do not start Docker or the local Supabase stack on the M1/8 GB development machine.',
].join('\n'));

process.exit(2);
