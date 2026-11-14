import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  EstimatePriceRequest,
  EstimatePriceResponse,
  GemstonePriceLineItem,
} from '@app/contracts';
import { PricingRepository } from '../../repositories/pricing.repository';

@Injectable()
export class PricingService {
  constructor(private readonly repository: PricingRepository) {}

  async estimatePrice(
    request: EstimatePriceRequest,
  ): Promise<EstimatePriceResponse> {
    // 1. Verify Template Variant exists
    const variant = await this.repository.findVariantById(
      request.templateVariantId,
    );
    if (!variant || variant.status !== 'ACTIVE') {
      throw new NotFoundException(
        `Template variant ${request.templateVariantId} not found or not active`,
      );
    }

    // 2. Validate Resize Boundaries
    const standardSize = Number(variant.standard_size);
    const targetSize = request.targetSize;
    const delta = targetSize - standardSize;
    const maxUp = variant.max_up_delta ? Number(variant.max_up_delta) : 0;
    const maxDown = variant.max_down_delta ? Number(variant.max_down_delta) : 0;

    if (delta > 0 && delta > maxUp) {
      throw new UnprocessableEntityException(
        `Target size ${targetSize} exceeds max up delta ${maxUp} for standard size ${standardSize}`,
      );
    }
    if (delta < 0 && Math.abs(delta) > maxDown) {
      throw new UnprocessableEntityException(
        `Target size ${targetSize} exceeds max down delta ${maxDown} for standard size ${standardSize}`,
      );
    }

    // 3. Base Blank Price
    const blankPriceVersion =
      await this.repository.findActivePriceVersionByVariantId(variant.id);
    const baseBlankPrice = blankPriceVersion
      ? Number(blankPriceVersion.amount)
      : 0;

    // 4. Gemstones Price
    const gemstoneOptionIds = request.gemstoneOptionIds || [];
    const gemstonePriceVersions =
      await this.repository.findActivePriceVersionsByGemstoneOptionIds(
        gemstoneOptionIds,
      );

    const priceMap = new Map<string, number>();
    for (const pv of gemstonePriceVersions) {
      if (pv.price_items.gemstone_option_id) {
        priceMap.set(pv.price_items.gemstone_option_id, Number(pv.amount));
      }
    }

    const gemstoneLineItems: GemstonePriceLineItem[] = [];
    let gemstonesPrice = 0;
    for (const optId of gemstoneOptionIds) {
      const price = priceMap.get(optId) ?? 0;
      gemstoneLineItems.push({
        gemstoneOptionId: optId,
        price,
      });
      gemstonesPrice += price;
    }

    // 5. Personalization Fee
    let personalizationFee = 0;
    const pkg = request.personalizationPackage || 'NONE';
    if (pkg !== 'NONE') {
      const pkgPriceVersion =
        await this.repository.findActivePriceVersionByPersonalizationPackage(
          pkg,
        );
      if (pkgPriceVersion) {
        personalizationFee = Number(pkgPriceVersion.amount);
      }
    }

    // 6. Resize Fee (Pricing Rule)
    let resizeFee = 0;
    if (delta !== 0) {
      const direction = delta > 0 ? 'UP' : 'DOWN';
      const rule = await this.repository.findActiveResizeRule(
        variant.id,
        direction,
      );
      if (rule && rule.config_json && typeof rule.config_json === 'object') {
        const config = rule.config_json as Record<string, unknown>;
        const baseFee = Number(config.base_fee ?? 0);
        const feePerUnit = Number(config.fee_per_unit_delta ?? 0);
        resizeFee = baseFee + Math.abs(delta) * feePerUnit;
      }
    }

    const estimatedTotal =
      baseBlankPrice + gemstonesPrice + personalizationFee + resizeFee;

    return {
      estimatedTotal,
      currency: 'VND',
      estimatedAt: new Date().toISOString(),
      breakdown: {
        baseBlankPrice,
        gemstonesPrice,
        personalizationFee,
        resizeFee,
      },
      gemstoneLineItems,
    };
  }
}
