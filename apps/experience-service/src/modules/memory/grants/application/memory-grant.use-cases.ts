import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { parseVerifiedActor, requireCustomerIdentity } from '@app/common';
import type {
  CreateAccessGrantRequest,
  CreateAccessGrantResponse,
  GetMemoryBySessionRequest,
  GetMemoryBySessionResponse,
  ListAccessGrantsRequest,
  ListAccessGrantsResponse,
  RedeemInvitationRequest,
  RedeemInvitationResponse,
  RevokeAccessGrantRequest,
  RevokeAccessGrantResponse,
} from '@app/contracts';
import {
  MEMORY_CARD_REPOSITORY,
  type MemoryCardRepository,
  type MemoryCardWithGrantsRecord,
} from '../../cards/application/memory-card.repository';
import { PinHasher } from '../../cards/application/pin-hasher';
import { verifyCardPinWithLockout } from '../../cards/application/pin-policy';
import { mapContentsWithPresignedUrls } from '../../contents/application/memory-content.mapper';
import {
  MEMORY_CONTENT_REPOSITORY,
  type MemoryContentRepository,
} from '../../contents/application/memory-content.repository';
import {
  MEMORY_STORAGE_PORT,
  type MemoryStoragePort,
} from '../../contents/application/memory-storage.port';
import { toAccessGrantItem } from './memory-grant.mapper';
import {
  MEMORY_GRANT_REPOSITORY,
  type MemoryGrantRepository,
} from './memory-grant.repository';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireOwnedCard(
  cardRepository: MemoryCardRepository,
  cardId: string,
  customerIdentityId: string,
  forbiddenMessage: string,
): Promise<MemoryCardWithGrantsRecord> {
  const card = await cardRepository.findById(cardId);
  if (!card) {
    throw new NotFoundException('Memory card not found');
  }
  if (card.ownerCustomerIdentityId !== customerIdentityId) {
    throw new ForbiddenException(forbiddenMessage);
  }
  return card;
}

@Injectable()
export class CreateAccessGrantUseCase {
  constructor(
    @Inject(MEMORY_GRANT_REPOSITORY)
    private readonly grantRepository: MemoryGrantRepository,
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
  ) {}

  async execute(
    request: CreateAccessGrantRequest,
  ): Promise<CreateAccessGrantResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await requireOwnedCard(
      this.cardRepository,
      request.cardId,
      customerIdentityId,
      'Only the card owner can invite viewers to this card',
    );

    if (!EMAIL_REGEX.test(request.granteeEmail)) {
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
      granteeEmail: grant.granteeEmail,
      invitationToken: rawToken,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }
}

@Injectable()
export class ListAccessGrantsUseCase {
  constructor(
    @Inject(MEMORY_GRANT_REPOSITORY)
    private readonly grantRepository: MemoryGrantRepository,
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
  ) {}

  async execute(
    request: ListAccessGrantsRequest,
  ): Promise<ListAccessGrantsResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await requireOwnedCard(
      this.cardRepository,
      request.cardId,
      customerIdentityId,
      'Only the card owner can view access grants',
    );

    const grants = await this.grantRepository.listGrantsByCardId(card.id);
    return {
      items: grants.map(toAccessGrantItem),
    };
  }
}

@Injectable()
export class RevokeAccessGrantUseCase {
  constructor(
    @Inject(MEMORY_GRANT_REPOSITORY)
    private readonly grantRepository: MemoryGrantRepository,
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
  ) {}

  async execute(
    request: RevokeAccessGrantRequest,
  ): Promise<RevokeAccessGrantResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await requireOwnedCard(
      this.cardRepository,
      request.cardId,
      customerIdentityId,
      'Only the card owner can revoke access grants',
    );

    const grant = await this.grantRepository.findGrantById(request.grantId);
    if (!grant || grant.memoryCardId !== card.id) {
      throw new NotFoundException('Access grant not found for this card');
    }

    const revokerUserId = actor.kind === 'USER' ? actor.userId : undefined;
    await this.grantRepository.revokeGrant(grant.id, revokerUserId);

    return {
      success: true,
      message: 'Thu hồi quyền truy cập thành công',
    };
  }
}

@Injectable()
export class RedeemInvitationUseCase {
  constructor(
    @Inject(MEMORY_GRANT_REPOSITORY)
    private readonly grantRepository: MemoryGrantRepository,
  ) {}

  async execute(
    request: RedeemInvitationRequest,
  ): Promise<RedeemInvitationResponse> {
    if (
      !request.invitationToken ||
      request.invitationToken.trim().length === 0
    ) {
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
    if (grant.inviteExpiresAt && grant.inviteExpiresAt < now) {
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

    const requiresPin = Boolean(grant.card?.pinHash);
    const sessionExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    return {
      accessSessionId: updatedGrant.id,
      memoryCardId: updatedGrant.memoryCardId,
      expiresAt: sessionExpiresAt,
      requiresPin,
    };
  }
}

@Injectable()
export class GetMemoryBySessionUseCase {
  constructor(
    @Inject(MEMORY_GRANT_REPOSITORY)
    private readonly grantRepository: MemoryGrantRepository,
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
    @Inject(MEMORY_CONTENT_REPOSITORY)
    private readonly contentRepository: MemoryContentRepository,
    @Inject(MEMORY_STORAGE_PORT)
    private readonly storagePort: MemoryStoragePort,
    private readonly pinHasher: PinHasher,
  ) {}

  async execute(
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

    const card = grant.card;
    if (!card || card.deletedAt !== undefined) {
      throw new NotFoundException('Thẻ ký ức không còn tồn tại');
    }

    if (card.pinHash) {
      await verifyCardPinWithLockout({
        cardId: card.id,
        pinHash: card.pinHash,
        pinFailedAttempts: card.pinFailedAttempts,
        pinLockedUntil: card.pinLockedUntil,
        inputPin: request.pin,
        missingPinMessage: 'Mã PIN là bắt buộc để xem nội dung kỷ niệm',
        lockedMessage: (waitMinutes) =>
          `Thẻ đang bị tạm khóa. Vui lòng thử lại sau ${waitMinutes} phút.`,
        wrongPinMessages: {
          locked:
            'Mã PIN không chính xác. Thẻ đã bị khóa 15 phút do nhập sai 5 lần.',
          remaining: (left) =>
            `Mã PIN không chính xác. Bạn còn ${left} lần thử.`,
        },
        pinHasher: this.pinHasher,
        cardRepository: this.cardRepository,
      });
    }

    const rawContents = await this.contentRepository.listContentsByCardId(
      card.id,
    );
    const items = await mapContentsWithPresignedUrls(
      rawContents,
      this.storagePort,
    );

    return {
      cardId: card.id,
      status: card.status,
      items,
    };
  }
}
