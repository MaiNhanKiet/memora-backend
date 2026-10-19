const FAILURE_CODE_BY_MESSAGE: Readonly<Record<string, string>> = {
  'This email is already registered. Sign in with your existing account.':
    'email_already_registered',
  'Unable to sign in': 'account_unavailable',
  'Google email is not verified': 'google_email_unverified',
  'Google sign-in is unavailable': 'google_unavailable',
  'Customer registration is unavailable': 'registration_unavailable',
  'Google sign-in was cancelled': 'google_cancelled',
  'Google sign-in was denied': 'oauth_denied',
  'Google sign-in state is invalid': 'oauth_state_invalid',
  'Google sign-in expired': 'oauth_state_expired',
  'This Google account is already linked': 'google_account_in_use',
  'This Google email is already registered': 'google_email_already_registered',
  'This account is already linked to Google': 'google_already_linked',
  'Google linking is unavailable': 'link_unavailable',
  'Cannot remove the last sign-in method': 'last_sign_in_method',
  'Current credential is incorrect': 'credential_incorrect',
};

export function resolveAuthFailureCode(
  status: number,
  message: string,
): string {
  const known = FAILURE_CODE_BY_MESSAGE[message];
  if (known !== undefined) {
    return known;
  }
  if (status === 429) {
    return 'rate_limited';
  }
  if (status === 409) {
    return 'email_already_registered';
  }
  if (status === 403) {
    return 'oauth_denied';
  }
  if (status === 401) {
    return 'oauth_rejected';
  }
  if (status === 503) {
    return 'google_unavailable';
  }
  return 'sign_in_failed';
}

export function appendAuthFailureCode(
  failureUrl: string,
  errorCode: string,
): string {
  const url = new URL(failureUrl);
  url.searchParams.set('error', errorCode);
  return url.toString();
}
