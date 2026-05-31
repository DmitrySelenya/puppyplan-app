import { initialSignInFlowState, signInFlowReducer } from '@/features/auth/hooks/useSignInFlow';

describe('signInFlowReducer', () => {
  it('starts on the email step', () => {
    expect(initialSignInFlowState).toEqual({ step: 'email', email: '' });
  });

  it('moves to the code step and stores the email when a code is requested', () => {
    expect(signInFlowReducer(initialSignInFlowState, { type: 'codeRequested', email: 'owner@example.com' })).toEqual({
      step: 'code',
      email: 'owner@example.com',
    });
  });

  it('returns to the email step on back', () => {
    const codeState = { step: 'code', email: 'owner@example.com' } as const;

    expect(signInFlowReducer(codeState, { type: 'backToEmail' })).toEqual({
      step: 'email',
      email: 'owner@example.com',
    });
  });
});
