import type {
  PublicUserMessage,
  SecurityAuditEventItemMessage,
} from '@app/contracts';
import type { AdminUserResponseDto } from '../dto/response/admin-user.response.dto';
import type { SecurityAuditEventResponseDto } from '../dto/response/security-audit-event.response.dto';

export function toAdminUserResponse(
  user: PublicUserMessage,
): AdminUserResponseDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
    authProvider: user.authProvider,
    ...(user.emailVerifiedAt === undefined
      ? {}
      : { emailVerifiedAt: user.emailVerifiedAt }),
    ...(user.lastLoginAt === undefined
      ? {}
      : { lastLoginAt: user.lastLoginAt }),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toSecurityAuditEventResponse(
  event: SecurityAuditEventItemMessage,
): SecurityAuditEventResponseDto {
  return {
    id: event.id,
    action: event.action,
    outcome: event.outcome,
    createdAt: event.createdAt,
    metadata: readMetadata(event.metadataJson),
  };
}

function readMetadata(value: string | undefined): Record<string, string> {
  if (value === undefined || value.length === 0) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return {};
    }
    const metadata: Record<string, string> = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (typeof entry === 'string') {
        metadata[key] = entry;
      }
    }
    return metadata;
  } catch {
    return {};
  }
}
