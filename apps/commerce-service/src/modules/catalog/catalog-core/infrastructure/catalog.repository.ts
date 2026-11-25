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

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  glb_asset_key?: string;
  stone_layout?: string;
  design_supported_personalization_packages?: string[];
  status?: string;
}

export interface CreateMaterialInput {
  code: string;
  name: string;
  material_family?: string;
  purity_percent?: number;
  color?: string;
  status: string;
}

export interface UpdateMaterialInput {
  name?: string;
  material_family?: string;
  purity_percent?: number;
  color?: string;
  status?: string;
}

export interface CreateVariantInput {
  ring_template_id: string;
  material_id: string;
  standard_size: number;
  max_up_delta?: number;
  max_down_delta?: number;
  resize_method?: string;
  added_metal_allowed: boolean;
  local_wall_thickness_mm: number;
  min_remaining_wall_thickness_mm: number;
  max_safe_engraving_depth_mm: number;
  status: string;
  created_by_user_id?: string;
}

export interface UpdateVariantInput {
  standard_size?: number;
  max_up_delta?: number;
  max_down_delta?: number;
  resize_method?: string;
  added_metal_allowed?: boolean;
  local_wall_thickness_mm?: number;
  min_remaining_wall_thickness_mm?: number;
  max_safe_engraving_depth_mm?: number;
  status?: string;
}

export interface CreateGemstoneOptionInput {
  code: string;
  name: string;
  stone_type: string;
  shape: string;
  length_mm: number;
  width_mm: number;
  color_grade?: string;
  clarity_grade?: string;
  certified_required: boolean;
  status: string;
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
    data: UpdateTemplateInput,
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

  createMaterial(data: CreateMaterialInput): Promise<materials> {
    return this.prisma.materials.create({
      data: {
        code: data.code,
        name: data.name,
        material_family: data.material_family,
        purity_percent:
          data.purity_percent !== undefined
            ? new Prisma.Decimal(data.purity_percent)
            : undefined,
        color: data.color,
        status: data.status,
      },
    });
  }

  updateMaterial(id: string, data: UpdateMaterialInput): Promise<materials> {
    const updateData: Prisma.materialsUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.material_family !== undefined) {
      updateData.material_family = data.material_family;
    }
    if (data.purity_percent !== undefined) {
      updateData.purity_percent = new Prisma.Decimal(data.purity_percent);
    }
    if (data.color !== undefined) updateData.color = data.color;
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.materials.update({
      where: { id },
      data: updateData,
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

  createVariant(data: CreateVariantInput): Promise<template_variants> {
    return this.prisma.template_variants.create({
      data: {
        ring_templates: { connect: { id: data.ring_template_id } },
        materials: { connect: { id: data.material_id } },
        standard_size: new Prisma.Decimal(data.standard_size),
        max_up_delta:
          data.max_up_delta !== undefined
            ? new Prisma.Decimal(data.max_up_delta)
            : undefined,
        max_down_delta:
          data.max_down_delta !== undefined
            ? new Prisma.Decimal(data.max_down_delta)
            : undefined,
        resize_method: data.resize_method,
        added_metal_allowed: data.added_metal_allowed,
        local_wall_thickness_mm: new Prisma.Decimal(
          data.local_wall_thickness_mm,
        ),
        min_remaining_wall_thickness_mm: new Prisma.Decimal(
          data.min_remaining_wall_thickness_mm,
        ),
        max_safe_engraving_depth_mm: new Prisma.Decimal(
          data.max_safe_engraving_depth_mm,
        ),
        status: data.status,
        created_by_user_id: data.created_by_user_id,
      },
    });
  }

  updateVariant(
    id: string,
    data: UpdateVariantInput,
  ): Promise<template_variants> {
    const updateData: Prisma.template_variantsUpdateInput = {};
    if (data.standard_size !== undefined) {
      updateData.standard_size = new Prisma.Decimal(data.standard_size);
    }
    if (data.max_up_delta !== undefined) {
      updateData.max_up_delta = new Prisma.Decimal(data.max_up_delta);
    }
    if (data.max_down_delta !== undefined) {
      updateData.max_down_delta = new Prisma.Decimal(data.max_down_delta);
    }
    if (data.resize_method !== undefined) {
      updateData.resize_method = data.resize_method;
    }
    if (data.added_metal_allowed !== undefined) {
      updateData.added_metal_allowed = data.added_metal_allowed;
    }
    if (data.local_wall_thickness_mm !== undefined) {
      updateData.local_wall_thickness_mm = new Prisma.Decimal(
        data.local_wall_thickness_mm,
      );
    }
    if (data.min_remaining_wall_thickness_mm !== undefined) {
      updateData.min_remaining_wall_thickness_mm = new Prisma.Decimal(
        data.min_remaining_wall_thickness_mm,
      );
    }
    if (data.max_safe_engraving_depth_mm !== undefined) {
      updateData.max_safe_engraving_depth_mm = new Prisma.Decimal(
        data.max_safe_engraving_depth_mm,
      );
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    return this.prisma.template_variants.update({
      where: { id },
      data: updateData,
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
    data: CreateGemstoneOptionInput,
  ): Promise<gemstone_options> {
    return this.prisma.gemstone_options.create({
      data: {
        code: data.code,
        name: data.name,
        stone_type: data.stone_type,
        shape: data.shape,
        length_mm: new Prisma.Decimal(data.length_mm),
        width_mm: new Prisma.Decimal(data.width_mm),
        color_grade: data.color_grade,
        clarity_grade: data.clarity_grade,
        certified_required: data.certified_required,
        status: data.status,
      },
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
