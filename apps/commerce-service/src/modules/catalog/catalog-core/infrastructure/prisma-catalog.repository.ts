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
import type {
  CatalogRepository,
  CreateGemstoneOptionInput,
  CreateMaterialInput,
  CreateTemplateInput,
  CreateVariantInput,
  FindGemstonesFilter,
  FindTemplatesFilter,
  GemstoneOptionRecord,
  GemstoneSlotRecord,
  MaterialRecord,
  PaginatedResult,
  ResizePolicyVariantRecord,
  RingTemplateRecord,
  TemplateCompatibilityRecord,
  TemplateVariantRecord,
  UpdateMaterialInput,
  UpdateTemplateInput,
  UpdateVariantInput,
} from '../application/catalog.repository';

function toTemplateRecord(row: ring_templates): RingTemplateRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    glbAssetKey: row.glb_asset_key,
    stoneLayout: row.stone_layout,
    designSupportedPersonalizationPackages:
      row.design_supported_personalization_packages ?? [],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMaterialRecord(row: materials): MaterialRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    materialFamily: row.material_family ?? undefined,
    purityPercent: row.purity_percent ? Number(row.purity_percent) : undefined,
    color: row.color ?? undefined,
    status: row.status,
  };
}

function toVariantRecord(row: template_variants): TemplateVariantRecord {
  return {
    id: row.id,
    ringTemplateId: row.ring_template_id,
    materialId: row.material_id,
    standardSize: Number(row.standard_size),
    maxUpDelta: row.max_up_delta ? Number(row.max_up_delta) : undefined,
    maxDownDelta: row.max_down_delta ? Number(row.max_down_delta) : undefined,
    resizeMethod: row.resize_method ?? undefined,
    addedMetalAllowed: row.added_metal_allowed,
    localWallThicknessMm: Number(row.local_wall_thickness_mm),
    minRemainingWallThicknessMm: Number(row.min_remaining_wall_thickness_mm),
    maxSafeEngravingDepthMm: Number(row.max_safe_engraving_depth_mm),
    status: row.status,
  };
}

function toGemstoneOptionRecord(row: gemstone_options): GemstoneOptionRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    stoneType: row.stone_type,
    shape: row.shape,
    lengthMm: Number(row.length_mm),
    widthMm: Number(row.width_mm),
    colorGrade: row.color_grade ?? undefined,
    clarityGrade: row.clarity_grade ?? undefined,
    certifiedRequired: row.certified_required,
    status: row.status,
  };
}

function toGemstoneSlotRecord(
  row: gemstone_slots & { gemstone_groups?: { is_required: boolean } | null },
): GemstoneSlotRecord {
  return {
    id: row.id,
    slotIndex: row.slot_index,
    gemstoneGroupId: row.gemstone_group_id,
    glbNodeName: row.glb_node_name,
    isRequired: row.gemstone_groups?.is_required ?? false,
  };
}

function toCompatibilityRecord(
  row: template_compatibilities,
): TemplateCompatibilityRecord {
  return {
    templateVariantId: row.template_variant_id,
    gemstoneGroupId: row.gemstone_group_id,
    gemstoneOptionId: row.gemstone_option_id,
  };
}

@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyTemplates(
    filter: FindTemplatesFilter,
  ): Promise<PaginatedResult<RingTemplateRecord>> {
    const where: Prisma.ring_templatesWhereInput = {
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

    return { rows: rows.map((r) => toTemplateRecord(r)), total };
  }

  async findTemplateById(id: string): Promise<RingTemplateRecord | null> {
    const row = await this.prisma.ring_templates.findUnique({ where: { id } });
    return row ? toTemplateRecord(row) : null;
  }

  async findTemplateByCode(code: string): Promise<RingTemplateRecord | null> {
    const row = await this.prisma.ring_templates.findUnique({
      where: { code },
    });
    return row ? toTemplateRecord(row) : null;
  }

  async createTemplate(data: CreateTemplateInput): Promise<RingTemplateRecord> {
    const row = await this.prisma.ring_templates.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        glb_asset_key: data.glbAssetKey,
        stone_layout: data.stoneLayout,
        design_supported_personalization_packages:
          data.designSupportedPersonalizationPackages,
        status: data.status,
        created_by_user_id: data.createdByUserId,
      },
    });
    return toTemplateRecord(row);
  }

  async updateTemplate(
    id: string,
    data: UpdateTemplateInput,
  ): Promise<RingTemplateRecord> {
    const updateData: Prisma.ring_templatesUpdateInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
      ...(data.glbAssetKey !== undefined
        ? { glb_asset_key: data.glbAssetKey }
        : {}),
      ...(data.stoneLayout !== undefined
        ? { stone_layout: data.stoneLayout }
        : {}),
      ...(data.designSupportedPersonalizationPackages !== undefined
        ? {
            design_supported_personalization_packages:
              data.designSupportedPersonalizationPackages,
          }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    };

    const row = await this.prisma.ring_templates.update({
      where: { id },
      data: updateData,
    });
    return toTemplateRecord(row);
  }

  countVariantsForTemplate(templateId: string): Promise<number> {
    return this.prisma.template_variants.count({
      where: { ring_template_id: templateId },
    });
  }

  async findManyMaterials(status = 'ACTIVE'): Promise<MaterialRecord[]> {
    const rows = await this.prisma.materials.findMany({
      where: status ? { status } : undefined,
      orderBy: { code: 'asc' },
    });
    return rows.map((r) => toMaterialRecord(r));
  }

  async findMaterialById(id: string): Promise<MaterialRecord | null> {
    const row = await this.prisma.materials.findUnique({ where: { id } });
    return row ? toMaterialRecord(row) : null;
  }

  async findMaterialByCode(code: string): Promise<MaterialRecord | null> {
    const row = await this.prisma.materials.findUnique({ where: { code } });
    return row ? toMaterialRecord(row) : null;
  }

  async createMaterial(data: CreateMaterialInput): Promise<MaterialRecord> {
    const row = await this.prisma.materials.create({
      data: {
        code: data.code,
        name: data.name,
        material_family: data.materialFamily,
        purity_percent:
          data.purityPercent !== undefined
            ? new Prisma.Decimal(data.purityPercent)
            : undefined,
        color: data.color,
        status: data.status,
      },
    });
    return toMaterialRecord(row);
  }

  async updateMaterial(
    id: string,
    data: UpdateMaterialInput,
  ): Promise<MaterialRecord> {
    const updateData: Prisma.materialsUpdateInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.materialFamily !== undefined
        ? { material_family: data.materialFamily }
        : {}),
      ...(data.purityPercent !== undefined
        ? { purity_percent: new Prisma.Decimal(data.purityPercent) }
        : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    };

    const row = await this.prisma.materials.update({
      where: { id },
      data: updateData,
    });
    return toMaterialRecord(row);
  }

  async findVariantsByTemplateId(
    templateId: string,
    materialId?: string,
    status = 'ACTIVE',
  ): Promise<TemplateVariantRecord[]> {
    const rows = await this.prisma.template_variants.findMany({
      where: {
        ring_template_id: templateId,
        ...(materialId ? { material_id: materialId } : {}),
        status,
      },
      orderBy: { standard_size: 'asc' },
    });
    return rows.map((r) => toVariantRecord(r));
  }

  async findVariantByTemplateMaterialAndSize(
    templateId: string,
    materialId: string,
    standardSize: number,
  ): Promise<TemplateVariantRecord | null> {
    const row = await this.prisma.template_variants.findFirst({
      where: {
        ring_template_id: templateId,
        material_id: materialId,
        standard_size: standardSize,
        status: 'ACTIVE',
      },
    });
    return row ? toVariantRecord(row) : null;
  }

  async findTemplateVariantById(
    id: string,
  ): Promise<TemplateVariantRecord | null> {
    const row = await this.prisma.template_variants.findUnique({
      where: { id },
    });
    return row ? toVariantRecord(row) : null;
  }

  async createVariant(
    data: CreateVariantInput,
  ): Promise<TemplateVariantRecord> {
    const row = await this.prisma.template_variants.create({
      data: {
        ring_templates: { connect: { id: data.ringTemplateId } },
        materials: { connect: { id: data.materialId } },
        standard_size: new Prisma.Decimal(data.standardSize),
        max_up_delta:
          data.maxUpDelta !== undefined
            ? new Prisma.Decimal(data.maxUpDelta)
            : undefined,
        max_down_delta:
          data.maxDownDelta !== undefined
            ? new Prisma.Decimal(data.maxDownDelta)
            : undefined,
        resize_method: data.resizeMethod,
        added_metal_allowed: data.addedMetalAllowed,
        local_wall_thickness_mm: new Prisma.Decimal(data.localWallThicknessMm),
        min_remaining_wall_thickness_mm: new Prisma.Decimal(
          data.minRemainingWallThicknessMm,
        ),
        max_safe_engraving_depth_mm: new Prisma.Decimal(
          data.maxSafeEngravingDepthMm,
        ),
        status: data.status,
        created_by_user_id: data.createdByUserId,
      },
    });
    return toVariantRecord(row);
  }

  async updateVariant(
    id: string,
    data: UpdateVariantInput,
  ): Promise<TemplateVariantRecord> {
    const updateData: Prisma.template_variantsUpdateInput = {
      ...(data.standardSize !== undefined
        ? { standard_size: new Prisma.Decimal(data.standardSize) }
        : {}),
      ...(data.maxUpDelta !== undefined
        ? { max_up_delta: new Prisma.Decimal(data.maxUpDelta) }
        : {}),
      ...(data.maxDownDelta !== undefined
        ? { max_down_delta: new Prisma.Decimal(data.maxDownDelta) }
        : {}),
      ...(data.resizeMethod !== undefined
        ? { resize_method: data.resizeMethod }
        : {}),
      ...(data.addedMetalAllowed !== undefined
        ? { added_metal_allowed: data.addedMetalAllowed }
        : {}),
      ...(data.localWallThicknessMm !== undefined
        ? {
            local_wall_thickness_mm: new Prisma.Decimal(
              data.localWallThicknessMm,
            ),
          }
        : {}),
      ...(data.minRemainingWallThicknessMm !== undefined
        ? {
            min_remaining_wall_thickness_mm: new Prisma.Decimal(
              data.minRemainingWallThicknessMm,
            ),
          }
        : {}),
      ...(data.maxSafeEngravingDepthMm !== undefined
        ? {
            max_safe_engraving_depth_mm: new Prisma.Decimal(
              data.maxSafeEngravingDepthMm,
            ),
          }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    };

    const row = await this.prisma.template_variants.update({
      where: { id },
      data: updateData,
    });
    return toVariantRecord(row);
  }

  async findManyGemstoneOptions(
    filter: FindGemstonesFilter,
  ): Promise<PaginatedResult<GemstoneOptionRecord>> {
    const where: Prisma.gemstone_optionsWhereInput = {
      status: filter.status ?? 'ACTIVE',
      ...(filter.stoneType ? { stone_type: filter.stoneType } : {}),
      ...(filter.shape ? { shape: filter.shape } : {}),
      ...(filter.isCertified !== undefined
        ? { certified_required: filter.isCertified }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.gemstone_options.findMany({
        where,
        skip: filter.skip,
        take: filter.take,
        orderBy: { code: 'asc' },
      }),
      this.prisma.gemstone_options.count({ where }),
    ]);

    return { rows: rows.map((r) => toGemstoneOptionRecord(r)), total };
  }

  async findGemstoneOptionByCode(
    code: string,
  ): Promise<GemstoneOptionRecord | null> {
    const row = await this.prisma.gemstone_options.findUnique({
      where: { code },
    });
    return row ? toGemstoneOptionRecord(row) : null;
  }

  async createGemstoneOption(
    data: CreateGemstoneOptionInput,
  ): Promise<GemstoneOptionRecord> {
    const row = await this.prisma.gemstone_options.create({
      data: {
        code: data.code,
        name: data.name,
        stone_type: data.stoneType,
        shape: data.shape,
        length_mm: new Prisma.Decimal(data.lengthMm),
        width_mm: new Prisma.Decimal(data.widthMm),
        color_grade: data.colorGrade,
        clarity_grade: data.clarityGrade,
        certified_required: data.certifiedRequired,
        status: data.status,
      },
    });
    return toGemstoneOptionRecord(row);
  }

  async findGemstoneSlotsByTemplateId(
    templateId: string,
  ): Promise<GemstoneSlotRecord[]> {
    const rows = await this.prisma.gemstone_slots.findMany({
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
    return rows.map((r) => toGemstoneSlotRecord(r));
  }

  async findCompatibilities(
    variantId: string,
    gemstoneOptionIds: string[],
  ): Promise<TemplateCompatibilityRecord[]> {
    if (gemstoneOptionIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.template_compatibilities.findMany({
      where: {
        template_variant_id: variantId,
        gemstone_option_id: { in: gemstoneOptionIds },
      },
    });
    return rows.map((r) => toCompatibilityRecord(r));
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

  async findResizePolicies(filter: {
    templateVariantId?: string;
    templateId?: string;
  }): Promise<ResizePolicyVariantRecord[]> {
    const rows = await this.prisma.template_variants.findMany({
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

    return rows.map((r) => ({
      ...toVariantRecord(r),
      templateName: r.ring_templates.name,
      materialName: r.materials.name,
    }));
  }
}
