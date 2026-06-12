const internalSupabaseMetadataPattern =
  /\n {2}\/\/ Allows to automatically instantiate createClient with right options\n {2}\/\/ instead of createClient<Database, \{ PostgrestVersion: 'XX' \}>\(URL, KEY\)\n {2}__InternalSupabase: \{\n {4}PostgrestVersion: "[^"]+"\n {2}\}\n/u;

export function normalizeGeneratedTypes(output) {
  return output
    .replace(internalSupabaseMetadataPattern, '\n')
    .replace(/\n+$/u, '\n');
}
