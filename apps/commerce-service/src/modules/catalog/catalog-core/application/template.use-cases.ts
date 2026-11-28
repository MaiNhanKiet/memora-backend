import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type {
  ArchiveTemplateRequest,
  CreateTemplateRequest,
  PublishTemplateRequest,
  TemplateResponse,
  UpdateTemplateRequest,
} from '@app/contracts';
import {
  CATALOG_CDN_BASE_URL,
  DEFAULT_CATALOG_CDN_BASE_URL,
  toTemplateResponse,
} from './catalog.mapper';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
  type RingTemplateRecord,
  type UpdateTemplateInput,
} from './catalog.repository';

async function requireExistingTemplate(
  repository: CatalogRepository,
  templateId: string,
): Promise<RingTemplateRecord> {
  const existing = await repository.findTemplateById(templateId);
  if (!existing) {
    throw new NotFoundException(`Template with ID '${templateId}' not found`);
  }
  return existing;
}

@Injectable()
export class CreateTemplateUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
    @Optional()
    @Inject(CATALOG_CDN_BASE_URL)
    private readonly cdnBaseUrl: string = DEFAULT_CATALOG_CDN_BASE_URL,
  ) {}

  async execute(request: CreateTemplateRequest): Promise<TemplateResponse> {
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

    return toTemplateResponse(created, this.cdnBaseUrl);
  }
}

@Injectable()
export class UpdateTemplateUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
    @Optional()
    @Inject(CATALOG_CDN_BASE_URL)
    private readonly cdnBaseUrl: string = DEFAULT_CATALOG_CDN_BASE_URL,
  ) {}

  async execute(request: UpdateTemplateRequest): Promise<TemplateResponse> {
    const existing = await requireExistingTemplate(
      this.repository,
      request.templateId,
    );
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
    return toTemplateResponse(updated, this.cdnBaseUrl);
  }
}

@Injectable()
export class PublishTemplateUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
    @Optional()
    @Inject(CATALOG_CDN_BASE_URL)
    private readonly cdnBaseUrl: string = DEFAULT_CATALOG_CDN_BASE_URL,
  ) {}

  async execute(request: PublishTemplateRequest): Promise<TemplateResponse> {
    const existing = await requireExistingTemplate(
      this.repository,
      request.templateId,
    );
    if (existing.status === 'ACTIVE') {
      return toTemplateResponse(existing, this.cdnBaseUrl);
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
    return toTemplateResponse(updated, this.cdnBaseUrl);
  }
}

@Injectable()
export class ArchiveTemplateUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
    @Optional()
    @Inject(CATALOG_CDN_BASE_URL)
    private readonly cdnBaseUrl: string = DEFAULT_CATALOG_CDN_BASE_URL,
  ) {}

  async execute(request: ArchiveTemplateRequest): Promise<TemplateResponse> {
    await requireExistingTemplate(this.repository, request.templateId);

    const updated = await this.repository.updateTemplate(request.templateId, {
      status: 'ARCHIVED',
    });
    return toTemplateResponse(updated, this.cdnBaseUrl);
  }
}
