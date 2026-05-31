import { enabledAuthMethods, type AuthMethod } from '@/contracts/auth';
import { Button } from '@/design/primitives/Button';
import { Stack } from '@/design/primitives/Stack';
import { useAppTranslation, type I18nKey } from '@/lib/i18n';

type SocialAuthMethod = Exclude<AuthMethod, 'email_otp'>;

const socialMethodLabelKeys = {
  apple: 'auth.social.apple',
  google: 'auth.social.google',
} as const satisfies Record<SocialAuthMethod, I18nKey>;

const configuredAuthMethods: readonly AuthMethod[] = enabledAuthMethods;
const socialMethods: readonly SocialAuthMethod[] = configuredAuthMethods.filter(isSocialAuthMethod);

export type SocialSignInButtonsProps = Readonly<{
  onSelectMethod?: (method: AuthMethod) => void;
}>;

export function SocialSignInButtons({ onSelectMethod }: SocialSignInButtonsProps) {
  const { t } = useAppTranslation();

  if (socialMethods.length === 0) {
    return null;
  }

  return (
    <Stack gap="sm">
      {socialMethods.map((method) => (
        <Button
          key={method}
          label={t(socialMethodLabelKeys[method])}
          onPress={() => onSelectMethod?.(method)}
          variant="secondary"
        />
      ))}
    </Stack>
  );
}

function isSocialAuthMethod(method: AuthMethod): method is SocialAuthMethod {
  return method !== 'email_otp';
}
