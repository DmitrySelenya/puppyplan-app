import {
  devPasswordSignInCredentialsSchema,
  type DevPasswordSignInCredentials,
} from '@/contracts/auth';

const DEBUG_AUTH_EMAIL_ENV = 'EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_EMAIL';
const DEBUG_AUTH_PASSWORD_ENV = 'EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_PASSWORD';
const SUPABASE_URL_ENV = 'EXPO_PUBLIC_SUPABASE_URL';
const PUPPYPLAN_DEV_SUPABASE_PROJECT_REF = 'olymqppxsadsxfrcyskh';

type EnvSource = Readonly<Record<string, string | undefined>>;

type RuntimeOptions = Readonly<{
  isProduction?: boolean;
}>;

export function readDevPasswordSignInCredentials(
  source: EnvSource = process.env,
  options: RuntimeOptions = {},
): DevPasswordSignInCredentials | null {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';

  if (isProduction) {
    return null;
  }

  if (!isKnownDevSupabaseUrl(source[SUPABASE_URL_ENV])) {
    return null;
  }

  const parsed = devPasswordSignInCredentialsSchema.safeParse({
    email: source[DEBUG_AUTH_EMAIL_ENV],
    password: source[DEBUG_AUTH_PASSWORD_ENV],
  });

  return parsed.success ? parsed.data : null;
}

function isKnownDevSupabaseUrl(value: string | undefined): boolean {
  try {
    const parsedUrl = new URL(value?.trim() ?? '');

    return parsedUrl.protocol === 'https:' &&
      parsedUrl.hostname === `${PUPPYPLAN_DEV_SUPABASE_PROJECT_REF}.supabase.co`;
  } catch {
    return false;
  }
}
