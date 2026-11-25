import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import type {
  price_items,
  price_versions,
  pricing_rules,
  template_variants,
} from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';

export interface PriceItemWithActiveVersion extends price_items {
  price_versions?: price_versions | null;
}

@Injectable()
export class PricingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findVariantById(id: string): Promise<template_variants | null> {
    return this.prisma.template_variants.findUnique({
      where: { id },
    });
  }

  findActivePriceVersionByVariantId(
    variantId: string,
  ): Promise<(price_versions & { price_items: price_items }) | null> {
    return this.prisma.price_versions.findFirst({
      where: {
        status: 'ACTIVE',
        price_items: {
          template_variant_id: variantId,
          price_type: 'RING_BLANK',
          status: 'ACTIVE',
        },
      },
      include: {
        price_items: true,
      },
    });
  }

  findActivePriceVersionsByGemstoneOptionIds(
    gemstoneOptionIds: string[],
  ): Promise<(price_versions & { price_items: price_items })[]> {
    if (gemstoneOptionIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.price_versions.findMany({
      where: {
        status: 'ACTIVE',
        price_items: {
          gemstone_option_id: { in: gemstoneOptionIds },
          price_type: 'GEMSTONE',
          status: 'ACTIVE',
        },
      },
      include: {
        price_items: true,
      },
    });
  }

  findActivePriceVersionByPersonalizationPackage(
    pkg: string,
  ): Promise<(price_versions & { price_items: price_items }) | null> {
    return this.prisma.price_versions.findFirst({
      where: {
        status: 'ACTIVE',
        price_items: {
          personalization_package: pkg,
          price_type: 'PERSONALIZATION',
          status: 'ACTIVE',
        },
      },
      include: {
        price_items: true,
      },
    });
  }

  findActivePriceVersionByMaintenancePlan(
    planCode: string,
  ): Promise<(price_versions & { price_items: price_items }) | null> {
    return this.prisma.price_versions.findFirst({
      where: {
        status: 'ACTIVE',
        price_items: {
          code: `PLAN_${planCode}`,
          price_type: 'MAINTENANCE_PLAN',
          status: 'ACTIVE',
        },
      },
      include: {
        price_items: true,
      },
    });
  }

  findActiveResizeRule(
    variantId: string,
    direction: 'UP' | 'DOWN',
  ): Promise<pricing_rules | null> {
    return this.prisma.pricing_rules.findFirst({
      where: {
        rule_type: 'RESIZE_FEE',
        template_variant_id: variantId,
        resize_direction: direction,
        status: 'ACTIVE',
      },
    });
  }

  // --- PRICI-002..010: Admin Pricing Repository Methods ---

  async findPriceItems(filter: {
    priceType?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: PriceItemWithActiveVersion[]; total: number }> {
    const where: Prisma.price_itemsWhereInput = {};
    if (filter.priceType) {
      where.price_type = filter.priceType;
    }
    if (filter.status) {
      where.status = filter.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.price_items.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: { created_at: 'desc' },
        include: {
          price_versions: true,
        },
      }),
      this.prisma.price_items.count({ where }),
    ]);

    return { items, total };
  }

  findPriceItemById(id: string): Promise<PriceItemWithActiveVersion | null> {
    return this.prisma.price_items.findUnique({
      where: { id },
      include: {
        price_versions: true,
      },
    });
  }

  findPriceItemByCode(code: string): Promise<price_items | null> {
    return this.prisma.price_items.findUnique({
      where: { code },
    });
  }

  createPriceItem(
    data: Prisma.price_itemsUncheckedCreateInput,
  ): Promise<price_items> {
    return this.prisma.price_items.create({
      data,
    });
  }

  async findPriceVersions(filter: {
    priceItemId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ versions: price_versions[]; total: number }> {
    const where: Prisma.price_versionsWhereInput = {};
    if (filter.priceItemId) {
      where.price_item_id = filter.priceItemId;
    }
    if (filter.status) {
      where.status = filter.status;
    }

    const [versions, total] = await Promise.all([
      this.prisma.price_versions.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: [{ created_at: 'desc' }, { version_no: 'desc' }],
      }),
      this.prisma.price_versions.count({ where }),
    ]);

    return { versions, total };
  }

  findPriceVersionById(id: string): Promise<price_versions | null> {
    return this.prisma.price_versions.findUnique({
      where: { id },
    });
  }

  async getLatestVersionNoForPriceItem(priceItemId: string): Promise<number> {
    const latest = await this.prisma.price_versions.findFirst({
      where: { price_item_id: priceItemId },
      orderBy: { version_no: 'desc' },
      select: { version_no: true },
    });
    return latest?.version_no ?? 0;
  }

  createPriceVersion(data: {
    price_item_id: string;
    amount: number;
    currency: string;
    version_no: number;
    status: string;
    effective_from?: Date;
    effective_to?: Date;
    source_type: string;
    market_snapshot_json?: Record<string, unknown>;
    created_by_user_id?: string;
  }): Promise<price_versions> {
    return this.prisma.price_versions.create({
      data: {
        ...data,
        market_snapshot_json: data.market_snapshot_json as
          Prisma.InputJsonValue | undefined,
      },
    });
  }

  async approvePriceVersion(
    versionId: string,
    actorId?: string,
    reviewNote?: string,
  ): Promise<price_versions> {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.price_versions.findUnique({
        where: { id: versionId },
      });
      if (!target) {
        throw new Error(`PRICE_VERSION_NOT_FOUND`);
      }
      if (target.status !== 'DRAFT') {
        throw new Error(`PRICE_VERSION_NOT_DRAFT`);
      }

      // Supersede current ACTIVE version of this price_item_id if exists
      await tx.price_versions.updateMany({
        where: {
          price_item_id: target.price_item_id,
          status: 'ACTIVE',
        },
        data: {
          status: 'SUPERSEDED',
        },
      });

      // Update target to ACTIVE
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
  }

  async rejectPriceVersion(
    versionId: string,
    actorId?: string,
    reviewNote?: string,
  ): Promise<price_versions> {
    const target = await this.prisma.price_versions.findUnique({
      where: { id: versionId },
    });
    if (!target) {
      throw new Error(`PRICE_VERSION_NOT_FOUND`);
    }
    if (target.status !== 'DRAFT') {
      throw new Error(`PRICE_VERSION_NOT_DRAFT`);
    }

    return this.prisma.price_versions.update({
      where: { id: versionId },
      data: {
        status: 'REJECTED',
        reviewed_by_user_id: actorId,
        reviewed_at: new Date(),
        review_note: reviewNote ?? target.review_note,
      },
    });
  }

  async findPricingRules(filter: {
    ruleType?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ rules: pricing_rules[]; total: number }> {
    const where: Prisma.pricing_rulesWhereInput = {};
    if (filter.ruleType) {
      where.rule_type = filter.ruleType;
    }
    if (filter.status) {
      where.status = filter.status;
    }

    const [rules, total] = await Promise.all([
      this.prisma.pricing_rules.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: [{ created_at: 'desc' }, { version_no: 'desc' }],
      }),
      this.prisma.pricing_rules.count({ where }),
    ]);

    return { rules, total };
  }

  findPricingRuleById(id: string): Promise<pricing_rules | null> {
    return this.prisma.pricing_rules.findUnique({
      where: { id },
    });
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

  createPricingRule(data: {
    rule_type: string;
    code: string;
    name: string;
    template_variant_id?: string;
    resize_direction?: string;
    delivery_zone_code?: string;
    cancellation_stage?: string;
    redelivery_reason?: string;
    config_json: Record<string, unknown>;
    version_no: number;
    status: string;
    effective_from?: Date;
    effective_to?: Date;
    created_by_user_id?: string;
  }): Promise<pricing_rules> {
    return this.prisma.pricing_rules.create({
      data: {
        ...data,
        config_json: data.config_json as Prisma.InputJsonValue,
      },
    });
  }

  async activatePricingRule(
    ruleId: string,
    actorId?: string,
  ): Promise<pricing_rules> {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.pricing_rules.findUnique({
        where: { id: ruleId },
      });
      if (!target) {
        throw new Error(`PRICING_RULE_NOT_FOUND`);
      }
      if (target.status !== 'DRAFT') {
        throw new Error(`PRICING_RULE_NOT_DRAFT`);
      }

      // Archive conflicting ACTIVE rule based on partial unique constraints
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
  }
}
