export const PUPPYPLAN_DEV_SUPABASE_PROJECT_REF = 'olymqppxsadsxfrcyskh';
export const PUPPYPLAN_DEV_SUPABASE_URL =
  `https://${PUPPYPLAN_DEV_SUPABASE_PROJECT_REF}.supabase.co`;

export function assertKnownDevSupabaseTarget({ projectRef = '', scriptName, url = '' }) {
  const normalizedProjectRef = projectRef.trim();
  const normalizedUrl = url.trim();

  if (!normalizedProjectRef && !normalizedUrl) {
    throw makeRefusalError(scriptName);
  }

  if (
    (normalizedProjectRef && normalizedProjectRef !== PUPPYPLAN_DEV_SUPABASE_PROJECT_REF) ||
    (normalizedUrl && !isKnownDevSupabaseUrl(normalizedUrl))
  ) {
    throw makeRefusalError(scriptName);
  }
}

function isKnownDevSupabaseUrl(value) {
  try {
    const parsedUrl = new URL(value);

    return parsedUrl.protocol === 'https:' &&
      parsedUrl.hostname === `${PUPPYPLAN_DEV_SUPABASE_PROJECT_REF}.supabase.co`;
  } catch {
    return false;
  }
}

function makeRefusalError(scriptName = 'Supabase dev helper') {
  return new Error([
    `Refusing to run ${scriptName}.`,
    `Target must be the non-production PuppyPlan Dev project (${PUPPYPLAN_DEV_SUPABASE_PROJECT_REF}).`,
    'Update local .env to the dev project before retrying.',
  ].join(' '));
}
