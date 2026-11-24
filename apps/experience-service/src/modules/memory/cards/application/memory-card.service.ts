import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseVerifiedActor, requireCustomerIdentity } from '@app/common';
import type {
  ActivateCardRequest,
  ChangePinRequest,
  ChangePinResponse,
  GetCardByRingItemIdRequest,
  GetCardDetailRequest,
  ListMyCardsRequest,
  ListMyCardsResponse,
  MemoryCardDetailResponse,
  MemoryCardStatus,
  MemoryCardSummary,
  ProvisionMemoryCardRequest,
  ResetPinRequest,
  ResetPinResponse,
  SetupPinRequest,
  SetupPinResponse,
} from '@app/contracts';
import { MemoryCardRepository } from '../infrastructure/memory-card.repository';
import { PinHasher } from './pin-hasher';

const PIN_REGEX = /^\d{4,6}$/;
const MAX_PIN_FAILED_ATTEMPTS = 5;
const PIN_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class MemoryCardService {
  constructor(
    private readonly cardRepository: MemoryCardRepository,
    private readonly pinHasher: PinHasher,
  ) {}

  async listMyCards(request: ListMyCardsRequest): Promise<ListMyCardsResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const page = Math.max(1, request.page ?? 1);
    const limit = Math.max(1, Math.min(100, request.limit ?? 20));
    const skip = (page - 1) * limit;

    const { items, total } = await this.cardRepository.listCardsByOwner(
      customerIdentityId,
      skip,
      limit,
    );

    const now = new Date();
    const mappedItems: MemoryCardSummary[] = items.map((card) => {
      const isLocked =
        Boolean(card.pin_locked_until) && card.pin_locked_until! > now;
      return {
        id: card.id,
        ringItemId: card.ring_item_id,
        ownerCustomerIdentityId: card.owner_customer_identity_id,
        ownerEmail: card.owner_email,
        status: card.status as MemoryCardStatus,
        hasPin: Boolean(card.pin_hash),
        isLocked,
        lockedUntil: card.pin_locked_until?.toISOString(),
        activatedAt: card.activated_at?.toISOString(),
        createdAt: card.created_at.toISOString(),
        updatedAt: card.updated_at.toISOString(),
      };
    });

    return {
      items: mappedItems,
      total,
      page,
      limit,
    };
  }

  async getCardDetail(
    request: GetCardDetailRequest,
  ): Promise<MemoryCardDetailResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }

    const isOwner = card.owner_customer_identity_id === customerIdentityId;
    if (!isOwner) {
      const grants =
        (
          card as unknown as {
            access_grants?: Array<{
              status: string;
              grantee_user_id?: string | null;
            }>;
          }
        ).access_grants ?? [];
      const hasGrant = grants.some(
        (g) =>
          g.status === 'ACTIVE' &&
          actor.kind === 'USER' &&
          g.grantee_user_id === actor.userId,
      );
      if (!hasGrant) {
        throw new ForbiddenException('Access denied to this memory card');
      }
    }

    const now = new Date();
    const isLocked =
      Boolean(card.pin_locked_until) && card.pin_locked_until! > now;

    return {
      id: card.id,
      ringItemId: card.ring_item_id,
      ownerCustomerIdentityId: card.owner_customer_identity_id,
      ownerEmail: card.owner_email,
      status: card.status as MemoryCardStatus,
      hasPin: Boolean(card.pin_hash),
      isLocked,
      pinFailedAttempts: card.pin_failed_attempts,
      pinLockedUntil: card.pin_locked_until?.toISOString(),
      activatedAt: card.activated_at?.toISOString(),
      arTargetAssetKey: card.ar_target_asset_key ?? undefined,
      createdAt: card.created_at.toISOString(),
      updatedAt: card.updated_at.toISOString(),
      isOwner,
    };
  }

  async activateCard(
    request: ActivateCardRequest,
  ): Promise<MemoryCardDetailResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }

    if (card.owner_customer_identity_id !== customerIdentityId) {
      throw new ForbiddenException(
        'Only the card owner can activate this memory card',
      );
    }

    if (card.status !== 'PENDING') {
      throw new BadRequestException(
        `Memory card cannot be activated from status ${card.status}`,
      );
    }

    let initialPinHash: string | undefined;
    if (request.initialPin) {
      if (!PIN_REGEX.test(request.initialPin)) {
        throw new BadRequestException('PIN must be 4 to 6 numeric digits');
      }
      initialPinHash = await this.pinHasher.hash(request.initialPin);
    }

    const updated = await this.cardRepository.activateCard(
      card.id,
      initialPinHash,
    );

    return {
      id: updated.id,
      ringItemId: updated.ring_item_id,
      ownerCustomerIdentityId: updated.owner_customer_identity_id,
      ownerEmail: updated.owner_email,
      status: updated.status as MemoryCardStatus,
      hasPin: Boolean(updated.pin_hash),
      isLocked: false,
      pinFailedAttempts: 0,
      activatedAt: updated.activated_at?.toISOString(),
      arTargetAssetKey: updated.ar_target_asset_key ?? undefined,
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString(),
      isOwner: true,
    };
  }

  async provisionMemoryCard(
    request: ProvisionMemoryCardRequest,
  ): Promise<MemoryCardDetailResponse> {
    parseVerifiedActor(request.actor);
    if (!request.ringItemId) {
      throw new BadRequestException('ringItemId is required');
    }
    if (!request.ownerCustomerIdentityId) {
      throw new BadRequestException('ownerCustomerIdentityId is required');
    }
    if (!request.ownerEmail) {
      throw new BadRequestException('ownerEmail is required');
    }

    const card = await this.cardRepository.provisionCard({
      ringItemId: request.ringItemId,
      ownerCustomerIdentityId: request.ownerCustomerIdentityId,
      ownerEmail: request.ownerEmail,
    });

    const now = new Date();
    const isLocked =
      Boolean(card.pin_locked_until) && card.pin_locked_until! > now;

    return {
      id: card.id,
      ringItemId: card.ring_item_id,
      ownerCustomerIdentityId: card.owner_customer_identity_id,
      ownerEmail: card.owner_email,
      status: card.status as MemoryCardStatus,
      hasPin: Boolean(card.pin_hash),
      isLocked,
      pinFailedAttempts: card.pin_failed_attempts,
      pinLockedUntil: card.pin_locked_until?.toISOString(),
      activatedAt: card.activated_at?.toISOString(),
      arTargetAssetKey: card.ar_target_asset_key ?? undefined,
      createdAt: card.created_at.toISOString(),
      updatedAt: card.updated_at.toISOString(),
      isOwner: true,
    };
  }

  async getCardByRingItemId(
    request: GetCardByRingItemIdRequest,
  ): Promise<MemoryCardDetailResponse> {
    const actor = parseVerifiedActor(request.actor);
    const card = await this.cardRepository.findByRingItemId(request.ringItemId);
    if (!card) {
      throw new NotFoundException(
        `Memory card for ring item ${request.ringItemId} not found`,
      );
    }

    const customerIdentityId =
      actor.kind === 'USER' ? actor.customerIdentityId : undefined;
    const isOwner = Boolean(
      customerIdentityId &&
      card.owner_customer_identity_id === customerIdentityId,
    );

    const now = new Date();
    const isLocked =
      Boolean(card.pin_locked_until) && card.pin_locked_until! > now;

    return {
      id: card.id,
      ringItemId: card.ring_item_id,
      ownerCustomerIdentityId: card.owner_customer_identity_id,
      ownerEmail: card.owner_email,
      status: card.status as MemoryCardStatus,
      hasPin: Boolean(card.pin_hash),
      isLocked,
      pinFailedAttempts: card.pin_failed_attempts,
      pinLockedUntil: card.pin_locked_until?.toISOString(),
      activatedAt: card.activated_at?.toISOString(),
      arTargetAssetKey: card.ar_target_asset_key ?? undefined,
      createdAt: card.created_at.toISOString(),
      updatedAt: card.updated_at.toISOString(),
      isOwner,
    };
  }

  async setupPin(request: SetupPinRequest): Promise<SetupPinResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }
    if (card.owner_customer_identity_id !== customerIdentityId) {
      throw new ForbiddenException('Only the card owner can setup PIN');
    }
    if (card.pin_hash) {
      throw new BadRequestException(
        'PIN has already been configured. Use PUT to change PIN.',
      );
    }
    if (!PIN_REGEX.test(request.pin)) {
      throw new BadRequestException('PIN must be 4 to 6 numeric digits');
    }

    const hash = await this.pinHasher.hash(request.pin);
    const updated = await this.cardRepository.updatePin(card.id, hash);

    return {
      success: true,
      message: 'Mã PIN đã được thiết lập thành công',
      updatedAt:
        updated.pin_updated_at?.toISOString() ?? new Date().toISOString(),
    };
  }

  async changePin(request: ChangePinRequest): Promise<ChangePinResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }
    if (card.owner_customer_identity_id !== customerIdentityId) {
      throw new ForbiddenException('Only the card owner can change PIN');
    }
    if (!card.pin_hash) {
      throw new BadRequestException(
        'Card does not have a PIN yet. Use POST to setup PIN.',
      );
    }

    const now = new Date();
    if (card.pin_locked_until && card.pin_locked_until > now) {
      const waitMinutes = Math.ceil(
        (card.pin_locked_until.getTime() - now.getTime()) / 60000,
      );
      throw new ForbiddenException(
        `Thẻ đang bị tạm khóa do nhập sai PIN quá nhiều lần. Vui lòng thử lại sau ${waitMinutes} phút.`,
      );
    }

    const isMatch = await this.pinHasher.verify(
      card.pin_hash,
      request.currentPin,
    );
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
          ? 'Mã PIN hiện tại không chính xác. Thẻ đã bị khóa 15 phút do nhập sai 5 lần.'
          : `Mã PIN hiện tại không chính xác. Bạn còn ${MAX_PIN_FAILED_ATTEMPTS - attempts} lần thử.`,
      );
    }

    if (!PIN_REGEX.test(request.newPin)) {
      throw new BadRequestException('Mã PIN mới phải gồm 4 đến 6 chữ số');
    }

    const newHash = await this.pinHasher.hash(request.newPin);
    const updated = await this.cardRepository.updatePin(card.id, newHash);

    return {
      success: true,
      message: 'Đổi mã PIN thành công',
      updatedAt:
        updated.pin_updated_at?.toISOString() ?? new Date().toISOString(),
    };
  }

  async resetPin(request: ResetPinRequest): Promise<ResetPinResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }
    if (card.owner_customer_identity_id !== customerIdentityId) {
      throw new ForbiddenException('Only the card owner can reset PIN');
    }

    if (!request.verificationCode || request.verificationCode.length < 6) {
      throw new BadRequestException(
        'Mã xác thực OTP không hợp lệ hoặc đã hết hạn',
      );
    }

    if (!PIN_REGEX.test(request.newPin)) {
      throw new BadRequestException('Mã PIN mới phải gồm 4 đến 6 chữ số');
    }

    const newHash = await this.pinHasher.hash(request.newPin);
    const updated = await this.cardRepository.updatePin(card.id, newHash);

    return {
      success: true,
      message: 'Đặt lại mã PIN thành công',
      updatedAt:
        updated.pin_updated_at?.toISOString() ?? new Date().toISOString(),
    };
  }
}
