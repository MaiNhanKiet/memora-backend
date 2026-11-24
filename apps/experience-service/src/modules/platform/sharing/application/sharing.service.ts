import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { parseVerifiedActor } from '@app/common';
import type {
  CreateShareLinkRequest,
  CreateShareLinkResponse,
  ResolveShareLinkRequest,
  ResolveShareLinkResponse,
  RevokeShareLinkRequest,
  RevokeShareLinkResponse,
  ShareLinkStatus,
} from '@app/contracts';
import type { Prisma } from '../../../../../generated/prisma/client';
import { SharingRepository } from '../infrastructure/sharing.repository';

@Injectable()
export class SharingService {
  constructor(private readonly sharingRepository: SharingRepository) {}

  async resolveShareLink(
    request: ResolveShareLinkRequest,
  ): Promise<ResolveShareLinkResponse> {
    if (!request.shareToken) {
      throw new BadRequestException('Share token is required');
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(request.shareToken)
      .digest('hex');

    const link = await this.sharingRepository.findByTokenHash(tokenHash);
    if (!link) {
      throw new NotFoundException('Share link not found or has expired');
    }

    if (link.status !== 'ACTIVE') {
      throw new NotFoundException('Share link is no longer active');
    }

    if (link.expires_at && new Date() > link.expires_at) {
      throw new NotFoundException('Share link has expired');
    }

    // Update last_accessed_at asynchronously
    this.sharingRepository.updateLastAccessed(link.id).catch(() => {});

    return {
      id: link.id,
      shareToken: request.shareToken,
      status: link.status as ShareLinkStatus,
      expiresAt: link.expires_at ? link.expires_at.toISOString() : '',
      ringTemplateId: link.ring_template_id ?? undefined,
      ringDesignDraftId: link.ring_design_draft_id ?? undefined,
      sanitizedSnapshotJson: JSON.stringify(link.sanitized_snapshot_json ?? {}),
      createdAt: link.created_at.toISOString(),
    };
  }

  async createShareLink(
    request: CreateShareLinkRequest,
  ): Promise<CreateShareLinkResponse> {
    const actor = parseVerifiedActor(request.actor);
    const userId = actor.kind === 'USER' ? actor.userId : null;
    const guestSessionId =
      actor.kind === 'GUEST_SESSION' ? actor.guestSessionId : null;

    if (!userId && !guestSessionId) {
      throw new BadRequestException(
        'Valid user identity or guest session is required',
      );
    }

    let parsedSnapshot: Record<string, unknown>;
    try {
      parsedSnapshot = JSON.parse(request.sanitizedSnapshotJson) as Record<
        string,
        unknown
      >;
    } catch {
      throw new BadRequestException('Invalid sanitized snapshot JSON');
    }

    const days =
      request.expiresInDays && request.expiresInDays > 0
        ? request.expiresInDays
        : 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const shareToken = `memora-3d-${crypto.randomBytes(12).toString('hex')}`;
    const tokenHash = crypto
      .createHash('sha256')
      .update(shareToken)
      .digest('hex');

    const created = await this.sharingRepository.createShareLink({
      createdByUserId: userId,
      guestSessionId,
      ringDesignDraftId: request.ringDesignDraftId || null,
      ringTemplateId: request.ringTemplateId || null,
      tokenHash,
      sanitizedSnapshotJson: parsedSnapshot as Prisma.InputJsonValue,
      expiresAt,
    });

    return {
      id: created.id,
      shareToken,
      shareUrl: `/api/v1/shares/${shareToken}`,
      status: created.status as ShareLinkStatus,
      expiresAt: created.expires_at
        ? created.expires_at.toISOString()
        : expiresAt.toISOString(),
    };
  }

  async revokeShareLink(
    request: RevokeShareLinkRequest,
  ): Promise<RevokeShareLinkResponse> {
    const actor = parseVerifiedActor(request.actor);
    if (!request.shareLinkId) {
      throw new BadRequestException('Share link ID is required');
    }

    const link = await this.sharingRepository.findById(request.shareLinkId);
    if (!link) {
      throw new NotFoundException('Share link not found');
    }

    // Ownership check
    if (actor.kind === 'USER') {
      if (link.created_by_user_id && link.created_by_user_id !== actor.userId) {
        throw new ForbiddenException('You do not own this share link');
      }
    } else if (actor.kind === 'GUEST_SESSION') {
      if (
        link.guest_session_id &&
        link.guest_session_id !== actor.guestSessionId
      ) {
        throw new ForbiddenException('You do not own this share link');
      }
    } else {
      throw new ForbiddenException('You do not own this share link');
    }

    if (link.status === 'REVOKED') {
      return {
        id: link.id,
        status: 'REVOKED',
        revokedAt: link.revoked_at
          ? link.revoked_at.toISOString()
          : new Date().toISOString(),
      };
    }

    const updated = await this.sharingRepository.revokeShareLink(link.id);

    return {
      id: updated.id,
      status: updated.status as ShareLinkStatus,
      revokedAt: updated.revoked_at
        ? updated.revoked_at.toISOString()
        : new Date().toISOString(),
    };
  }
}
