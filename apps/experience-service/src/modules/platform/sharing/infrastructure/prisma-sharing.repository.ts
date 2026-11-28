import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  share_links,
} from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  CreateShareLinkInput,
  ShareLinkRecord,
  SharingRepository,
} from '../application/sharing.repository';

function toShareLinkRecord(row: share_links): ShareLinkRecord {
  return {
    id: row.id,
    createdByUserId: row.created_by_user_id ?? undefined,
    guestSessionId: row.guest_session_id ?? undefined,
    ringDesignDraftId: row.ring_design_draft_id ?? undefined,
    ringTemplateId: row.ring_template_id ?? undefined,
    tokenHash: row.token_hash,
    status: row.status,
    sanitizedSnapshotJson: row.sanitized_snapshot_json ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined,
    createdAt: row.created_at,
  };
}

@Injectable()
export class PrismaSharingRepository implements SharingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTokenHash(
    tokenHash: string,
  ): Promise<ShareLinkRecord | undefined> {
    const row = await this.prisma.share_links.findUnique({
      where: { token_hash: tokenHash },
    });
    return row ? toShareLinkRecord(row) : undefined;
  }

  async findById(id: string): Promise<ShareLinkRecord | undefined> {
    const row = await this.prisma.share_links.findUnique({
      where: { id },
    });
    return row ? toShareLinkRecord(row) : undefined;
  }

  async createShareLink(data: CreateShareLinkInput): Promise<ShareLinkRecord> {
    const created = await this.prisma.share_links.create({
      data: {
        created_by_user_id: data.createdByUserId ?? null,
        guest_session_id: data.guestSessionId ?? null,
        ring_design_draft_id: data.ringDesignDraftId ?? null,
        ring_template_id: data.ringTemplateId ?? null,
        token_hash: data.tokenHash,
        status: 'ACTIVE',
        sanitized_snapshot_json:
          data.sanitizedSnapshotJson as Prisma.InputJsonValue,
        expires_at: data.expiresAt,
      },
    });
    return toShareLinkRecord(created);
  }

  async revokeShareLink(id: string): Promise<ShareLinkRecord> {
    const updated = await this.prisma.share_links.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revoked_at: new Date(),
      },
    });
    return toShareLinkRecord(updated);
  }

  async updateLastAccessed(id: string): Promise<void> {
    await this.prisma.share_links.update({
      where: { id },
      data: {
        last_accessed_at: new Date(),
      },
    });
  }
}
