import type { AccessGrantItem, AccessGrantStatus } from '@app/contracts';
import type { MemoryAccessGrantRecord } from './memory-grant.repository';

export function toAccessGrantItem(
  grant: MemoryAccessGrantRecord,
): AccessGrantItem {
  return {
    id: grant.id,
    memoryCardId: grant.memoryCardId,
    granteeEmail: grant.granteeEmail,
    status: grant.status as AccessGrantStatus,
    inviteExpiresAt: grant.inviteExpiresAt?.toISOString(),
    acceptedAt: grant.acceptedAt?.toISOString(),
    lastAccessedAt: grant.lastAccessedAt?.toISOString(),
    createdAt: grant.createdAt.toISOString(),
  };
}
