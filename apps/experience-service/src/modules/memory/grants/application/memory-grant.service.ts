import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { parseVerifiedActor, requireCustomerIdentity } from '@app/common';
import type {
  AccessGrantItem,
  CreateAccessGrantRequest,
  CreateAccessGrantResponse,
  GetMemoryBySessionRequest,
  GetMemoryBySessionResponse,
  ListAccessGrantsRequest,
  ListAccessGrantsResponse,
  MemoryContentItem,
  RedeemInvitationRequest,
  RedeemInvitationResponse,
  RevokeAccessGrantRequest,
  RevokeAccessGrantResponse,
} from '@app/contracts';
import { MemoryCardRepository } from '../../cards/infrastructure/memory-card.repository';
import { PinHasher } from '../../cards/application/pin-hasher';
import { MemoryContentRepository } from '../../contents/infrastructure/memory-content.repository';
import { MemoryStorageAdapter } from '../../contents/infrastructure/memory-storage.adapter';
import { MemoryGrantRepository } from '../infrastructure/memory-grant.repository';

const MAX_PIN_FAILED_ATTEMPTS = 5;
const PIN_LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class MemoryGrantService {
  constructor(
    private readonly grantRepository: MemoryGrantRepository,
    private readonly cardRepository: MemoryCardRepository,
    private readonly contentRepository: MemoryContentRepository,
    private readonly storageAdapter: MemoryStorageAdapter,
    private readonly pinHasher: PinHasher,
  ) {}

  async createAccessGrant(
    request: CreateAccessGrantRequest,
  ): Promise<CreateAccessGrantResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }
    if (card.owner_customer_identity_id !== customerIdentityId) {
      throw new ForbiddenException(
        'Only the card owner can invite viewers to this card',
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.granteeEmail)) {
      throw new BadRequestException('Email người nhận không hợp lệ');
    }

    const ttlDays = Math.max(1, Math.min(30, request.ttlDays ?? 7));
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const grant = await this.grantRepository.createGrant({
      memoryCardId: card.id,
      granteeEmail: request.granteeEmail,
      invitationTokenHash: tokenHash,
      inviteExpiresAt: expiresAt,
    });

    const inviteUrl = `https://memora.vn/memory/redeem?token=${rawToken}`;

    return {
      grantId: grant.id,
      memoryCardId: card.id,
      granteeEmail: grant.grantee_email,
      invitationToken: rawToken,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async listAccessGrants(
    request: ListAccessGrantsRequest,
  ): Promise<ListAccessGrantsResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }
    if (card.owner_customer_identity_id !== customerIdentityId) {
      throw new ForbiddenException('Only the card owner can view access grants');
    }

    const grants = await this.grantRepository.listGrantsByCardId(card.id);
    const items: AccessGrantItem[] = grants.map((g) => ({
      id: g.id,
      memoryCardId: g.memory_card_id,
      granteeEmail: g.grantee_email,
      status: g.status,
      inviteExpiresAt: g.invite_expires_at?.toISOString(),
      acceptedAt: g.accepted_at?.toISOString(),
      lastAccessedAt: g.last_accessed_at?.toISOString(),
      createdAt: g.created_at.toISOString(),
    }));

    return { items };
  }

  async revokeAccessGrant(
    request: RevokeAccessGrantRequest,
  ): Promise<RevokeAccessGrantResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }
    if (card.owner_customer_identity_id !== customerIdentityId) {
      throw new ForbiddenException(
        'Only the card owner can revoke access grants',
      );
    }

    const grant = await this.grantRepository.findGrantById(request.grantId);
    if (!grant || grant.memory_card_id !== card.id) {
      throw new NotFoundException('Access grant not found for this card');
    }

    const revokerUserId = actor.kind === 'USER' ? actor.userId : undefined;
    await this.grantRepository.revokeGrant(grant.id, revokerUserId);

    return {
      success: true,
      message: 'Thu hồi quyền truy cập thành công',
    };
  }

  async redeemInvitation(
    request: RedeemInvitationRequest,
  ): Promise<RedeemInvitationResponse> {
    if (!request.invitationToken || request.invitationToken.trim().length === 0) {
      throw new BadRequestException('Mã mời không được để trống');
    }

    const tokenHash = createHash('sha256')
      .update(request.invitationToken.trim())
      .digest('hex');
    const grant = await this.grantRepository.findByTokenHash(tokenHash);
    if (!grant) {
      throw new NotFoundException('Lời mời không tồn tại hoặc đã bị thu hồi');
    }

    if (grant.status === 'REVOKED') {
      throw new ForbiddenException('Lời mời này đã bị chủ sở hữu thu hồi');
    }

    const now = new Date();
    if (grant.invite_expires_at && grant.invite_expires_at < now) {
      throw new BadRequestException('Lời mời này đã hết hạn sử dụng');
    }

    let userId: string | undefined;
    if (request.actor) {
      const parsed = parseVerifiedActor(request.actor);
      if (parsed.kind === 'USER') {
        userId = parsed.userId;
      }
    }

    const updatedGrant = await this.grantRepository.markAccepted(
      grant.id,
      userId,
    );

    const card = grant.memory_cards;
    const requiresPin = Boolean(card?.pin_hash);

    // Session valid for 30 days
    const sessionExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    return {
      accessSessionId: updatedGrant.id,
      memoryCardId: updatedGrant.memory_card_id,
      expiresAt: sessionExpiresAt,
      requiresPin,
    };
  }

  async getMemoryBySession(
    request: GetMemoryBySessionRequest,
  ): Promise<GetMemoryBySessionResponse> {
    if (!request.accessSessionId) {
      throw new BadRequestException('Mã phiên truy cập không hợp lệ');
    }

    const grant = await this.grantRepository.findGrantById(
      request.accessSessionId,
    );
    if (!grant) {
      throw new NotFoundException('Phiên truy cập không tồn tại');
    }

    if (grant.status !== 'ACTIVE') {
      throw new ForbiddenException(
        `Quyền truy cập không hợp lệ (trạng thái: ${grant.status})`,
      );
    }

    await this.grantRepository.updateLastAccessed(grant.id);

    const card = grant.memory_cards;
    if (!card || card.deleted_at !== null) {
      throw new NotFoundException('Thẻ ký ức không còn tồn tại');
    }

    // Verify PIN if card is PIN protected
    if (card.pin_hash) {
      const now = new Date();
      if (card.pin_locked_until && card.pin_locked_until > now) {
        const waitMinutes = Math.ceil(
          (card.pin_locked_until.getTime() - now.getTime()) / 60000,
        );
        throw new ForbiddenException(
          `Thẻ đang bị tạm khóa. Vui lòng thử lại sau ${waitMinutes} phút.`,
        );
      }

      if (!request.pin) {
        throw new BadRequestException('Mã PIN là bắt buộc để xem nội dung kỷ niệm');
      }

      const isMatch = await this.pinHasher.verify(card.pin_hash, request.pin);
      if (!isMatch) {
        const attempts = card.pin_failed_attempts + 1;
        let lockedUntil: Date | null = null;
        if (attempts >= MAX_PIN_FAILED_ATTEMPTS) {
          lockedUntil = new Date(now.getTime() + PIN_LOCK_DURATION_MS);
        }
        await this.cardRepository.recordFailedPinAttempt(
          card.id,
          attempts,
          lockedUntil,
        );
        throw new BadRequestException(
          attempts >= MAX_PIN_FAILED_ATTEMPTS
            ? 'Mã PIN không chính xác. Thẻ đã bị khóa 15 phút do nhập sai 5 lần.'
            : `Mã PIN không chính xác. Bạn còn ${MAX_PIN_FAILED_ATTEMPTS - attempts} lần thử.`,
        );
      }
    }

    const rawContents = await this.contentRepository.listContentsByCardId(
      card.id,
    );

    const items: MemoryContentItem[] = await Promise.all(
      rawContents.map(async (content) => {
        let assetUrl: string | undefined;
        if (content.asset_key) {
          try {
            assetUrl = await this.storageAdapter.presignGetUrl(
              content.asset_key,
              3600,
            );
          } catch {
            assetUrl = undefined;
          }
        }

        return {
          id: content.id,
          memoryCardId: content.memory_card_id,
          contentType: content.content_type,
          title: content.title ?? undefined,
          textContent: content.text_content ?? undefined,
          assetKey: content.asset_key ?? undefined,
          assetUrl,
          sortOrder: content.sort_order,
          status: content.status,
          layoutJson: content.layout_json
            ? JSON.stringify(content.layout_json)
            : undefined,
          createdAt: content.created_at.toISOString(),
          updatedAt: content.updated_at.toISOString(),
        };
      }),
    );

    return {
      cardId: card.id,
      status: card.status,
      items,
    };
  }
}
