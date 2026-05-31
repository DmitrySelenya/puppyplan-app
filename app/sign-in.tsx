import { Redirect } from 'expo-router';

import { SignInScreen } from '@/features/auth';
import { useAuth } from '@/lib/auth';

export default function SignInRoute() {
  const { status } = useAuth();

  if (status === 'signedIn') {
    return <Redirect href="/today" />;
  }

  return <SignInScreen />;
}
