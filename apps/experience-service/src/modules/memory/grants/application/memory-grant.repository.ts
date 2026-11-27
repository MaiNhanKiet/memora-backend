import type { MemoryCardRecord } from '../../cards/application/memory-card.repository';

export const MEMORY_GRANT_REPOSITORY = Symbol('MEMORY_GRANT_REPOSITORY');

export interface MemoryAccessGrantRecord {
  readonly id: string;
  readonly memoryCardId: string;
  readonly granteeEmail: string;
  readonly granteeUserId?: string;
  readonly status: string;
  readonly inviteExpiresAt?: Date;
  readonly acceptedAt?: Date;
  readonly lastAccessedAt?: Date;
  readonly createdAt: Date;
}

export interface MemoryAccessGrantWithCardRecord extends MemoryAccessGrantRecord {
  readonly card?: MemoryCardRecord;
}

export interface CreateMemoryGrantInput {
  readonly memoryCardId: string;
  readonly granteeEmail: string;
  readonly invitationTokenHash: string;
  readonly inviteExpiresAt: Date;
}

export interface MemoryGrantRepository {
  createGrant(data: CreateMemoryGrantInput): Promise<MemoryAccessGrantRecord>;
  listGrantsByCardId(
    cardId: string,
  ): Promise<readonly MemoryAccessGrantRecord[]>;
  findGrantById(
    grantId: string,
  ): Promise<MemoryAccessGrantWithCardRecord | undefined>;
  findSessionByHash(
    sessionHash: string,
  ): Promise<MemoryAccessGrantWithCardRecord | undefined>;
  findByTokenHash(
    tokenHash: string,
  ): Promise<MemoryAccessGrantWithCardRecord | undefined>;
  revokeGrant(
    grantId: string,
    revokedByUserId?: string,
  ): Promise<MemoryAccessGrantRecord>;
  markAccepted(
    grantId: string,
    tokenHash: string,
    sessionHash: string,
  ): Promise<MemoryAccessGrantRecord | undefined>;
  updateLastAccessed(grantId: string): Promise<boolean>;
}
