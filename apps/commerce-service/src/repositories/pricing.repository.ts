import { Injectable } from '@nestjs/common';
import type {
  price_items,
  price_versions,
  pricing_rules,
  template_variants,
} from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

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
}
