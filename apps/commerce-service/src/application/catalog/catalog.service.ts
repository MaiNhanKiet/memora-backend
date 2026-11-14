import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ArchiveTemplateRequest,
  CreateGemstoneOptionRequest,
  CreateMaterialRequest,
  CreateTemplateRequest,
  CreateVariantRequest,
  GemstoneOptionResponse,
  GemstoneSlotResponse,
  GetResizePoliciesRequest,
  GetTemplate3DAssetsRequest,
  GetTemplateByIdRequest,
  GetTemplateConfigurationOptionsRequest,
  ListGemstoneOptionsRequest,
  ListGemstoneOptionsResponse,
  ListGemstoneSlotsRequest,
  ListGemstoneSlotsResponse,
  ListMaterialsRequest,
  ListMaterialsResponse,
  ListTemplatesRequest,
  ListTemplatesResponse,
  ListTemplateVariantsRequest,
  ListTemplateVariantsResponse,
  MaterialResponse,
  PublishTemplateRequest,
  ResizePoliciesResponse,
  ResizePolicyItem,
  Template3DAssetsResponse,
  TemplateConfigurationOptionsResponse,
  TemplateResponse,
  TemplateVariantResponse,
  UpdateCompatibilitiesRequest,
  UpdateCompatibilitiesResponse,
  UpdateMaterialRequest,
  UpdateResizePoliciesRequest,
  UpdateTemplateRequest,
  UpdateVariantRequest,
  ValidateConfigurationRequest,
  ValidateConfigurationResponse,
  ValidationError,
} from '@app/contracts';
import { CatalogRepository } from '../../repositories/catalog.repository';
import { CatalogMapper } from './catalog.mapper';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class CatalogService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly mapper: CatalogMapper,
  ) {}

  // ---------------------------------------------------------------------------
  // [CATAL-001] List Templates
  // ---------------------------------------------------------------------------
  async listTemplates(
    request: ListTemplatesRequest,
  ): Promise<ListTemplatesResponse> {
    const page = Math.max(1, request.pagination?.page ?? 1);
    const limit = Math.min(100, Math.max(1, request.pagination?.limit ?? 20));
    const skip = (page - 1) * limit;

    const { rows, total } = await this.repository.findManyTemplates({
      skip,
      take: limit,
      gender: request.gender,
      search: request.search,
      status: 'ACTIVE',
    });

    const data = rows.map((item) => this.mapper.toTemplateResponse(item));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-002] Get Template By Id
  // ---------------------------------------------------------------------------
  async getTemplateById(
    request: GetTemplateByIdRequest,
  ): Promise<TemplateResponse> {
    const template = await this.repository.findTemplateById(request.templateId);
    if (!template || template.status !== 'ACTIVE') {
      throw new NotFoundException(
        `Template ${request.templateId} not found or not active`,
      );
    }
    return this.mapper.toTemplateResponse(template);
  }

  // ---------------------------------------------------------------------------
  // [CATAL-003] Get Template Configuration Options
  // ---------------------------------------------------------------------------
  async getTemplateConfigurationOptions(
    request: GetTemplateConfigurationOptionsRequest,
  ): Promise<TemplateConfigurationOptionsResponse> {
    const template = await this.repository.findTemplateById(request.templateId);
    if (!template || template.status !== 'ACTIVE') {
      throw new NotFoundException(
        `Template ${request.templateId} not found or not active`,
      );
    }

    const [materials, variants, rawSlots] = await Promise.all([
      this.repository.findManyMaterials('ACTIVE'),
      this.repository.findVariantsByTemplateId(
        request.templateId,
        undefined,
        'ACTIVE',
      ),
      this.repository.findGemstoneSlotsByTemplateId(request.templateId),
    ]);

    const slots: GemstoneSlotResponse[] = rawSlots.map((s) => ({
      ...this.mapper.toGemstoneSlotResponse(s),
      ringTemplateId: template.id,
    }));

    return {
      templateId: template.id,
      availableMaterials: materials.map((m) =>
        this.mapper.toMaterialResponse(m),
      ),
      availableVariants: variants.map((v) => this.mapper.toVariantResponse(v)),
      gemstoneSlots: slots,
      allowedPersonalizationPackages:
        template.design_supported_personalization_packages?.length > 0
          ? template.design_supported_personalization_packages
          : ['NONE', 'FINGERPRINT', 'SOUNDWAVE'],
    };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-004] Get Template 3D Assets
  // ---------------------------------------------------------------------------
  async getTemplate3DAssets(
    request: GetTemplate3DAssetsRequest,
  ): Promise<Template3DAssetsResponse> {
    const template = await this.repository.findTemplateById(request.templateId);
    if (!template || template.status !== 'ACTIVE') {
      throw new NotFoundException(
        `Template ${request.templateId} not found or not active`,
      );
    }

    const rawSlots = await this.repository.findGemstoneSlotsByTemplateId(
      request.templateId,
    );
    const anchors = this.mapper.toAnchorNodes(rawSlots);

    return {
      templateId: template.id,
      model3dAssetKey: template.glb_asset_key,
      glbUrl: this.mapper.resolveGlbUrl(template.glb_asset_key),
      mappingVersion: '1.0',
      anchors,
    };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-009] List Materials
  // ---------------------------------------------------------------------------
  async listMaterials(
    request: ListMaterialsRequest,
  ): Promise<ListMaterialsResponse> {
    const status = request.status ?? 'ACTIVE';
    const rows = await this.repository.findManyMaterials(status);
    return {
      data: rows.map((m) => this.mapper.toMaterialResponse(m)),
    };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-012] List Template Variants
  // ---------------------------------------------------------------------------
  async listTemplateVariants(
    request: ListTemplateVariantsRequest,
  ): Promise<ListTemplateVariantsResponse> {
    const rows = await this.repository.findVariantsByTemplateId(
      request.templateId,
      request.materialId,
      'ACTIVE',
    );
    return {
      data: rows.map((v) => this.mapper.toVariantResponse(v)),
    };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-015] List Gemstone Options
  // ---------------------------------------------------------------------------
  async listGemstoneOptions(
    request: ListGemstoneOptionsRequest,
  ): Promise<ListGemstoneOptionsResponse> {
    const page = Math.max(1, request.pagination?.page ?? 1);
    const limit = Math.min(100, Math.max(1, request.pagination?.limit ?? 20));
    const skip = (page - 1) * limit;

    const { rows, total } = await this.repository.findManyGemstoneOptions({
      skip,
      take: limit,
      stoneType: request.stoneType,
      shape: request.shape,
      isCertified: request.isCertified,
      status: 'ACTIVE',
    });

    const data = rows.map((g) => this.mapper.toGemstoneOptionResponse(g));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-016] List Gemstone Slots
  // ---------------------------------------------------------------------------
  async listGemstoneSlots(
    request: ListGemstoneSlotsRequest,
  ): Promise<ListGemstoneSlotsResponse> {
    const rawSlots = await this.repository.findGemstoneSlotsByTemplateId(
      request.templateId,
    );
    const data = rawSlots.map((s) => ({
      ...this.mapper.toGemstoneSlotResponse(s),
      ringTemplateId: request.templateId,
    }));
    return { data };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-021] Validate Configuration
  // ---------------------------------------------------------------------------
  async validateConfiguration(
    request: ValidateConfigurationRequest,
  ): Promise<ValidateConfigurationResponse> {
    const validationErrors: ValidationError[] = [];

    // 1. Verify Template exists & is ACTIVE
    const template = await this.repository.findTemplateById(request.templateId);
    if (!template || template.status !== 'ACTIVE') {
      validationErrors.push({
        code: 'TEMPLATE_INVALID',
        message: `Template ${request.templateId} is not found or not active`,
        field: 'templateId',
      });
      return {
        isValid: false,
        validationErrors,
        templateVariantId: '',
        safeEngravingDepthMm: 0,
        resizeDelta: 0,
        isResizeAllowed: false,
      };
    }

    // 2. Verify Variant matching template, material, standardSize
    const variant = await this.repository.findVariantByTemplateMaterialAndSize(
      request.templateId,
      request.materialId,
      request.standardSize,
    );

    if (!variant) {
      validationErrors.push({
        code: 'VARIANT_NOT_FOUND',
        message: `No active variant found for template ${request.templateId}, material ${request.materialId}, standardSize ${request.standardSize}`,
        field: 'standardSize',
      });
      return {
        isValid: false,
        validationErrors,
        templateVariantId: '',
        safeEngravingDepthMm: 0,
        resizeDelta: 0,
        isResizeAllowed: false,
      };
    }

    // 3. Verify Resize bounds (Quy tắc D4 & D18)
    const resizeDelta = request.targetSize - request.standardSize;
    const maxUp = variant.max_up_delta ? Number(variant.max_up_delta) : 0;
    const maxDown = variant.max_down_delta ? Number(variant.max_down_delta) : 0;

    let isResizeAllowed = true;
    if (resizeDelta > 0 && resizeDelta > maxUp) {
      isResizeAllowed = false;
      validationErrors.push({
        code: 'RESIZE_OUT_OF_BOUNDS',
        message: `Target size ${request.targetSize} exceeds max up delta ${maxUp} for standard size ${request.standardSize}`,
        field: 'targetSize',
      });
    } else if (resizeDelta < 0 && Math.abs(resizeDelta) > maxDown) {
      isResizeAllowed = false;
      validationErrors.push({
        code: 'RESIZE_OUT_OF_BOUNDS',
        message: `Target size ${request.targetSize} exceeds max down delta ${maxDown} for standard size ${request.standardSize}`,
        field: 'targetSize',
      });
    }

    // 4. Verify Slots & Gemstone Selections
    const rawSlots = await this.repository.findGemstoneSlotsByTemplateId(
      request.templateId,
    );
    const requiredSlots = rawSlots.filter(
      (s) => s.gemstone_groups?.is_required === true,
    );

    for (const reqSlot of requiredSlots) {
      const selected = request.gemstoneSelections?.find(
        (sel) => sel.slotNumber === reqSlot.slot_index,
      );
      if (!selected || !selected.gemstoneOptionId) {
        validationErrors.push({
          code: 'REQUIRED_SLOT_EMPTY',
          message: `Slot #${reqSlot.slot_index} is required for this template`,
          field: `gemstoneSelections[slotNumber=${reqSlot.slot_index}]`,
        });
      }
    }

    // 5. Verify Gemstone Options compatibility
    const selectedOptionIds = (request.gemstoneSelections || [])
      .map((s) => s.gemstoneOptionId)
      .filter(Boolean);

    if (selectedOptionIds.length > 0) {
      const compatibilities = await this.repository.findCompatibilities(
        variant.id,
        selectedOptionIds,
      );
      const compatibleOptionIds = new Set(
        compatibilities.map((c) => c.gemstone_option_id),
      );

      // If template_compatibilities are configured for this variant, enforce them
      if (compatibilities.length > 0) {
        for (const sel of request.gemstoneSelections) {
          if (!compatibleOptionIds.has(sel.gemstoneOptionId)) {
            validationErrors.push({
              code: 'GEMSTONE_INCOMPATIBLE',
              message: `Gemstone option ${sel.gemstoneOptionId} is not compatible with variant ${variant.id}`,
              field: `gemstoneSelections[slotNumber=${sel.slotNumber}]`,
            });
          }
        }
      }
    }

    // 6. Verify Personalization Package
    const allowedPackages =
      template.design_supported_personalization_packages || ['NONE'];
    if (
      request.personalizationPackage &&
      !allowedPackages.includes(request.personalizationPackage)
    ) {
      validationErrors.push({
        code: 'PERSONALIZATION_NOT_SUPPORTED',
        message: `Personalization package '${request.personalizationPackage}' is not supported by template`,
        field: 'personalizationPackage',
      });
    }

    const isValid = validationErrors.length === 0;

    return {
      isValid,
      validationErrors,
      templateVariantId: variant.id,
      safeEngravingDepthMm: Number(variant.max_safe_engraving_depth_mm),
      resizeDelta,
      isResizeAllowed,
    };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-005] Create Template
  // ---------------------------------------------------------------------------
  async createTemplate(
    request: CreateTemplateRequest,
  ): Promise<TemplateResponse> {
    const existing = await this.repository.findTemplateByCode(request.code);
    if (existing) {
      throw new ConflictException(
        `Template with code '${request.code}' already exists`,
      );
    }

    const created = await this.repository.createTemplate({
      code: request.code,
      name: request.name,
      description: request.description,
      glb_asset_key: request.glbAssetKey,
      stone_layout: request.stoneLayout ?? 'NONE',
      design_supported_personalization_packages:
        request.designSupportedPersonalizationPackages ?? ['NONE'],
      status: 'DRAFT',
      created_by_user_id: request.createdByUserId,
    });

    return this.mapper.toTemplateResponse(created);
  }

  // ---------------------------------------------------------------------------
  // [CATAL-006] Update Template
  // ---------------------------------------------------------------------------
  async updateTemplate(
    request: UpdateTemplateRequest,
  ): Promise<TemplateResponse> {
    const existing = await this.repository.findTemplateById(request.templateId);
    if (!existing) {
      throw new NotFoundException(
        `Template with ID '${request.templateId}' not found`,
      );
    }
    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot update an ARCHIVED template');
    }

    const data: Prisma.ring_templatesUpdateInput = {};
    if (request.name !== undefined) data.name = request.name;
    if (request.description !== undefined)
      data.description = request.description;
    if (request.glbAssetKey !== undefined)
      data.glb_asset_key = request.glbAssetKey;
    if (request.stoneLayout !== undefined)
      data.stone_layout = request.stoneLayout;
    if (request.designSupportedPersonalizationPackages !== undefined) {
      data.design_supported_personalization_packages =
        request.designSupportedPersonalizationPackages;
    }

    const updated = await this.repository.updateTemplate(
      request.templateId,
      data,
    );
    return this.mapper.toTemplateResponse(updated);
  }

  // ---------------------------------------------------------------------------
  // [CATAL-007] Publish Template
  // ---------------------------------------------------------------------------
  async publishTemplate(
    request: PublishTemplateRequest,
  ): Promise<TemplateResponse> {
    const existing = await this.repository.findTemplateById(request.templateId);
    if (!existing) {
      throw new NotFoundException(
        `Template with ID '${request.templateId}' not found`,
      );
    }
    if (existing.status === 'ACTIVE') {
      return this.mapper.toTemplateResponse(existing);
    }

    const variantCount = await this.repository.countVariantsForTemplate(
      request.templateId,
    );
    if (variantCount === 0) {
      throw new BadRequestException(
        'Cannot publish a template without at least one physical variant',
      );
    }

    const updated = await this.repository.updateTemplate(request.templateId, {
      status: 'ACTIVE',
    });
    return this.mapper.toTemplateResponse(updated);
  }

  // ---------------------------------------------------------------------------
  // [CATAL-008] Archive Template
  // ---------------------------------------------------------------------------
  async archiveTemplate(
    request: ArchiveTemplateRequest,
  ): Promise<TemplateResponse> {
    const existing = await this.repository.findTemplateById(request.templateId);
    if (!existing) {
      throw new NotFoundException(
        `Template with ID '${request.templateId}' not found`,
      );
    }

    const updated = await this.repository.updateTemplate(request.templateId, {
      status: 'ARCHIVED',
    });
    return this.mapper.toTemplateResponse(updated);
  }

  // ---------------------------------------------------------------------------
  // [CATAL-010] Create Material
  // ---------------------------------------------------------------------------
  async createMaterial(
    request: CreateMaterialRequest,
  ): Promise<MaterialResponse> {
    const existing = await this.repository.findMaterialByCode(request.code);
    if (existing) {
      throw new ConflictException(
        `Material with code '${request.code}' already exists`,
      );
    }

    const created = await this.repository.createMaterial({
      code: request.code,
      name: request.name,
      material_family: request.materialFamily,
      purity_percent:
        request.purityPercent !== undefined
          ? new Prisma.Decimal(request.purityPercent)
          : undefined,
      color: request.color,
      status: 'ACTIVE',
    });

    return this.mapper.toMaterialResponse(created);
  }

  // ---------------------------------------------------------------------------
  // [CATAL-011] Update Material
  // ---------------------------------------------------------------------------
  async updateMaterial(
    request: UpdateMaterialRequest,
  ): Promise<MaterialResponse> {
    const existing = await this.repository.findMaterialById(request.materialId);
    if (!existing) {
      throw new NotFoundException(
        `Material with ID '${request.materialId}' not found`,
      );
    }

    const data: Prisma.materialsUpdateInput = {};
    if (request.name !== undefined) data.name = request.name;
    if (request.materialFamily !== undefined)
      data.material_family = request.materialFamily;
    if (request.purityPercent !== undefined) {
      data.purity_percent = new Prisma.Decimal(request.purityPercent);
    }
    if (request.color !== undefined) data.color = request.color;
    if (request.status !== undefined) data.status = request.status;

    const updated = await this.repository.updateMaterial(
      request.materialId,
      data,
    );
    return this.mapper.toMaterialResponse(updated);
  }

  // ---------------------------------------------------------------------------
  // [CATAL-013] Create Variant
  // ---------------------------------------------------------------------------
  async createVariant(
    request: CreateVariantRequest,
  ): Promise<TemplateVariantResponse> {
    const template = await this.repository.findTemplateById(
      request.ringTemplateId,
    );
    if (!template) {
      throw new NotFoundException(
        `Template with ID '${request.ringTemplateId}' not found`,
      );
    }
    const material = await this.repository.findMaterialById(request.materialId);
    if (!material) {
      throw new NotFoundException(
        `Material with ID '${request.materialId}' not found`,
      );
    }

    const created = await this.repository.createVariant({
      ring_templates: { connect: { id: request.ringTemplateId } },
      materials: { connect: { id: request.materialId } },
      standard_size: new Prisma.Decimal(request.standardSize),
      max_up_delta:
        request.maxUpDelta !== undefined
          ? new Prisma.Decimal(request.maxUpDelta)
          : undefined,
      max_down_delta:
        request.maxDownDelta !== undefined
          ? new Prisma.Decimal(request.maxDownDelta)
          : undefined,
      resize_method: request.resizeMethod,
      added_metal_allowed: request.addedMetalAllowed ?? false,
      local_wall_thickness_mm: new Prisma.Decimal(request.localWallThicknessMm),
      min_remaining_wall_thickness_mm: new Prisma.Decimal(
        request.minRemainingWallThicknessMm,
      ),
      max_safe_engraving_depth_mm: new Prisma.Decimal(
        request.maxSafeEngravingDepthMm,
      ),
      status: 'ACTIVE',
      created_by_user_id: request.createdByUserId,
    });

    return this.mapper.toTemplateVariantResponse(created);
  }

  // ---------------------------------------------------------------------------
  // [CATAL-014] Update Variant
  // ---------------------------------------------------------------------------
  async updateVariant(
    request: UpdateVariantRequest,
  ): Promise<TemplateVariantResponse> {
    const existing = await this.repository.findTemplateVariantById(
      request.variantId,
    );
    if (!existing) {
      throw new NotFoundException(
        `Variant with ID '${request.variantId}' not found`,
      );
    }

    const data: Prisma.template_variantsUpdateInput = {};
    if (request.standardSize !== undefined) {
      data.standard_size = new Prisma.Decimal(request.standardSize);
    }
    if (request.maxUpDelta !== undefined) {
      data.max_up_delta = new Prisma.Decimal(request.maxUpDelta);
    }
    if (request.maxDownDelta !== undefined) {
      data.max_down_delta = new Prisma.Decimal(request.maxDownDelta);
    }
    if (request.resizeMethod !== undefined)
      data.resize_method = request.resizeMethod;
    if (request.addedMetalAllowed !== undefined) {
      data.added_metal_allowed = request.addedMetalAllowed;
    }
    if (request.localWallThicknessMm !== undefined) {
      data.local_wall_thickness_mm = new Prisma.Decimal(
        request.localWallThicknessMm,
      );
    }
    if (request.minRemainingWallThicknessMm !== undefined) {
      data.min_remaining_wall_thickness_mm = new Prisma.Decimal(
        request.minRemainingWallThicknessMm,
      );
    }
    if (request.maxSafeEngravingDepthMm !== undefined) {
      data.max_safe_engraving_depth_mm = new Prisma.Decimal(
        request.maxSafeEngravingDepthMm,
      );
    }
    if (request.status !== undefined) data.status = request.status;

    const updated = await this.repository.updateVariant(
      request.variantId,
      data,
    );
    return this.mapper.toTemplateVariantResponse(updated);
  }

  // ---------------------------------------------------------------------------
  // [CATAL-017] Create Gemstone Option
  // ---------------------------------------------------------------------------
  async createGemstoneOption(
    request: CreateGemstoneOptionRequest,
  ): Promise<GemstoneOptionResponse> {
    const existing = await this.repository.findGemstoneOptionByCode(
      request.code,
    );
    if (existing) {
      throw new ConflictException(
        `Gemstone option with code '${request.code}' already exists`,
      );
    }

    const created = await this.repository.createGemstoneOption({
      code: request.code,
      name: request.name,
      stone_type: request.stoneType,
      shape: request.shape,
      length_mm: new Prisma.Decimal(request.lengthMm),
      width_mm: new Prisma.Decimal(request.widthMm),
      color_grade: request.colorGrade,
      clarity_grade: request.clarityGrade,
      certified_required: request.certifiedRequired ?? false,
      status: 'ACTIVE',
    });

    return this.mapper.toGemstoneOptionResponse(created);
  }

  // ---------------------------------------------------------------------------
  // [CATAL-018] Update Compatibilities
  // ---------------------------------------------------------------------------
  async updateCompatibilities(
    request: UpdateCompatibilitiesRequest,
  ): Promise<UpdateCompatibilitiesResponse> {
    const variant = await this.repository.findTemplateVariantById(
      request.templateVariantId,
    );
    if (!variant) {
      throw new NotFoundException(
        `Variant with ID '${request.templateVariantId}' not found`,
      );
    }

    const allowedOptionIds = await this.repository.updateCompatibilities(
      request.templateVariantId,
      request.gemstoneGroupId,
      request.gemstoneOptionIds,
    );

    return {
      templateVariantId: request.templateVariantId,
      gemstoneGroupId: request.gemstoneGroupId,
      allowedOptionIds,
      updatedCount: allowedOptionIds.length,
    };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-019] Get Resize Policies
  // ---------------------------------------------------------------------------
  async getResizePolicies(
    request: GetResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    const variants = await this.repository.findResizePolicies({
      templateVariantId: request.templateVariantId,
      templateId: request.templateId,
    });

    const data: ResizePolicyItem[] = variants.map((v) => {
      const std = Number(v.standard_size);
      const up = Number(v.max_up_delta ?? 0);
      const down = Number(v.max_down_delta ?? 0);
      return {
        templateVariantId: v.id,
        templateId: v.ring_template_id,
        templateName: v.ring_templates.name,
        materialName: v.materials.name,
        standardSize: std,
        minSize: std - down,
        maxSize: std + up,
        maxUpDelta: up,
        maxDownDelta: down,
        resizeMethod: v.resize_method ?? 'STRETCH_COMPRESS',
        addedMetalAllowed: v.added_metal_allowed,
        localWallThicknessMm: Number(v.local_wall_thickness_mm),
        minRemainingWallThicknessMm: Number(v.min_remaining_wall_thickness_mm),
        maxSafeEngravingDepthMm: Number(v.max_safe_engraving_depth_mm),
      };
    });

    return { data };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-020] Update Resize Policies
  // ---------------------------------------------------------------------------
  async updateResizePolicies(
    request: UpdateResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    const existing = await this.repository.findTemplateVariantById(
      request.templateVariantId,
    );
    if (!existing) {
      throw new NotFoundException(
        `Variant with ID '${request.templateVariantId}' not found`,
      );
    }

    const data: Prisma.template_variantsUpdateInput = {};
    if (request.maxUpDelta !== undefined) {
      data.max_up_delta = new Prisma.Decimal(request.maxUpDelta);
    }
    if (request.maxDownDelta !== undefined) {
      data.max_down_delta = new Prisma.Decimal(request.maxDownDelta);
    }
    if (request.resizeMethod !== undefined)
      data.resize_method = request.resizeMethod;
    if (request.addedMetalAllowed !== undefined) {
      data.added_metal_allowed = request.addedMetalAllowed;
    }
    if (request.minRemainingWallThicknessMm !== undefined) {
      data.min_remaining_wall_thickness_mm = new Prisma.Decimal(
        request.minRemainingWallThicknessMm,
      );
    }
    if (request.maxSafeEngravingDepthMm !== undefined) {
      data.max_safe_engraving_depth_mm = new Prisma.Decimal(
        request.maxSafeEngravingDepthMm,
      );
    }

    await this.repository.updateVariant(request.templateVariantId, data);

    return this.getResizePolicies({
      templateVariantId: request.templateVariantId,
    });
  }
}
