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
  type PriceVersionRecord,
  type PricingEstimateReader,
} from './pricing.repository';

@Injectable()
export class EstimatePriceUseCase {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingEstimateReader,
  ) {}

  async execute(request: EstimatePriceRequest): Promise<EstimatePriceResponse> {
    const { estimate } = await this.snapshot(request, new Date());
    return estimate;
  }

  async snapshot(request: EstimatePriceRequest, at: Date) {
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
      await this.repository.findActivePriceVersionByVariantId(variant.id, at);
    if (!blankPriceVersion) {
      throw new NotFoundException('No effective ring blank price is available');
    }
    const baseBlankPrice = blankPriceVersion.amount;

    const gemstoneOptionIds = request.gemstoneOptionIds || [];
    const gemstonePriceVersions =
      await this.repository.findActivePriceVersionsByGemstoneOptionIds(
        gemstoneOptionIds,
        at,
      );

    const priceMap = new Map<string, PriceVersionRecord>();
    for (const pv of gemstonePriceVersions) {
      if (pv.gemstoneOptionId) {
        priceMap.set(pv.gemstoneOptionId, pv);
      }
    }

    const gemstones = gemstoneOptionIds.map((optId) => {
      const price = priceMap.get(optId);
      if (!price) {
        throw new NotFoundException(
          `No effective price is available for gemstone option ${optId}`,
        );
      }
      return {
        gemstoneOptionId: optId,
        price: price.amount,
        priceVersionId: price.id,
      };
    });
    const gemstonesPrice = gemstones.reduce(
      (total, gem) => total + gem.price,
      0,
    );
    const gemstoneLineItems: GemstonePriceLineItem[] = gemstones.map(
      ({ gemstoneOptionId, price }) => ({ gemstoneOptionId, price }),
    );

    let personalizationFee = 0;
    let personalizationPriceVersionId: string | undefined;
    const pkg = request.personalizationPackage || 'NONE';
    if (pkg !== 'NONE') {
      const pkgPriceVersion =
        await this.repository.findActivePriceVersionByPersonalizationPackage(
          pkg,
          at,
        );
      if (!pkgPriceVersion) {
        throw new NotFoundException(
          `No effective price is available for personalization package ${pkg}`,
        );
      }
      personalizationFee = pkgPriceVersion.amount;
      personalizationPriceVersionId = pkgPriceVersion.id;
    }

    let resizeFee = 0;
    let resizeRuleId: string | undefined;
    if (delta !== 0) {
      const direction = delta > 0 ? 'UP' : 'DOWN';
      const rule = await this.repository.findActiveResizeRule(
        variant.id,
        direction,
        at,
      );
      if (rule && rule.configJson && typeof rule.configJson === 'object') {
        const config = rule.configJson as Record<string, unknown>;
        const baseFee = Number(config.base_fee ?? config.fixedFee ?? 0);
        const feePerUnit = Number(
          config.fee_per_unit_delta ?? config.feePerStep ?? 0,
        );
        resizeFee = baseFee + Math.abs(delta) * feePerUnit;
        resizeRuleId = rule.id;
      }
    }

    let maintenancePlanFee = 0;
    let maintenancePlanPriceVersionId: string | undefined;
    const plan = request.maintenancePlan || 'NONE';
    if (plan !== 'NONE') {
      const planPriceVersion =
        await this.repository.findActivePriceVersionByMaintenancePlan(plan, at);
      if (!planPriceVersion) {
        throw new NotFoundException(
          `No effective price is available for maintenance plan ${plan}`,
        );
      }
      maintenancePlanFee = planPriceVersion.amount;
      maintenancePlanPriceVersionId = planPriceVersion.id;
    }

    const estimatedTotal =
      baseBlankPrice +
      gemstonesPrice +
      personalizationFee +
      resizeFee +
      maintenancePlanFee;

    const estimate = {
      estimatedTotal,
      currency: 'VND',
      estimatedAt: at.toISOString(),
      breakdown: {
        baseBlankPrice,
        gemstonesPrice,
        personalizationFee,
        resizeFee,
        maintenancePlanFee,
      },
      gemstoneLineItems,
    } satisfies EstimatePriceResponse;
    return {
      estimate,
      blankPriceVersionId: blankPriceVersion.id,
      gemstones,
      personalizationPriceVersionId,
      resizeRuleId,
      maintenancePlanPriceVersionId,
    };
  }
}
