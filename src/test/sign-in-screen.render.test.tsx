import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { SignInScreenView } from '@/features/auth/screens/SignInScreen';
import { OtpRequestError } from '@/lib/auth';
import { i18n } from '@/lib/i18n';

let reduceMotionProbe: jest.SpyInstance;

beforeEach(async () => {
  reduceMotionProbe = jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockReturnValue(new Promise<boolean>(() => {}));
  await i18n.changeLanguage('en');
});

afterEach(() => {
  reduceMotionProbe.mockRestore();
});

function makeActions() {
  return {
    isBusy: false,
    isDebugSignInEnabled: false,
    requestCode: jest.fn(async () => undefined),
    signInWithDebugAccount: jest.fn(async () => undefined),
    verifyCode: jest.fn(async () => undefined),
  };
}

describe('SignInScreenView', () => {
  it('shows a validation error for an invalid email and does not request a code', () => {
    const actions = makeActions();
    render(<SignInScreenView actions={actions} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.email.label')), 'not-an-email');
    fireEvent.press(screen.getByText(i18n.t('auth.email.cta')));

    expect(screen.getByText(i18n.t('auth.errors.invalid-email'))).toBeTruthy();
    expect(actions.requestCode).not.toHaveBeenCalled();
  });

  it('requests a code for a valid email and advances to the code step', async () => {
    const actions = makeActions();
    render(<SignInScreenView actions={actions} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.email.label')), 'Owner@Example.com');
    fireEvent.press(screen.getByText(i18n.t('auth.email.cta')));

    await waitFor(() => expect(actions.requestCode).toHaveBeenCalledWith('owner@example.com'));
    expect(screen.getByLabelText(i18n.t('auth.code.label'))).toBeTruthy();
  });

  it('verifies a 6-digit code with the normalized email', async () => {
    const actions = makeActions();
    render(<SignInScreenView actions={actions} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.email.label')), 'owner@example.com');
    fireEvent.press(screen.getByText(i18n.t('auth.email.cta')));
    await waitFor(() => expect(screen.getByLabelText(i18n.t('auth.code.label'))).toBeTruthy());

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.code.label')), '123456');
    fireEvent.press(screen.getByText(i18n.t('auth.code.cta')));

    await waitFor(() =>
      expect(actions.verifyCode).toHaveBeenCalledWith({ email: 'owner@example.com', token: '123456' }),
    );
  });

  it('surfaces request and verify failures as localized copy', async () => {
    const requestFailureActions = {
      ...makeActions(),
      requestCode: jest.fn(async () => {
        throw new Error('auth_request_otp_failed');
      }),
    };
    render(<SignInScreenView actions={requestFailureActions} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.email.label')), 'owner@example.com');
    fireEvent.press(screen.getByText(i18n.t('auth.email.cta')));

    await waitFor(() => expect(screen.getByText(i18n.t('auth.errors.request-failed'))).toBeTruthy());

    const verifyFailureActions = {
      ...makeActions(),
      verifyCode: jest.fn(async () => {
        throw new Error('auth_verify_otp_failed');
      }),
    };
    render(<SignInScreenView actions={verifyFailureActions} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.email.label')), 'owner@example.com');
    fireEvent.press(screen.getByText(i18n.t('auth.email.cta')));
    await waitFor(() => expect(screen.getByLabelText(i18n.t('auth.code.label'))).toBeTruthy());

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.code.label')), '123456');
    fireEvent.press(screen.getByText(i18n.t('auth.code.cta')));

    await waitFor(() => expect(screen.getByText(i18n.t('auth.errors.verify-failed'))).toBeTruthy());
  });

  it('AC-F13 shows the typed rate-limit state instead of blaming the connection', async () => {
    const actions = {
      ...makeActions(),
      requestCode: jest.fn(async () => {
        throw new OtpRequestError('rate_limited');
      }),
    };
    render(<SignInScreenView actions={actions} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('auth.email.label')), 'owner@example.com');
    fireEvent.press(screen.getByText(i18n.t('auth.email.cta')));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('auth.errors.rate-limited'))).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('auth.errors.request-failed'))).toBeNull();
  });

  it('keeps debug sign-in hidden unless the dev account action is enabled', () => {
    render(<SignInScreenView actions={makeActions()} />);

    expect(screen.queryByText(i18n.t('auth.debug.cta'))).toBeNull();
  });

  it('runs the synthetic debug account sign-in action when enabled', async () => {
    const actions = {
      ...makeActions(),
      isDebugSignInEnabled: true,
    };
    render(<SignInScreenView actions={actions} />);

    fireEvent.press(screen.getByTestId('auth-debug-sign-in-button'));

    await waitFor(() => expect(actions.signInWithDebugAccount).toHaveBeenCalledTimes(1));
  });
});
