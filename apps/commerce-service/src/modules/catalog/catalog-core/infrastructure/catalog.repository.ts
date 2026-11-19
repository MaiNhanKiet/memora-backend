import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import type {
  gemstone_options,
  gemstone_slots,
  materials,
  ring_templates,
  template_compatibilities,
  template_variants,
} from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';

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
        orderBy: { code: 'asc' },
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

  findTemplateByCode(code: string): Promise<ring_templates | null> {
    return this.prisma.ring_templates.findUnique({
      where: { code },
    });
  }

  createTemplate(
    data: Prisma.ring_templatesCreateInput,
  ): Promise<ring_templates> {
    return this.prisma.ring_templates.create({ data });
  }

  updateTemplate(
    id: string,
    data: Prisma.ring_templatesUpdateInput,
  ): Promise<ring_templates> {
    return this.prisma.ring_templates.update({
      where: { id },
      data,
    });
  }

  countVariantsForTemplate(templateId: string): Promise<number> {
    return this.prisma.template_variants.count({
      where: { ring_template_id: templateId },
    });
  }

  // ---------------------------------------------------------------------------
  // Materials
  // ---------------------------------------------------------------------------

  findManyMaterials(status: string = 'ACTIVE'): Promise<materials[]> {
    return this.prisma.materials.findMany({
      where: status ? { status } : undefined,
      orderBy: { code: 'asc' },
    });
  }

  findMaterials(status?: string): Promise<materials[]> {
    return this.findManyMaterials(status ?? 'ACTIVE');
  }

  findMaterialById(id: string): Promise<materials | null> {
    return this.prisma.materials.findUnique({
      where: { id },
    });
  }

  findMaterialByCode(code: string): Promise<materials | null> {
    return this.prisma.materials.findUnique({
      where: { code },
    });
  }

  createMaterial(data: Prisma.materialsCreateInput): Promise<materials> {
    return this.prisma.materials.create({ data });
  }

  updateMaterial(
    id: string,
    data: Prisma.materialsUpdateInput,
  ): Promise<materials> {
    return this.prisma.materials.update({
      where: { id },
      data,
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
    return this.prisma.template_variants.findMany({
      where: {
        ring_template_id: templateId,
        ...(materialId ? { material_id: materialId } : {}),
        status,
      },
      orderBy: { standard_size: 'asc' },
    });
  }

  findTemplateVariants(
    templateId: string,
    materialId?: string,
  ): Promise<template_variants[]> {
    return this.findVariantsByTemplateId(templateId, materialId);
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

  findTemplateVariantById(id: string): Promise<template_variants | null> {
    return this.prisma.template_variants.findUnique({
      where: { id },
    });
  }

  createVariant(
    data: Prisma.template_variantsCreateInput,
  ): Promise<template_variants> {
    return this.prisma.template_variants.create({ data });
  }

  updateVariant(
    id: string,
    data: Prisma.template_variantsUpdateInput,
  ): Promise<template_variants> {
    return this.prisma.template_variants.update({
      where: { id },
      data,
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

  findGemstoneOptions(
    filter: FindGemstonesFilter,
  ): Promise<PaginatedResult<gemstone_options>> {
    return this.findManyGemstoneOptions(filter);
  }

  findGemstoneOptionById(id: string): Promise<gemstone_options | null> {
    return this.prisma.gemstone_options.findUnique({
      where: { id },
    });
  }

  findGemstoneOptionByCode(code: string): Promise<gemstone_options | null> {
    return this.prisma.gemstone_options.findUnique({
      where: { code },
    });
  }

  createGemstoneOption(
    data: Prisma.gemstone_optionsCreateInput,
  ): Promise<gemstone_options> {
    return this.prisma.gemstone_options.create({ data });
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

  async updateCompatibilities(
    templateVariantId: string,
    gemstoneGroupId: string,
    gemstoneOptionIds: string[],
  ): Promise<string[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.template_compatibilities.deleteMany({
        where: {
          template_variant_id: templateVariantId,
          gemstone_group_id: gemstoneGroupId,
        },
      });

      if (gemstoneOptionIds.length > 0) {
        await tx.template_compatibilities.createMany({
          data: gemstoneOptionIds.map((optId) => ({
            template_variant_id: templateVariantId,
            gemstone_group_id: gemstoneGroupId,
            gemstone_option_id: optId,
          })),
        });
      }

      return gemstoneOptionIds;
    });
  }

  // ---------------------------------------------------------------------------
  // Resize Policies
  // ---------------------------------------------------------------------------

  async findResizePolicies(filter: {
    templateVariantId?: string;
    templateId?: string;
  }) {
    return this.prisma.template_variants.findMany({
      where: {
        ...(filter.templateVariantId ? { id: filter.templateVariantId } : {}),
        ...(filter.templateId ? { ring_template_id: filter.templateId } : {}),
      },
      include: {
        ring_templates: { select: { id: true, name: true, code: true } },
        materials: { select: { id: true, name: true } },
      },
      orderBy: { standard_size: 'asc' },
    });
  }
}
