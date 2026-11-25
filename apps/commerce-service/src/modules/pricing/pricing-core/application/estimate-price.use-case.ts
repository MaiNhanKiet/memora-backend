import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  EstimatePriceRequest,
  EstimatePriceResponse,
  GemstonePriceLineItem,
} from '@app/contracts';
import {
  PRICING_REPOSITORY,
  type PricingRepository,
} from './pricing.repository';

@Injectable()
export class EstimatePriceUseCase {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingRepository,
  ) {}

  async execute(request: EstimatePriceRequest): Promise<EstimatePriceResponse> {
    const variant = await this.repository.findVariantById(
      request.templateVariantId,
    );
    if (!variant || variant.status !== 'ACTIVE') {
      throw new NotFoundException(
        `Template variant ${request.templateVariantId} not found or not active`,
      );
    }

    const standardSize = variant.standardSize;
    const targetSize = request.targetSize;
    const delta = targetSize - standardSize;
    const maxUp = variant.maxUpDelta ?? 0;
    const maxDown = variant.maxDownDelta ?? 0;

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

    const blankPriceVersion =
      await this.repository.findActivePriceVersionByVariantId(variant.id);
    const baseBlankPrice = blankPriceVersion ? blankPriceVersion.amount : 0;

    const gemstoneOptionIds = request.gemstoneOptionIds || [];
    const gemstonePriceVersions =
      await this.repository.findActivePriceVersionsByGemstoneOptionIds(
        gemstoneOptionIds,
      );

    const priceMap = new Map<string, number>();
    for (const pv of gemstonePriceVersions) {
      if (pv.gemstoneOptionId) {
        priceMap.set(pv.gemstoneOptionId, pv.amount);
      }
    }

    const gemstoneLineItems: GemstonePriceLineItem[] = [];
    let gemstonesPrice = 0;
    for (const optId of gemstoneOptionIds) {
      const price = priceMap.get(optId) ?? 0;
      gemstoneLineItems.push({ gemstoneOptionId: optId, price });
      gemstonesPrice += price;
    }

    let personalizationFee = 0;
    const pkg = request.personalizationPackage || 'NONE';
    if (pkg !== 'NONE') {
      const pkgPriceVersion =
        await this.repository.findActivePriceVersionByPersonalizationPackage(
          pkg,
        );
      if (pkgPriceVersion) {
        personalizationFee = pkgPriceVersion.amount;
      }
    }

    let resizeFee = 0;
    if (delta !== 0) {
      const direction = delta > 0 ? 'UP' : 'DOWN';
      const rule = await this.repository.findActiveResizeRule(
        variant.id,
        direction,
      );
      if (rule && rule.configJson && typeof rule.configJson === 'object') {
        const config = rule.configJson as Record<string, unknown>;
        const baseFee = Number(config.base_fee ?? config.fixedFee ?? 0);
        const feePerUnit = Number(
          config.fee_per_unit_delta ?? config.feePerStep ?? 0,
        );
        resizeFee = baseFee + Math.abs(delta) * feePerUnit;
      }
    }

    let maintenancePlanFee = 0;
    const plan = request.maintenancePlan || 'NONE';
    if (plan !== 'NONE') {
      const planPriceVersion =
        await this.repository.findActivePriceVersionByMaintenancePlan(plan);
      if (planPriceVersion) {
        maintenancePlanFee = planPriceVersion.amount;
      } else if (plan === 'LIFETIME_POLISHING') {
        maintenancePlanFee = 500000;
      }
    }

    const estimatedTotal =
      baseBlankPrice +
      gemstonesPrice +
      personalizationFee +
      resizeFee +
      maintenancePlanFee;

    return {
      estimatedTotal,
      currency: 'VND',
      estimatedAt: new Date().toISOString(),
      breakdown: {
        baseBlankPrice,
        gemstonesPrice,
        personalizationFee,
        resizeFee,
        maintenancePlanFee,
      },
      gemstoneLineItems,
    };
  }
}
