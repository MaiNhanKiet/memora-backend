import { Injectable } from '@nestjs/common';
import type {
  gemstone_options,
  gemstone_slots,
  materials,
  ring_templates,
  template_compatibilities,
  template_variants,
} from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
}

export interface FindTemplatesFilter {
  skip: number;
  take: number;
  gender?: string;
  search?: string;
  status?: string;
}

export interface FindGemstonesFilter {
  skip: number;
  take: number;
  stoneType?: string;
  shape?: string;
  isCertified?: boolean;
  status?: string;
}

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------

  async findManyTemplates(
    filter: FindTemplatesFilter,
  ): Promise<PaginatedResult<ring_templates>> {
    const where: Record<string, unknown> = {
      status: filter.status ?? 'ACTIVE',
    };

    if (filter.search && filter.search.trim() !== '') {
      where.OR = [
        { name: { contains: filter.search.trim(), mode: 'insensitive' } },
        { code: { contains: filter.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.ring_templates.findMany({
        where,
        skip: filter.skip,
        take: filter.take,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.ring_templates.count({ where }),
    ]);

    return { rows, total };
  }

  findTemplateById(id: string): Promise<ring_templates | null> {
    return this.prisma.ring_templates.findUnique({
      where: { id },
    });
  }

  // ---------------------------------------------------------------------------
  // Materials
  // ---------------------------------------------------------------------------

  findManyMaterials(status: string = 'ACTIVE'): Promise<materials[]> {
    return this.prisma.materials.findMany({
      where: { status },
      orderBy: { code: 'asc' },
    });
  }

  findMaterialById(id: string): Promise<materials | null> {
    return this.prisma.materials.findUnique({
      where: { id },
    });
  }

  // ---------------------------------------------------------------------------
  // Template Variants
  // ---------------------------------------------------------------------------

  findVariantsByTemplateId(
    templateId: string,
    materialId?: string,
    status: string = 'ACTIVE',
  ): Promise<template_variants[]> {
    const where: Record<string, unknown> = {
      ring_template_id: templateId,
      status,
    };
    if (materialId) {
      where.material_id = materialId;
    }

    return this.prisma.template_variants.findMany({
      where,
      orderBy: { standard_size: 'asc' },
    });
  }

  findVariantByTemplateMaterialAndSize(
    templateId: string,
    materialId: string,
    standardSize: number,
  ): Promise<template_variants | null> {
    return this.prisma.template_variants.findFirst({
      where: {
        ring_template_id: templateId,
        material_id: materialId,
        standard_size: standardSize,
        status: 'ACTIVE',
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Gemstone Options
  // ---------------------------------------------------------------------------

  async findManyGemstoneOptions(
    filter: FindGemstonesFilter,
  ): Promise<PaginatedResult<gemstone_options>> {
    const where: Record<string, unknown> = {
      status: filter.status ?? 'ACTIVE',
    };

    if (filter.stoneType) {
      where.stone_type = filter.stoneType;
    }
    if (filter.shape) {
      where.shape = filter.shape;
    }
    if (filter.isCertified !== undefined) {
      where.certified_required = filter.isCertified;
    }

    const [rows, total] = await Promise.all([
      this.prisma.gemstone_options.findMany({
        where,
        skip: filter.skip,
        take: filter.take,
        orderBy: { code: 'asc' },
      }),
      this.prisma.gemstone_options.count({ where }),
    ]);

    return { rows, total };
  }

  findGemstoneOptionById(id: string): Promise<gemstone_options | null> {
    return this.prisma.gemstone_options.findUnique({
      where: { id },
    });
  }

  // ---------------------------------------------------------------------------
  // Gemstone Slots
  // ---------------------------------------------------------------------------

  findGemstoneSlotsByTemplateId(
    templateId: string,
  ): Promise<
    (gemstone_slots & { gemstone_groups: { is_required: boolean } })[]
  > {
    return this.prisma.gemstone_slots.findMany({
      where: {
        gemstone_groups: {
          ring_template_id: templateId,
        },
      },
      include: {
        gemstone_groups: {
          select: {
            is_required: true,
          },
        },
      },
      orderBy: { slot_index: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Compatibilities
  // ---------------------------------------------------------------------------

  findCompatibilities(
    variantId: string,
    gemstoneOptionIds: string[],
  ): Promise<template_compatibilities[]> {
    if (gemstoneOptionIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.template_compatibilities.findMany({
      where: {
        template_variant_id: variantId,
        gemstone_option_id: { in: gemstoneOptionIds },
      },
    });
  }
}
