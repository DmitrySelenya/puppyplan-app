import { useCallback } from 'react';

import { Button } from '@/design/primitives/Button';
import { useSnackbar } from '@/design/primitives/Snackbar';
import { useAuth } from '@/lib/auth';
import { useAppTranslation } from '@/lib/i18n';

export function SignOutButton() {
  const { t } = useAppTranslation();
  const { signOut } = useAuth();
  const snackbar = useSnackbar();

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch {
      snackbar.showSnackbar({
        accessibilityLabel: t('auth.sign-out.error'),
        id: 'auth-sign-out-failed',
        message: t('auth.sign-out.error'),
        tone: 'error',
      });
    }
  }, [signOut, snackbar, t]);

  return (
    <Button
      label={t('auth.sign-out.cta')}
      onPress={() => {
        void handleSignOut();
      }}
      variant="secondary"
    />
  );
}
