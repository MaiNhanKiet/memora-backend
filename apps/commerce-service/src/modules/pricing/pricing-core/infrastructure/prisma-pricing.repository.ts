import { Injectable } from '@nestjs/common';
import type { EstimatePriceRequest } from '@app/contracts';
import type { Prisma } from '../../../../../generated/prisma/client';
import type {
  price_items,
  price_versions,
  pricing_rules,
  template_variants,
} from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import { EstimatePriceUseCase } from '../application/estimate-price.use-case';
import type {
  CreatePriceItemInput,
  CreatePriceVersionInput,
  CreatePricingRuleInput,
  PriceItemRecord,
  PriceVersionRecord,
  PricingEstimateReader,
  PricingRepository,
  PricingRuleRecord,
  PricingVariantRecord,
} from '../application/pricing.repository';

function toVariantRecord(v: template_variants): PricingVariantRecord {
  return {
    id: v.id,
    status: v.status,
    standardSize: Number(v.standard_size),
    maxUpDelta: v.max_up_delta ? Number(v.max_up_delta) : undefined,
    maxDownDelta: v.max_down_delta ? Number(v.max_down_delta) : undefined,
  };
}

function toPriceVersionRecord(
  pv: price_versions & { price_items?: { gemstone_option_id: string | null } },
): PriceVersionRecord {
  return {
    id: pv.id,
    priceItemId: pv.price_item_id,
    amount: Number(pv.amount),
    currency: pv.currency,
    versionNo: pv.version_no,
    status: pv.status,
    effectiveFrom: pv.effective_from ?? undefined,
    effectiveTo: pv.effective_to ?? undefined,
    sourceType: pv.source_type,
    marketSnapshotJson: pv.market_snapshot_json ?? undefined,
    reviewNote: pv.review_note ?? undefined,
    createdByUserId: pv.created_by_user_id ?? undefined,
    reviewedByUserId: pv.reviewed_by_user_id ?? undefined,
    reviewedAt: pv.reviewed_at ?? undefined,
    createdAt: pv.created_at,
    gemstoneOptionId: pv.price_items?.gemstone_option_id ?? undefined,
  };
}

function toPriceItemRecord(
  item: price_items & { price_versions?: price_versions | null },
): PriceItemRecord {
  return {
    id: item.id,
    priceType: item.price_type,
    templateVariantId: item.template_variant_id ?? undefined,
    gemstoneOptionId: item.gemstone_option_id ?? undefined,
    certifiedGemstoneId: item.certified_gemstone_id ?? undefined,
    personalizationPackage: item.personalization_package ?? undefined,
    code: item.code,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    activePriceVersion: item.price_versions
      ? toPriceVersionRecord(item.price_versions)
      : undefined,
  };
}

function toPricingRuleRecord(rule: pricing_rules): PricingRuleRecord {
  return {
    id: rule.id,
    ruleType: rule.rule_type,
    code: rule.code,
    name: rule.name,
    templateVariantId: rule.template_variant_id ?? undefined,
    resizeDirection: rule.resize_direction ?? undefined,
    deliveryZoneCode: rule.delivery_zone_code ?? undefined,
    cancellationStage: rule.cancellation_stage ?? undefined,
    redeliveryReason: rule.redelivery_reason ?? undefined,
    configJson: rule.config_json ?? undefined,
    versionNo: rule.version_no,
    status: rule.status,
    effectiveFrom: rule.effective_from ?? undefined,
    effectiveTo: rule.effective_to ?? undefined,
    createdByUserId: rule.created_by_user_id ?? undefined,
    approvedByUserId: rule.approved_by_user_id ?? undefined,
    approvedAt: rule.approved_at ?? undefined,
    createdAt: rule.created_at,
  };
}

function activeAt(at: Date) {
  return {
    status: 'ACTIVE',
    AND: [
      { OR: [{ effective_from: null }, { effective_from: { lte: at } }] },
      { OR: [{ effective_to: null }, { effective_to: { gt: at } }] },
    ],
  };
}

class PrismaPricingEstimateReader implements PricingEstimateReader {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async findVariantById(id: string): Promise<PricingVariantRecord | undefined> {
    const row = await this.db.template_variants.findFirst({
      where: {
        id,
        ring_templates: { status: 'ACTIVE' },
        materials: { status: 'ACTIVE' },
      },
    });
    return row ? toVariantRecord(row) : undefined;
  }

  async findActivePriceVersionByVariantId(
    variantId: string,
    at: Date,
  ): Promise<PriceVersionRecord | undefined> {
    const row = await this.db.price_versions.findFirst({
      where: {
        ...activeAt(at),
        currency: 'VND',
        price_items: {
          template_variant_id: variantId,
          price_type: 'RING_BLANK',
          status: 'ACTIVE',
        },
      },
      include: { price_items: true },
    });
    return row ? toPriceVersionRecord(row) : undefined;
  }

  async findActivePriceVersionsByGemstoneOptionIds(
    gemstoneOptionIds: readonly string[],
    at: Date,
  ): Promise<PriceVersionRecord[]> {
    if (gemstoneOptionIds.length === 0) {
      return [];
    }
    const rows = await this.db.price_versions.findMany({
      where: {
        ...activeAt(at),
        currency: 'VND',
        price_items: {
          gemstone_option_id: { in: [...gemstoneOptionIds] },
          price_type: 'GEMSTONE',
          status: 'ACTIVE',
        },
      },
      include: { price_items: true },
    });
    return rows.map((r) => toPriceVersionRecord(r));
  }

  async findActivePriceVersionByPersonalizationPackage(
    pkg: string,
    at: Date,
  ): Promise<PriceVersionRecord | undefined> {
    const row = await this.db.price_versions.findFirst({
      where: {
        ...activeAt(at),
        currency: 'VND',
        price_items: {
          personalization_package: pkg,
          price_type: 'PERSONALIZATION',
          status: 'ACTIVE',
        },
      },
      include: { price_items: true },
    });
    return row ? toPriceVersionRecord(row) : undefined;
  }

  async findActivePriceVersionByMaintenancePlan(
    planCode: string,
    at: Date,
  ): Promise<PriceVersionRecord | undefined> {
    const row = await this.db.price_versions.findFirst({
      where: {
        ...activeAt(at),
        currency: 'VND',
        price_items: {
          code: `PLAN_${planCode}`,
          price_type: 'MAINTENANCE_PLAN',
          status: 'ACTIVE',
        },
      },
      include: { price_items: true },
    });
    return row ? toPriceVersionRecord(row) : undefined;
  }

  async findActiveResizeRule(
    variantId: string,
    direction: 'UP' | 'DOWN',
    at: Date,
  ): Promise<PricingRuleRecord | undefined> {
    const row = await this.db.pricing_rules.findFirst({
      where: {
        rule_type: 'RESIZE_FEE',
        template_variant_id: variantId,
        resize_direction: direction,
        ...activeAt(at),
      },
    });
    return row ? toPricingRuleRecord(row) : undefined;
  }
}

export function estimatePriceInTransaction(
  tx: Prisma.TransactionClient,
  request: EstimatePriceRequest,
  at: Date,
) {
  const estimatePrice = new EstimatePriceUseCase(
    new PrismaPricingEstimateReader(tx),
  );
  return estimatePrice.snapshot(request, at);
}

@Injectable()
export class PrismaPricingRepository
  extends PrismaPricingEstimateReader
  implements PricingRepository
{
  constructor(private readonly prisma: PrismaService) {
    super(prisma);
  }

  async findPriceItems(filter: {
    priceType?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: PriceItemRecord[]; total: number }> {
    const where: Prisma.price_itemsWhereInput = {
      ...(filter.priceType ? { price_type: filter.priceType } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.price_items.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: { created_at: 'desc' },
        include: { price_versions: true },
      }),
      this.prisma.price_items.count({ where }),
    ]);

    return { items: items.map((i) => toPriceItemRecord(i)), total };
  }

  async findPriceItemById(id: string): Promise<PriceItemRecord | undefined> {
    const row = await this.prisma.price_items.findUnique({
      where: { id },
      include: { price_versions: true },
    });
    return row ? toPriceItemRecord(row) : undefined;
  }

  async findPriceItemByCode(
    code: string,
  ): Promise<PriceItemRecord | undefined> {
    const row = await this.prisma.price_items.findUnique({ where: { code } });
    return row ? toPriceItemRecord(row) : undefined;
  }

  async createPriceItem(data: CreatePriceItemInput): Promise<PriceItemRecord> {
    const row = await this.prisma.price_items.create({
      data: {
        price_type: data.priceType,
        code: data.code,
        template_variant_id: data.templateVariantId,
        gemstone_option_id: data.gemstoneOptionId,
        certified_gemstone_id: data.certifiedGemstoneId,
        personalization_package: data.personalizationPackage,
        status: data.status,
      },
    });
    return toPriceItemRecord(row);
  }

  async findPriceVersions(filter: {
    priceItemId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ versions: PriceVersionRecord[]; total: number }> {
    const where: Prisma.price_versionsWhereInput = {
      ...(filter.priceItemId ? { price_item_id: filter.priceItemId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    const [versions, total] = await Promise.all([
      this.prisma.price_versions.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: [{ created_at: 'desc' }, { version_no: 'desc' }],
      }),
      this.prisma.price_versions.count({ where }),
    ]);

    return {
      versions: versions.map((v) => toPriceVersionRecord(v)),
      total,
    };
  }

  async getLatestVersionNoForPriceItem(priceItemId: string): Promise<number> {
    const latest = await this.prisma.price_versions.findFirst({
      where: { price_item_id: priceItemId },
      orderBy: { version_no: 'desc' },
      select: { version_no: true },
    });
    return latest?.version_no ?? 0;
  }

  async createPriceVersion(
    data: CreatePriceVersionInput,
  ): Promise<PriceVersionRecord> {
    const row = await this.prisma.price_versions.create({
      data: {
        price_item_id: data.priceItemId,
        amount: data.amount,
        currency: data.currency,
        version_no: data.versionNo,
        status: data.status,
        effective_from: data.effectiveFrom,
        effective_to: data.effectiveTo,
        source_type: data.sourceType,
        market_snapshot_json: data.marketSnapshotJson as
          Prisma.InputJsonValue | undefined,
        created_by_user_id: data.createdByUserId,
      },
    });
    return toPriceVersionRecord(row);
  }

  async approvePriceVersion(
    versionId: string,
    actorId?: string,
    reviewNote?: string,
  ): Promise<PriceVersionRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const target = await tx.price_versions.findUnique({
        where: { id: versionId },
      });
      if (!target) {
        throw new Error('PRICE_VERSION_NOT_FOUND');
      }
      if (target.status !== 'DRAFT') {
        throw new Error('PRICE_VERSION_NOT_DRAFT');
      }

      await tx.price_versions.updateMany({
        where: { price_item_id: target.price_item_id, status: 'ACTIVE' },
        data: { status: 'SUPERSEDED' },
      });

      return tx.price_versions.update({
        where: { id: versionId },
        data: {
          status: 'ACTIVE',
          reviewed_by_user_id: actorId,
          reviewed_at: new Date(),
          review_note: reviewNote ?? target.review_note,
        },
      });
    });

    return toPriceVersionRecord(row);
  }

  async rejectPriceVersion(
    versionId: string,
    actorId?: string,
    reviewNote?: string,
  ): Promise<PriceVersionRecord> {
    const target = await this.prisma.price_versions.findUnique({
      where: { id: versionId },
    });
    if (!target) {
      throw new Error('PRICE_VERSION_NOT_FOUND');
    }
    if (target.status !== 'DRAFT') {
      throw new Error('PRICE_VERSION_NOT_DRAFT');
    }

    const row = await this.prisma.price_versions.update({
      where: { id: versionId },
      data: {
        status: 'REJECTED',
        reviewed_by_user_id: actorId,
        reviewed_at: new Date(),
        review_note: reviewNote ?? target.review_note,
      },
    });

    return toPriceVersionRecord(row);
  }

  async findPricingRules(filter: {
    ruleType?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ rules: PricingRuleRecord[]; total: number }> {
    const where: Prisma.pricing_rulesWhereInput = {
      ...(filter.ruleType ? { rule_type: filter.ruleType } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    const [rules, total] = await Promise.all([
      this.prisma.pricing_rules.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: [{ created_at: 'desc' }, { version_no: 'desc' }],
      }),
      this.prisma.pricing_rules.count({ where }),
    ]);

    return { rules: rules.map((r) => toPricingRuleRecord(r)), total };
  }

  async getLatestVersionNoForPricingRule(
    ruleType: string,
    code: string,
  ): Promise<number> {
    const latest = await this.prisma.pricing_rules.findFirst({
      where: { rule_type: ruleType, code },
      orderBy: { version_no: 'desc' },
      select: { version_no: true },
    });
    return latest?.version_no ?? 0;
  }

  async createPricingRule(
    data: CreatePricingRuleInput,
  ): Promise<PricingRuleRecord> {
    const row = await this.prisma.pricing_rules.create({
      data: {
        rule_type: data.ruleType,
        code: data.code,
        name: data.name,
        template_variant_id: data.templateVariantId,
        resize_direction: data.resizeDirection,
        delivery_zone_code: data.deliveryZoneCode,
        cancellation_stage: data.cancellationStage,
        redelivery_reason: data.redeliveryReason,
        config_json: data.configJson as Prisma.InputJsonValue,
        version_no: data.versionNo,
        status: data.status,
        effective_from: data.effectiveFrom,
        effective_to: data.effectiveTo,
        created_by_user_id: data.createdByUserId,
      },
    });
    return toPricingRuleRecord(row);
  }

  async activatePricingRule(
    ruleId: string,
    actorId?: string,
  ): Promise<PricingRuleRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const target = await tx.pricing_rules.findUnique({
        where: { id: ruleId },
      });
      if (!target) {
        throw new Error('PRICING_RULE_NOT_FOUND');
      }
      if (target.status !== 'DRAFT') {
        throw new Error('PRICING_RULE_NOT_DRAFT');
      }

      if (target.rule_type === 'DELIVERY_FEE' && target.delivery_zone_code) {
        await tx.pricing_rules.updateMany({
          where: {
            rule_type: 'DELIVERY_FEE',
            delivery_zone_code: target.delivery_zone_code,
            status: 'ACTIVE',
          },
          data: { status: 'ARCHIVED' },
        });
      } else if (
        target.rule_type === 'CANCELLATION_FEE' &&
        target.cancellation_stage
      ) {
        await tx.pricing_rules.updateMany({
          where: {
            rule_type: 'CANCELLATION_FEE',
            cancellation_stage: target.cancellation_stage,
            status: 'ACTIVE',
          },
          data: { status: 'ARCHIVED' },
        });
      } else if (
        target.rule_type === 'REDELIVERY_FEE' &&
        target.redelivery_reason
      ) {
        await tx.pricing_rules.updateMany({
          where: {
            rule_type: 'REDELIVERY_FEE',
            redelivery_reason: target.redelivery_reason,
            status: 'ACTIVE',
          },
          data: { status: 'ARCHIVED' },
        });
      } else if (
        target.rule_type === 'RESIZE_FEE' &&
        target.template_variant_id &&
        target.resize_direction
      ) {
        await tx.pricing_rules.updateMany({
          where: {
            rule_type: 'RESIZE_FEE',
            template_variant_id: target.template_variant_id,
            resize_direction: target.resize_direction,
            status: 'ACTIVE',
          },
          data: { status: 'ARCHIVED' },
        });
      }

      return tx.pricing_rules.update({
        where: { id: ruleId },
        data: {
          status: 'ACTIVE',
          approved_by_user_id: actorId,
          approved_at: new Date(),
        },
      });
    });

    return toPricingRuleRecord(row);
  }
}
