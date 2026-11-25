export const SHARING_REPOSITORY = Symbol('SHARING_REPOSITORY');

export interface ShareLinkRecord {
  readonly id: string;
  readonly createdByUserId?: string;
  readonly guestSessionId?: string;
  readonly ringDesignDraftId?: string;
  readonly ringTemplateId?: string;
  readonly tokenHash: string;
  readonly status: string;
  readonly sanitizedSnapshotJson?: unknown;
  readonly expiresAt?: Date;
  readonly revokedAt?: Date;
  readonly createdAt: Date;
}

export interface CreateShareLinkInput {
  readonly createdByUserId?: string;
  readonly guestSessionId?: string;
  readonly ringDesignDraftId?: string;
  readonly ringTemplateId?: string;
  readonly tokenHash: string;
  readonly sanitizedSnapshotJson: Record<string, unknown>;
  readonly expiresAt: Date;
}

export interface SharingRepository {
  findByTokenHash(tokenHash: string): Promise<ShareLinkRecord | undefined>;
  findById(id: string): Promise<ShareLinkRecord | undefined>;
  createShareLink(data: CreateShareLinkInput): Promise<ShareLinkRecord>;
  revokeShareLink(id: string): Promise<ShareLinkRecord>;
  updateLastAccessed(id: string): Promise<void>;
}
