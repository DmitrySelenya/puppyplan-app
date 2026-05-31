import { useReducer } from 'react';

export type SignInStep = 'email' | 'code';

export type SignInFlowState = Readonly<{
  email: string;
  step: SignInStep;
}>;

export type SignInFlowAction =
  | Readonly<{ email: string; type: 'codeRequested' }>
  | Readonly<{ type: 'backToEmail' }>;

export const initialSignInFlowState: SignInFlowState = { email: '', step: 'email' };

export function signInFlowReducer(
  state: SignInFlowState,
  action: SignInFlowAction,
): SignInFlowState {
  switch (action.type) {
    case 'codeRequested':
      return { email: action.email, step: 'code' };
    case 'backToEmail':
      return { email: state.email, step: 'email' };
    default:
      return state;
  }
}

export function useSignInFlow() {
  const [state, dispatch] = useReducer(signInFlowReducer, initialSignInFlowState);

  return {
    backToEmail: () => dispatch({ type: 'backToEmail' }),
    email: state.email,
    goToCode: (email: string) => dispatch({ email, type: 'codeRequested' }),
    step: state.step,
  };
}
