import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseVerifiedActor, requireCustomerIdentity } from '@app/common';
import type {
  ChangePinRequest,
  ChangePinResponse,
  ResetPinRequest,
  ResetPinResponse,
  SetupPinRequest,
  SetupPinResponse,
} from '@app/contracts';
import {
  MEMORY_CARD_REPOSITORY,
  type MemoryCardRepository,
  type MemoryCardWithGrantsRecord,
} from './memory-card.repository';
import { PinHasher } from './pin-hasher';
import { assertValidPinFormat, verifyCardPinWithLockout } from './pin-policy';

async function loadOwnedCard(
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
export class SetupPinUseCase {
  constructor(
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
    private readonly pinHasher: PinHasher,
  ) {}

  async execute(request: SetupPinRequest): Promise<SetupPinResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await loadOwnedCard(
      this.cardRepository,
      request.cardId,
      customerIdentityId,
      'Only the card owner can setup PIN',
    );
    if (card.pinHash) {
      throw new BadRequestException(
        'PIN has already been configured. Use PUT to change PIN.',
      );
    }
    assertValidPinFormat(request.pin, 'PIN must be 4 to 6 numeric digits');

    const hash = await this.pinHasher.hash(request.pin);
    const updated = await this.cardRepository.updatePin(card.id, hash);

    return {
      success: true,
      message: 'Mã PIN đã được thiết lập thành công',
      updatedAt:
        updated.pinUpdatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}

@Injectable()
export class ChangePinUseCase {
  constructor(
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
    private readonly pinHasher: PinHasher,
  ) {}

  async execute(request: ChangePinRequest): Promise<ChangePinResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await loadOwnedCard(
      this.cardRepository,
      request.cardId,
      customerIdentityId,
      'Only the card owner can change PIN',
    );
    if (!card.pinHash) {
      throw new BadRequestException(
        'Card does not have a PIN yet. Use POST to setup PIN.',
      );
    }

    await verifyCardPinWithLockout({
      cardId: card.id,
      pinHash: card.pinHash,
      pinLockedUntil: card.pinLockedUntil,
      inputPin: request.currentPin,
      missingPinMessage: 'Mã PIN hiện tại không chính xác.',
      lockedMessage: (waitMinutes) =>
        `Thẻ đang bị tạm khóa do nhập sai PIN quá nhiều lần. Vui lòng thử lại sau ${waitMinutes} phút.`,
      wrongPinMessages: {
        locked:
          'Mã PIN hiện tại không chính xác. Thẻ đã bị khóa 15 phút do nhập sai 5 lần.',
        remaining: (left) =>
          `Mã PIN hiện tại không chính xác. Bạn còn ${left} lần thử.`,
      },
      pinHasher: this.pinHasher,
      cardRepository: this.cardRepository,
      requireNonEmptyInput: false,
    });

    assertValidPinFormat(request.newPin, 'Mã PIN mới phải gồm 4 đến 6 chữ số');

    const newHash = await this.pinHasher.hash(request.newPin);
    const updated = await this.cardRepository.changeVerifiedPin(
      card.id,
      card.pinHash,
      newHash,
    );
    if (!updated) {
      throw new ForbiddenException(
        'Trạng thái mã PIN đã thay đổi. Vui lòng thử lại.',
      );
    }

    return {
      success: true,
      message: 'Đổi mã PIN thành công',
      updatedAt:
        updated.pinUpdatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}

@Injectable()
export class ResetPinUseCase {
  constructor(
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
    private readonly pinHasher: PinHasher,
  ) {}

  async execute(request: ResetPinRequest): Promise<ResetPinResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await loadOwnedCard(
      this.cardRepository,
      request.cardId,
      customerIdentityId,
      'Only the card owner can reset PIN',
    );

    if (!request.verificationCode || request.verificationCode.length < 6) {
      throw new BadRequestException(
        'Mã xác thực OTP không hợp lệ hoặc đã hết hạn',
      );
    }

    assertValidPinFormat(request.newPin, 'Mã PIN mới phải gồm 4 đến 6 chữ số');

    const newHash = await this.pinHasher.hash(request.newPin);
    const updated = await this.cardRepository.updatePin(card.id, newHash);

    return {
      success: true,
      message: 'Đặt lại mã PIN thành công',
      updatedAt:
        updated.pinUpdatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
