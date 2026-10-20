import type { PublicUserMessage } from '@app/contracts';
import type { PublicUser } from '../users/users.mapper';

export function toPublicUserMessage(user: PublicUser): PublicUserMessage {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    ...(user.phone !== null ? { phone: user.phone } : {}),
    authProvider: user.authProvider,
    status: user.status,
    ...(user.emailVerifiedAt !== null
      ? { emailVerifiedAt: user.emailVerifiedAt.toISOString() }
      : {}),
    ...(user.lastLoginAt !== null
      ? { lastLoginAt: user.lastLoginAt.toISOString() }
      : {}),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
