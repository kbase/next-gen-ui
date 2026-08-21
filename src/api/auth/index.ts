export type {
  AllSessions,
  Ident,
  Me,
  MeUpdate,
  LoginChoice,
  LoginPickInput,
  LoginPickResult,
  SessionToken,
  TokenInfo,
} from './schemas';

export {
  AUTH_ENABLED,
  AUTH_ORIGIN,
  AuthApiError,
  validateToken,
  setMe,
  getLoginChoice,
  postLoginPick,
  getAllSessions,
  getTokenInfo,
  revokeSession,
  logout,
} from './client';

export { COOKIE_NAME, getToken, setToken, clearToken } from './cookie';

export {
  authMeOptions,
  authSessionsOptions,
  tokenInfoOptions,
  primeAuthCache,
  clearAuthCache,
  clearAuthSession,
  installCrossTabAuthSync,
  installAuthFailureInterceptor,
  installAuthExpiryWatcher,
  MfaRequiredError,
} from './queries';

export { safeRedirect, parseSafeRedirect } from './redirect';
export type { SafeRedirectParts } from './redirect';

export { authErrorMessage } from './errors';
export type { AuthErrorMessageOptions } from './errors';

export {
  useMe,
  useMaybeMe,
  useSessions,
  useSignOut,
  useUpdateMe,
  useRevokeOtherSession,
} from './hooks';
