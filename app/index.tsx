import { Redirect } from 'expo-router';

import { resolveAuthLanding } from '@/features/auth';
import { useAuth } from '@/lib/auth';

export default function IndexRoute() {
  const { status } = useAuth();
  const landing = resolveAuthLanding(status);

  if (!landing) {
    return null;
  }

  return <Redirect href={landing} />;
}
