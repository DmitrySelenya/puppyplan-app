export {
  getCurrentUser,
  requestEmailOtp,
  signOut,
  startAutoRefresh,
  stopAutoRefresh,
  subscribeToAuthChanges,
  toSessionUser,
  verifyEmailOtp,
  type AuthChangeHandler,
} from './api';
export { ensureUserBootstrapped, type BootstrapRpc } from './bootstrap';
export {
  AuthProvider,
  useAuth,
  type AuthContextValue,
  type AuthProviderDependencies,
} from './context';
