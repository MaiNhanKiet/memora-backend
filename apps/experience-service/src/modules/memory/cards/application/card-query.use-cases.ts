import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseVerifiedActor, requireCustomerIdentity } from '@app/common';
import type {
  GetCardByRingItemIdRequest,
  GetCardDetailRequest,
  ListMyCardsRequest,
  ListMyCardsResponse,
  MemoryCardDetailResponse,
} from '@app/contracts';
import {
  hasCardOwnerOrGrantAccess,
  toMemoryCardDetail,
  toMemoryCardSummary,
} from './memory-card.mapper';
import {
  MEMORY_CARD_REPOSITORY,
  type MemoryCardRepository,
} from './memory-card.repository';

@Injectable()
export class ListMyCardsUseCase {
  constructor(
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
  ) {}

  async execute(request: ListMyCardsRequest): Promise<ListMyCardsResponse> {
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
    return {
      items: items.map((card) => toMemoryCardSummary(card, now)),
      total,
      page,
      limit,
    };
  }
}

@Injectable()
export class GetCardDetailUseCase {
  constructor(
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
  ) {}

  async execute(
    request: GetCardDetailRequest,
  ): Promise<MemoryCardDetailResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }

    if (!hasCardOwnerOrGrantAccess(card, actor, customerIdentityId)) {
      throw new ForbiddenException('Access denied to this memory card');
    }

    const isOwner = card.ownerCustomerIdentityId === customerIdentityId;
    return toMemoryCardDetail(card, isOwner);
  }
}

@Injectable()
export class GetCardByRingItemIdUseCase {
  constructor(
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
  ) {}

  async execute(
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
      customerIdentityId && card.ownerCustomerIdentityId === customerIdentityId,
    );

    return toMemoryCardDetail(card, isOwner);
  }
}
