import { useMutation } from '@tanstack/react-query';

import { requestEmailOtp, verifyEmailOtp } from '@/lib/auth';
import { signInWithPassword } from '@/lib/auth/api';
import { readDevPasswordSignInCredentials } from '@/lib/auth/devCredentials';

export type SignInActions = Readonly<{
  isDebugSignInEnabled: boolean;
  isBusy: boolean;
  requestCode: (email: string) => Promise<void>;
  signInWithDebugAccount: () => Promise<void>;
  verifyCode: (input: Readonly<{ email: string; token: string }>) => Promise<void>;
}>;

export function useEmailOtpSignIn(): SignInActions {
  const debugCredentials = readDevPasswordSignInCredentials();
  const requestMutation = useMutation({ mutationFn: (email: string) => requestEmailOtp(email) });
  const verifyMutation = useMutation({
    mutationFn: (input: Readonly<{ email: string; token: string }>) => verifyEmailOtp(input),
  });
  const debugMutation = useMutation({
    mutationFn: () => {
      if (!debugCredentials) {
        throw new Error('auth_debug_sign_in_disabled');
      }

      return signInWithPassword(debugCredentials);
    },
  });

  return {
    isDebugSignInEnabled: debugCredentials !== null,
    isBusy: requestMutation.isPending || verifyMutation.isPending || debugMutation.isPending,
    requestCode: (email) => requestMutation.mutateAsync(email),
    signInWithDebugAccount: () => debugMutation.mutateAsync().then(() => undefined),
    verifyCode: (input) => verifyMutation.mutateAsync(input).then(() => undefined),
  };
}
