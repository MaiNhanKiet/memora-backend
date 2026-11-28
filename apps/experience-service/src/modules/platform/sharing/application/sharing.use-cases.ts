import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
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
} from '@app/contracts';
import {
  SHARING_REPOSITORY,
  type SharingRepository,
} from './sharing.repository';
import { sanitize3DSnapshot, toShareLinkStatus } from './sharing.validation';

@Injectable()
export class ResolveShareLinkUseCase {
  private readonly logger = new Logger(ResolveShareLinkUseCase.name);

  constructor(
    @Inject(SHARING_REPOSITORY)
    private readonly sharingRepository: SharingRepository,
  ) {}

  async execute(
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

    if (link.expiresAt && new Date() > link.expiresAt) {
      throw new NotFoundException('Share link has expired');
    }

    this.sharingRepository
      .updateLastAccessed(link.id)
      .catch((err: unknown) =>
        this.logger.warn('Failed to update last_accessed_at', err),
      );

    return {
      id: link.id,
      shareToken: request.shareToken,
      status: toShareLinkStatus(link.status),
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : '',
      ringTemplateId: link.ringTemplateId,
      ringDesignDraftId: link.ringDesignDraftId,
      sanitizedSnapshotJson: JSON.stringify(link.sanitizedSnapshotJson ?? {}),
      createdAt: link.createdAt.toISOString(),
    };
  }
}

@Injectable()
export class CreateShareLinkUseCase {
  constructor(
    @Inject(SHARING_REPOSITORY)
    private readonly sharingRepository: SharingRepository,
  ) {}

  async execute(
    request: CreateShareLinkRequest,
  ): Promise<CreateShareLinkResponse> {
    const actor = parseVerifiedActor(request.actor);
    const userId = actor.kind === 'USER' ? actor.userId : undefined;
    const guestSessionId =
      actor.kind === 'GUEST_SESSION' ? actor.guestSessionId : undefined;

    if (!userId && !guestSessionId) {
      throw new BadRequestException(
        'Valid user identity or guest session is required',
      );
    }

    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(request.sanitizedSnapshotJson);
    } catch {
      throw new BadRequestException('Invalid sanitized snapshot JSON');
    }
    const sanitizedSnapshot = sanitize3DSnapshot(parsedRaw);

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
      ringDesignDraftId: request.ringDesignDraftId || undefined,
      ringTemplateId: request.ringTemplateId || undefined,
      tokenHash,
      sanitizedSnapshotJson: sanitizedSnapshot,
      expiresAt,
    });

    return {
      id: created.id,
      shareToken,
      shareUrl: `/api/v1/shares/${shareToken}`,
      status: toShareLinkStatus(created.status),
      expiresAt: created.expiresAt
        ? created.expiresAt.toISOString()
        : expiresAt.toISOString(),
    };
  }
}

@Injectable()
export class RevokeShareLinkUseCase {
  constructor(
    @Inject(SHARING_REPOSITORY)
    private readonly sharingRepository: SharingRepository,
  ) {}

  async execute(
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

    const isOwner =
      (actor.kind === 'USER' &&
        link.createdByUserId === actor.userId &&
        link.guestSessionId === undefined) ||
      (actor.kind === 'GUEST_SESSION' &&
        link.guestSessionId === actor.guestSessionId &&
        link.createdByUserId === undefined);
    if (!isOwner) {
      throw new ForbiddenException('You do not own this share link');
    }

    if (link.status === 'REVOKED') {
      return {
        id: link.id,
        status: 'REVOKED',
        revokedAt: link.revokedAt
          ? link.revokedAt.toISOString()
          : new Date().toISOString(),
      };
    }

    const updated = await this.sharingRepository.revokeShareLink(link.id);

    return {
      id: updated.id,
      status: toShareLinkStatus(updated.status),
      revokedAt: updated.revokedAt
        ? updated.revokedAt.toISOString()
        : new Date().toISOString(),
    };
  }
}
