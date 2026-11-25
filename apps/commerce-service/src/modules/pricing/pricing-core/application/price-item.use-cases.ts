import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  CreatePriceItemRequest,
  ListPriceItemsRequest,
  ListPriceItemsResponse,
  PriceItemResponse,
} from '@app/contracts';
import { toPriceItemResponse } from './pricing.mapper';
import {
  PRICING_REPOSITORY,
  type PricingRepository,
} from './pricing.repository';

@Injectable()
export class PriceItemUseCases {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingRepository,
  ) {}

  async listPriceItems(
    request: ListPriceItemsRequest,
  ): Promise<ListPriceItemsResponse> {
    const limit = request.limit && request.limit > 0 ? request.limit : 20;
    const offset = request.offset && request.offset >= 0 ? request.offset : 0;

    const { items, total } = await this.repository.findPriceItems({
      priceType: request.priceType,
      status: request.status,
      limit,
      offset,
    });

    return {
      items: items.map((item) => toPriceItemResponse(item)),
      total,
    };
  }

  async createPriceItem(
    request: CreatePriceItemRequest,
  ): Promise<PriceItemResponse> {
    const existing = await this.repository.findPriceItemByCode(request.code);
    if (existing) {
      throw new ConflictException(
        `Price item with code '${request.code}' already exists`,
      );
    }

    if (request.priceType === 'RING_BLANK' && !request.templateVariantId) {
      throw new UnprocessableEntityException(
        'templateVariantId is required for price_type RING_BLANK',
      );
    }
    if (request.priceType === 'GEMSTONE' && !request.gemstoneOptionId) {
      throw new UnprocessableEntityException(
        'gemstoneOptionId is required for price_type GEMSTONE',
      );
    }
    if (
      request.priceType === 'CERTIFIED_GEMSTONE' &&
      !request.certifiedGemstoneId
    ) {
      throw new UnprocessableEntityException(
        'certifiedGemstoneId is required for price_type CERTIFIED_GEMSTONE',
      );
    }
    if (
      request.priceType === 'PERSONALIZATION' &&
      !request.personalizationPackage
    ) {
      throw new UnprocessableEntityException(
        'personalizationPackage is required for price_type PERSONALIZATION',
      );
    }

    const created = await this.repository.createPriceItem({
      priceType: request.priceType,
      code: request.code,
      templateVariantId: request.templateVariantId,
      gemstoneOptionId: request.gemstoneOptionId,
      certifiedGemstoneId: request.certifiedGemstoneId,
      personalizationPackage: request.personalizationPackage,
      status: request.status ?? 'ACTIVE',
    });

    return toPriceItemResponse(created);
  }
}
