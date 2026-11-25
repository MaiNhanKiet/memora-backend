import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseVerifiedActor, requireCustomerIdentity } from '@app/common';
import type {
  ActivateCardRequest,
  MemoryCardDetailResponse,
  ProvisionMemoryCardRequest,
} from '@app/contracts';
import { toMemoryCardDetail } from './memory-card.mapper';
import {
  MEMORY_CARD_REPOSITORY,
  type MemoryCardRepository,
} from './memory-card.repository';
import { PinHasher } from './pin-hasher';
import { assertValidPinFormat } from './pin-policy';

@Injectable()
export class ProvisionMemoryCardUseCase {
  constructor(
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
  ) {}

  async execute(
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

    return toMemoryCardDetail(card, true);
  }
}

@Injectable()
export class ActivateCardUseCase {
  constructor(
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
    private readonly pinHasher: PinHasher,
  ) {}

  async execute(
    request: ActivateCardRequest,
  ): Promise<MemoryCardDetailResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }

    if (card.ownerCustomerIdentityId !== customerIdentityId) {
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
      assertValidPinFormat(
        request.initialPin,
        'PIN must be 4 to 6 numeric digits',
      );
      initialPinHash = await this.pinHasher.hash(request.initialPin);
    }

    const updated = await this.cardRepository.activateCard(
      card.id,
      initialPinHash,
    );

    return toMemoryCardDetail(updated, true);
  }
}
