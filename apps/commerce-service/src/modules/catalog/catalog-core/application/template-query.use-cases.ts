import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type {
  GemstoneSlotResponse,
  GetTemplate3DAssetsRequest,
  GetTemplateByIdRequest,
  GetTemplateConfigurationOptionsRequest,
  ListTemplatesRequest,
  ListTemplatesResponse,
  Template3DAssetsResponse,
  TemplateConfigurationOptionsResponse,
  TemplateResponse,
} from '@app/contracts';
import {
  CATALOG_CDN_BASE_URL,
  DEFAULT_CATALOG_CDN_BASE_URL,
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
  type RingTemplateRecord,
} from './catalog.repository';

async function requireActiveTemplate(
  repository: CatalogRepository,
  templateId: string,
): Promise<RingTemplateRecord> {
  const template = await repository.findTemplateById(templateId);
  if (!template || template.status !== 'ACTIVE') {
    throw new NotFoundException(
      `Template ${templateId} not found or not active`,
    );
  }
  return template;
}

@Injectable()
export class ListTemplatesUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
    @Optional()
    @Inject(CATALOG_CDN_BASE_URL)
    private readonly cdnBaseUrl: string = DEFAULT_CATALOG_CDN_BASE_URL,
  ) {}

  async execute(request: ListTemplatesRequest): Promise<ListTemplatesResponse> {
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
      data: rows.map((item) => toTemplateResponse(item, this.cdnBaseUrl)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}

@Injectable()
export class GetTemplateByIdUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
    @Optional()
    @Inject(CATALOG_CDN_BASE_URL)
    private readonly cdnBaseUrl: string = DEFAULT_CATALOG_CDN_BASE_URL,
  ) {}

  async execute(request: GetTemplateByIdRequest): Promise<TemplateResponse> {
    const template = await requireActiveTemplate(
      this.repository,
      request.templateId,
    );
    return toTemplateResponse(template, this.cdnBaseUrl);
  }
}

@Injectable()
export class GetTemplateConfigurationOptionsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async execute(
    request: GetTemplateConfigurationOptionsRequest,
  ): Promise<TemplateConfigurationOptionsResponse> {
    const template = await requireActiveTemplate(
      this.repository,
      request.templateId,
    );

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
}

@Injectable()
export class GetTemplate3DAssetsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
    @Optional()
    @Inject(CATALOG_CDN_BASE_URL)
    private readonly cdnBaseUrl: string = DEFAULT_CATALOG_CDN_BASE_URL,
  ) {}

  async execute(
    request: GetTemplate3DAssetsRequest,
  ): Promise<Template3DAssetsResponse> {
    const template = await requireActiveTemplate(
      this.repository,
      request.templateId,
    );

    const rawSlots = await this.repository.findGemstoneSlotsByTemplateId(
      request.templateId,
    );

    return {
      templateId: template.id,
      model3dAssetKey: template.glbAssetKey,
      glbUrl: resolveGlbUrl(template.glbAssetKey, this.cdnBaseUrl),
      mappingVersion: '1.0',
      anchors: toAnchorNodes(rawSlots),
    };
  }
}
