import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  ActivatePricingRuleRequest,
  ApprovePriceVersionRequest,
  CreatePriceItemRequest,
  CreatePriceVersionRequest,
  CreatePricingRuleRequest,
  EstimatePriceRequest,
  EstimatePriceResponse,
  GemstonePriceLineItem,
  ListPriceItemsRequest,
  ListPriceItemsResponse,
  ListPriceVersionsRequest,
  ListPriceVersionsResponse,
  ListPricingRulesRequest,
  ListPricingRulesResponse,
  PriceItemResponse,
  PriceVersionResponse,
  PricingRuleResponse,
  RejectPriceVersionRequest,
} from '@app/contracts';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PricingRepository } from '../infrastructure/pricing.repository';
import { PricingMapper } from './pricing.mapper';

@Injectable()
export class PricingService {
  constructor(
    private readonly repository: PricingRepository,
    private readonly mapper: PricingMapper,
  ) {}

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
        const baseFee = Number(config.base_fee ?? config.fixedFee ?? 0);
        const feePerUnit = Number(
          config.fee_per_unit_delta ?? config.feePerStep ?? 0,
        );
        resizeFee = baseFee + Math.abs(delta) * feePerUnit;
      }
    }

    // 7. Maintenance Plan Fee
    let maintenancePlanFee = 0;
    const plan = request.maintenancePlan || 'NONE';
    if (plan !== 'NONE') {
      const planPriceVersion =
        await this.repository.findActivePriceVersionByMaintenancePlan(plan);
      if (planPriceVersion) {
        maintenancePlanFee = Number(planPriceVersion.amount);
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

  // --- PRICI-002: List Price Items ---
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
      items: items.map((item) => this.mapper.toPriceItemResponse(item)),
      total,
    };
  }

  // --- PRICI-003: Create Price Item ---
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
        `templateVariantId is required for price_type RING_BLANK`,
      );
    }
    if (request.priceType === 'GEMSTONE' && !request.gemstoneOptionId) {
      throw new UnprocessableEntityException(
        `gemstoneOptionId is required for price_type GEMSTONE`,
      );
    }
    if (
      request.priceType === 'CERTIFIED_GEMSTONE' &&
      !request.certifiedGemstoneId
    ) {
      throw new UnprocessableEntityException(
        `certifiedGemstoneId is required for price_type CERTIFIED_GEMSTONE`,
      );
    }
    if (
      request.priceType === 'PERSONALIZATION' &&
      !request.personalizationPackage
    ) {
      throw new UnprocessableEntityException(
        `personalizationPackage is required for price_type PERSONALIZATION`,
      );
    }

    const created = await this.repository.createPriceItem({
      price_type: request.priceType,
      code: request.code,
      template_variant_id: request.templateVariantId,
      gemstone_option_id: request.gemstoneOptionId,
      certified_gemstone_id: request.certifiedGemstoneId,
      personalization_package: request.personalizationPackage,
      status: request.status ?? 'ACTIVE',
    });

    return this.mapper.toPriceItemResponse(created);
  }

  // --- PRICI-004: List Price Versions ---
  async listPriceVersions(
    request: ListPriceVersionsRequest,
  ): Promise<ListPriceVersionsResponse> {
    const limit = request.limit && request.limit > 0 ? request.limit : 20;
    const offset = request.offset && request.offset >= 0 ? request.offset : 0;

    const { versions, total } = await this.repository.findPriceVersions({
      priceItemId: request.priceItemId,
      status: request.status,
      limit,
      offset,
    });

    return {
      versions: versions.map((v) => this.mapper.toPriceVersionResponse(v)),
      total,
    };
  }

  // --- PRICI-005: Create Price Version (DRAFT) ---
  async createPriceVersion(
    request: CreatePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    const priceItem = await this.repository.findPriceItemById(
      request.priceItemId,
    );
    if (!priceItem) {
      throw new NotFoundException(
        `Price item ${request.priceItemId} not found`,
      );
    }

    if (request.amount <= 0) {
      throw new UnprocessableEntityException(`Amount must be greater than 0`);
    }

    const latestVersion = await this.repository.getLatestVersionNoForPriceItem(
      request.priceItemId,
    );
    const nextVersion = latestVersion + 1;

    let parsedMarketSnapshot: Prisma.InputJsonValue | undefined;
    if (request.marketSnapshotJson) {
      try {
        parsedMarketSnapshot = JSON.parse(
          request.marketSnapshotJson,
        ) as Prisma.InputJsonValue;
      } catch {
        parsedMarketSnapshot = undefined;
      }
    }

    const created = await this.repository.createPriceVersion({
      price_item_id: request.priceItemId,
      amount: request.amount,
      currency: request.currency ?? 'VND',
      version_no: nextVersion,
      status: 'DRAFT',
      effective_from: request.effectiveFrom
        ? new Date(request.effectiveFrom)
        : undefined,
      effective_to: request.effectiveTo
        ? new Date(request.effectiveTo)
        : undefined,
      source_type: request.sourceType ?? 'MANUAL',
      market_snapshot_json: parsedMarketSnapshot,
      created_by_user_id: request.createdByUserId,
    });

    return this.mapper.toPriceVersionResponse(created);
  }

  // --- PRICI-006: Approve Price Version (DRAFT -> ACTIVE) ---
  async approvePriceVersion(
    request: ApprovePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    try {
      const approved = await this.repository.approvePriceVersion(
        request.versionId,
        request.reviewedByUserId,
        request.reviewNote,
      );
      return this.mapper.toPriceVersionResponse(approved);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'PRICE_VERSION_NOT_FOUND') {
          throw new NotFoundException(
            `Price version ${request.versionId} not found`,
          );
        }
        if (error.message === 'PRICE_VERSION_NOT_DRAFT') {
          throw new UnprocessableEntityException(
            `Only DRAFT price versions can be approved`,
          );
        }
      }
      throw error;
    }
  }

  // --- PRICI-007: Reject Price Version (DRAFT -> REJECTED) ---
  async rejectPriceVersion(
    request: RejectPriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    try {
      const rejected = await this.repository.rejectPriceVersion(
        request.versionId,
        request.reviewedByUserId,
        request.reviewNote,
      );
      return this.mapper.toPriceVersionResponse(rejected);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'PRICE_VERSION_NOT_FOUND') {
          throw new NotFoundException(
            `Price version ${request.versionId} not found`,
          );
        }
        if (error.message === 'PRICE_VERSION_NOT_DRAFT') {
          throw new UnprocessableEntityException(
            `Only DRAFT price versions can be rejected`,
          );
        }
      }
      throw error;
    }
  }

  // --- PRICI-008: List Pricing Rules ---
  async listPricingRules(
    request: ListPricingRulesRequest,
  ): Promise<ListPricingRulesResponse> {
    const limit = request.limit && request.limit > 0 ? request.limit : 20;
    const offset = request.offset && request.offset >= 0 ? request.offset : 0;

    const { rules, total } = await this.repository.findPricingRules({
      ruleType: request.ruleType,
      status: request.status,
      limit,
      offset,
    });

    return {
      rules: rules.map((r) => this.mapper.toPricingRuleResponse(r)),
      total,
    };
  }

  // --- PRICI-009: Create Pricing Rule (DRAFT) ---
  async createPricingRule(
    request: CreatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    const latestVersion =
      await this.repository.getLatestVersionNoForPricingRule(
        request.ruleType,
        request.code,
      );
    const nextVersion = latestVersion + 1;

    let parsedConfig: Prisma.InputJsonValue = {};
    if (request.configJson) {
      try {
        parsedConfig = JSON.parse(request.configJson) as Prisma.InputJsonValue;
      } catch {
        parsedConfig = {};
      }
    }

    const created = await this.repository.createPricingRule({
      rule_type: request.ruleType,
      code: request.code,
      name: request.name,
      template_variant_id: request.templateVariantId,
      resize_direction: request.resizeDirection,
      delivery_zone_code: request.deliveryZoneCode,
      cancellation_stage: request.cancellationStage,
      redelivery_reason: request.redeliveryReason,
      config_json: parsedConfig,
      version_no: nextVersion,
      status: 'DRAFT',
      effective_from: request.effectiveFrom
        ? new Date(request.effectiveFrom)
        : undefined,
      effective_to: request.effectiveTo
        ? new Date(request.effectiveTo)
        : undefined,
      created_by_user_id: request.createdByUserId,
    });

    return this.mapper.toPricingRuleResponse(created);
  }

  // --- PRICI-010: Activate Pricing Rule (DRAFT -> ACTIVE) ---
  async activatePricingRule(
    request: ActivatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    try {
      const activated = await this.repository.activatePricingRule(
        request.ruleId,
        request.approvedByUserId,
      );
      return this.mapper.toPricingRuleResponse(activated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'PRICING_RULE_NOT_FOUND') {
          throw new NotFoundException(
            `Pricing rule ${request.ruleId} not found`,
          );
        }
        if (error.message === 'PRICING_RULE_NOT_DRAFT') {
          throw new UnprocessableEntityException(
            `Only DRAFT pricing rules can be activated`,
          );
        }
      }
      throw error;
    }
  }
}
