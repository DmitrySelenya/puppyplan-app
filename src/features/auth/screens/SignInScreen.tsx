import { useState } from 'react';

import { emailSchema, otpCodeSchema } from '@/contracts/auth';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Screen } from '@/design/primitives/Screen';
import { Stack } from '@/design/primitives/Stack';
import { TextField } from '@/design/primitives/TextField';
import { useAppTranslation } from '@/lib/i18n';

import { SocialSignInButtons } from '../components/SocialSignInButtons';
import { useEmailOtpSignIn, type SignInActions } from '../hooks/useEmailOtpSignIn';
import { useSignInFlow } from '../hooks/useSignInFlow';

type AuthErrorKey =
  | 'auth.errors.invalid-code'
  | 'auth.errors.invalid-email'
  | 'auth.errors.request-failed'
  | 'auth.errors.verify-failed';

export type SignInScreenViewProps = Readonly<{
  actions: SignInActions;
}>;

export function SignInScreen() {
  const actions = useEmailOtpSignIn();

  return <SignInScreenView actions={actions} />;
}

export function SignInScreenView({ actions }: SignInScreenViewProps) {
  const { t } = useAppTranslation();
  const flow = useSignInFlow();
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);

  const submitEmail = async () => {
    const parsed = emailSchema.safeParse(emailInput);

    if (!parsed.success) {
      setErrorKey('auth.errors.invalid-email');
      return;
    }

    setErrorKey(null);

    try {
      await actions.requestCode(parsed.data);
      flow.goToCode(parsed.data);
      setCodeInput('');
    } catch {
      setErrorKey('auth.errors.request-failed');
    }
  };

  const submitCode = async () => {
    const parsed = otpCodeSchema.safeParse(codeInput);

    if (!parsed.success) {
      setErrorKey('auth.errors.invalid-code');
      return;
    }

    setErrorKey(null);

    try {
      await actions.verifyCode({ email: flow.email, token: parsed.data });
    } catch {
      setErrorKey('auth.errors.verify-failed');
    }
  };

  const emailErrorText = errorKey === 'auth.errors.invalid-email' || errorKey === 'auth.errors.request-failed'
    ? t(errorKey)
    : undefined;
  const codeErrorText = errorKey === 'auth.errors.invalid-code' || errorKey === 'auth.errors.verify-failed'
    ? t(errorKey)
    : undefined;

  return (
    <Screen>
      <Stack gap="lg">
        <Stack gap="sm">
          <AppText variant="title">{t('auth.title')}</AppText>
          <AppText tone="secondary">{t('auth.subtitle')}</AppText>
        </Stack>

        {flow.step === 'email' ? (
          <Stack gap="md">
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              errorText={emailErrorText}
              inputMode="email"
              keyboardType="email-address"
              label={t('auth.email.label')}
              onChangeText={setEmailInput}
              placeholder={t('auth.email.placeholder')}
              value={emailInput}
            />
            <Button
              label={t('auth.email.cta')}
              loading={actions.isBusy}
              onPress={() => {
                void submitEmail();
              }}
            />
            <SocialSignInButtons />
          </Stack>
        ) : (
          <Stack gap="md">
            <AppText tone="secondary">
              {t('auth.code.sent-helper', { email: flow.email })}
            </AppText>
            <TextField
              errorText={codeErrorText}
              inputMode="numeric"
              keyboardType="number-pad"
              label={t('auth.code.label')}
              maxLength={6}
              onChangeText={setCodeInput}
              placeholder={t('auth.code.placeholder')}
              value={codeInput}
            />
            <Button
              label={t('auth.code.cta')}
              loading={actions.isBusy}
              onPress={() => {
                void submitCode();
              }}
            />
            <Button
              label={t('auth.code.resend')}
              onPress={() => {
                void submitEmail();
              }}
              variant="tertiary"
            />
            <Button label={t('auth.code.back')} onPress={flow.backToEmail} variant="tertiary" />
          </Stack>
        )}
      </Stack>
    </Screen>
  );
}
