import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  share_links,
  Prisma,
} from '../../../../../generated/prisma/client';

@Injectable()
export class SharingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTokenHash(tokenHash: string): Promise<share_links | null> {
    return this.prisma.share_links.findUnique({
      where: { token_hash: tokenHash },
    });
  }

  async findById(id: string): Promise<share_links | null> {
    return this.prisma.share_links.findUnique({
      where: { id },
    });
  }

  async createShareLink(data: {
    createdByUserId?: string | null;
    guestSessionId?: string | null;
    ringDesignDraftId?: string | null;
    ringTemplateId?: string | null;
    tokenHash: string;
    sanitizedSnapshotJson: Record<string, unknown>;
    expiresAt: Date;
  }): Promise<share_links> {
    return this.prisma.share_links.create({
      data: {
        created_by_user_id: data.createdByUserId,
        guest_session_id: data.guestSessionId,
        ring_design_draft_id: data.ringDesignDraftId,
        ring_template_id: data.ringTemplateId,
        token_hash: data.tokenHash,
        status: 'ACTIVE',
        sanitized_snapshot_json:
          data.sanitizedSnapshotJson as Prisma.InputJsonValue,
        expires_at: data.expiresAt,
      },
    });
  }

  async revokeShareLink(id: string): Promise<share_links> {
    return this.prisma.share_links.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revoked_at: new Date(),
      },
    });
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
