import { useMutation } from '@tanstack/react-query';

import { requestEmailOtp, verifyEmailOtp } from '@/lib/auth';

export type SignInActions = Readonly<{
  isBusy: boolean;
  requestCode: (email: string) => Promise<void>;
  verifyCode: (input: Readonly<{ email: string; token: string }>) => Promise<void>;
}>;

export function useEmailOtpSignIn(): SignInActions {
  const requestMutation = useMutation({ mutationFn: (email: string) => requestEmailOtp(email) });
  const verifyMutation = useMutation({
    mutationFn: (input: Readonly<{ email: string; token: string }>) => verifyEmailOtp(input),
  });

  return {
    isBusy: requestMutation.isPending || verifyMutation.isPending,
    requestCode: (email) => requestMutation.mutateAsync(email),
    verifyCode: (input) => verifyMutation.mutateAsync(input).then(() => undefined),
  };
}
