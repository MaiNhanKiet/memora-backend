export const PRICING_REPOSITORY = Symbol('PRICING_REPOSITORY');

export interface PricingVariantRecord {
  readonly id: string;
  readonly status: string;
  readonly standardSize: number;
  readonly maxUpDelta?: number;
  readonly maxDownDelta?: number;
}

export interface PriceVersionRecord {
  readonly id: string;
  readonly priceItemId: string;
  readonly amount: number;
  readonly currency: string;
  readonly versionNo: number;
  readonly status: string;
  readonly effectiveFrom?: Date;
  readonly effectiveTo?: Date;
  readonly sourceType: string;
  readonly marketSnapshotJson?: unknown;
  readonly reviewNote?: string;
  readonly createdByUserId?: string;
  readonly reviewedByUserId?: string;
  readonly reviewedAt?: Date;
  readonly createdAt: Date;
  readonly gemstoneOptionId?: string;
}

export interface PriceItemRecord {
  readonly id: string;
  readonly priceType: string;
  readonly templateVariantId?: string;
  readonly gemstoneOptionId?: string;
  readonly certifiedGemstoneId?: string;
  readonly personalizationPackage?: string;
  readonly code: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly activePriceVersion?: PriceVersionRecord;
}

export interface PricingRuleRecord {
  readonly id: string;
  readonly ruleType: string;
  readonly code: string;
  readonly name: string;
  readonly templateVariantId?: string;
  readonly resizeDirection?: string;
  readonly deliveryZoneCode?: string;
  readonly cancellationStage?: string;
  readonly redeliveryReason?: string;
  readonly configJson?: unknown;
  readonly versionNo: number;
  readonly status: string;
  readonly effectiveFrom?: Date;
  readonly effectiveTo?: Date;
  readonly createdByUserId?: string;
  readonly approvedByUserId?: string;
  readonly approvedAt?: Date;
  readonly createdAt: Date;
}

export interface CreatePriceItemInput {
  readonly priceType: string;
  readonly code: string;
  readonly templateVariantId?: string;
  readonly gemstoneOptionId?: string;
  readonly certifiedGemstoneId?: string;
  readonly personalizationPackage?: string;
  readonly status: string;
}

export interface CreatePriceVersionInput {
  readonly priceItemId: string;
  readonly amount: number;
  readonly currency: string;
  readonly versionNo: number;
  readonly status: string;
  readonly effectiveFrom?: Date;
  readonly effectiveTo?: Date;
  readonly sourceType: string;
  readonly marketSnapshotJson?: Record<string, unknown>;
  readonly createdByUserId?: string;
}

export interface CreatePricingRuleInput {
  readonly ruleType: string;
  readonly code: string;
  readonly name: string;
  readonly templateVariantId?: string;
  readonly resizeDirection?: string;
  readonly deliveryZoneCode?: string;
  readonly cancellationStage?: string;
  readonly redeliveryReason?: string;
  readonly configJson: Record<string, unknown>;
  readonly versionNo: number;
  readonly status: string;
  readonly effectiveFrom?: Date;
  readonly effectiveTo?: Date;
  readonly createdByUserId?: string;
}

export interface PricingRepository {
  findVariantById(id: string): Promise<PricingVariantRecord | undefined>;
  findActivePriceVersionByVariantId(
    variantId: string,
  ): Promise<PriceVersionRecord | undefined>;
  findActivePriceVersionsByGemstoneOptionIds(
    gemstoneOptionIds: readonly string[],
  ): Promise<PriceVersionRecord[]>;
  findActivePriceVersionByPersonalizationPackage(
    pkg: string,
  ): Promise<PriceVersionRecord | undefined>;
  findActivePriceVersionByMaintenancePlan(
    planCode: string,
  ): Promise<PriceVersionRecord | undefined>;
  findActiveResizeRule(
    variantId: string,
    direction: 'UP' | 'DOWN',
  ): Promise<PricingRuleRecord | undefined>;

  findPriceItems(filter: {
    priceType?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: PriceItemRecord[]; total: number }>;
  findPriceItemById(id: string): Promise<PriceItemRecord | undefined>;
  findPriceItemByCode(code: string): Promise<PriceItemRecord | undefined>;
  createPriceItem(data: CreatePriceItemInput): Promise<PriceItemRecord>;

  findPriceVersions(filter: {
    priceItemId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ versions: PriceVersionRecord[]; total: number }>;
  getLatestVersionNoForPriceItem(priceItemId: string): Promise<number>;
  createPriceVersion(
    data: CreatePriceVersionInput,
  ): Promise<PriceVersionRecord>;
  approvePriceVersion(
    versionId: string,
    actorId?: string,
    reviewNote?: string,
  ): Promise<PriceVersionRecord>;
  rejectPriceVersion(
    versionId: string,
    actorId?: string,
    reviewNote?: string,
  ): Promise<PriceVersionRecord>;

  findPricingRules(filter: {
    ruleType?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ rules: PricingRuleRecord[]; total: number }>;
  getLatestVersionNoForPricingRule(
    ruleType: string,
    code: string,
  ): Promise<number>;
  createPricingRule(data: CreatePricingRuleInput): Promise<PricingRuleRecord>;
  activatePricingRule(
    ruleId: string,
    actorId?: string,
  ): Promise<PricingRuleRecord>;
}
