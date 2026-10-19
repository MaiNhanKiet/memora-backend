export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
  DISABLED: 'DISABLED',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export function isActiveUserStatus(status: string): boolean {
  return status === USER_STATUS.ACTIVE;
}

export const UNVERIFIED_ACCOUNT_POLICY =
  'Local registration stores the account without a session. Access and refresh credentials are issued only after the email code is confirmed.';

export function hasVerifiedEmail(emailVerifiedAt: Date | null): boolean {
  return emailVerifiedAt !== null;
}
