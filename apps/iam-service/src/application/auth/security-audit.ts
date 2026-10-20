import { Prisma } from '../../../generated/prisma/client';

export const SECURITY_AUDIT_ACTION = {
  LOGIN: 'login',
  REGISTER: 'register',
  PASSWORD_CHANGED: 'password_changed',
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_REVOKED: 'role_revoked',
  USER_STATUS_CHANGED: 'user_status_changed',
  GUEST_IDENTITY_LINKED: 'guest_identity_linked',
} as const;

export type SecurityAuditAction =
  (typeof SECURITY_AUDIT_ACTION)[keyof typeof SECURITY_AUDIT_ACTION];

const BLOCKED_METADATA_KEY =
  /(email|password|token|otp|cookie|secret|authorization|body)/i;
const SECRET_VALUE =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/i;

export function securityAuditData(input: {
  userId: string;
  action: SecurityAuditAction;
  metadata?: Readonly<Record<string, string>>;
}): Prisma.SecurityAuditEventUncheckedCreateInput {
  return {
    userId: input.userId,
    action: input.action,
    outcome: 'success',
    metadata: safeMetadata(input.metadata),
  };
}

function safeMetadata(
  metadata: Readonly<Record<string, string>> | undefined,
): Prisma.InputJsonObject {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (BLOCKED_METADATA_KEY.test(key) || SECRET_VALUE.test(value)) {
      continue;
    }
    safe[key] = value;
  }
  return safe;
}
