import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ArchiveTemplateRequest,
  CreateTemplateRequest,
  GemstoneSlotResponse,
  GetTemplate3DAssetsRequest,
  GetTemplateByIdRequest,
  GetTemplateConfigurationOptionsRequest,
  ListTemplatesRequest,
  ListTemplatesResponse,
  PublishTemplateRequest,
  Template3DAssetsResponse,
  TemplateConfigurationOptionsResponse,
  TemplateResponse,
  UpdateTemplateRequest,
} from '@app/contracts';
import {
  resolveGlbUrl,
  toAnchorNodes,
  toGemstoneSlotResponse,
  toMaterialResponse,
  toTemplateResponse,
  toVariantResponse,
} from './catalog.mapper';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
  type UpdateTemplateInput,
} from './catalog.repository';

@Injectable()
export class TemplateUseCases {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

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

    const totalPages = total <= 0 ? 0 : Math.ceil(total / limit);

    return {
      data: rows.map((item) => toTemplateResponse(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getTemplateById(
    request: GetTemplateByIdRequest,
  ): Promise<TemplateResponse> {
    const template = await this.repository.findTemplateById(request.templateId);
    if (!template || template.status !== 'ACTIVE') {
      throw new NotFoundException(
        `Template ${request.templateId} not found or not active`,
      );
    }
    return toTemplateResponse(template);
  }

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

    const slots: GemstoneSlotResponse[] = rawSlots.map((s) =>
      toGemstoneSlotResponse(s, template.id),
    );

    return {
      templateId: template.id,
      availableMaterials: materials.map((m) => toMaterialResponse(m)),
      availableVariants: variants.map((v) => toVariantResponse(v)),
      gemstoneSlots: slots,
      allowedPersonalizationPackages:
        template.designSupportedPersonalizationPackages.length > 0
          ? [...template.designSupportedPersonalizationPackages]
          : ['NONE', 'FINGERPRINT', 'SOUNDWAVE'],
    };
  }

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

    return {
      templateId: template.id,
      model3dAssetKey: template.glbAssetKey,
      glbUrl: resolveGlbUrl(template.glbAssetKey),
      mappingVersion: '1.0',
      anchors: toAnchorNodes(rawSlots),
    };
  }

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
      glbAssetKey: request.glbAssetKey,
      stoneLayout: request.stoneLayout ?? 'NONE',
      designSupportedPersonalizationPackages:
        request.designSupportedPersonalizationPackages ?? ['NONE'],
      status: 'DRAFT',
      createdByUserId: request.createdByUserId,
    });

    return toTemplateResponse(created);
  }

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

    const data: UpdateTemplateInput = {
      ...(request.name !== undefined ? { name: request.name } : {}),
      ...(request.description !== undefined
        ? { description: request.description }
        : {}),
      ...(request.glbAssetKey !== undefined
        ? { glbAssetKey: request.glbAssetKey }
        : {}),
      ...(request.stoneLayout !== undefined
        ? { stoneLayout: request.stoneLayout }
        : {}),
      ...(request.designSupportedPersonalizationPackages !== undefined
        ? {
            designSupportedPersonalizationPackages:
              request.designSupportedPersonalizationPackages,
          }
        : {}),
    };

    const updated = await this.repository.updateTemplate(
      request.templateId,
      data,
    );
    return toTemplateResponse(updated);
  }

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
      return toTemplateResponse(existing);
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
    return toTemplateResponse(updated);
  }

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
    return toTemplateResponse(updated);
  }
}
