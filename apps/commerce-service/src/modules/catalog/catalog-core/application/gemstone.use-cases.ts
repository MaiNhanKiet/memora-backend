import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateGemstoneOptionRequest,
  GemstoneOptionResponse,
  ListGemstoneOptionsRequest,
  ListGemstoneOptionsResponse,
  ListGemstoneSlotsRequest,
  ListGemstoneSlotsResponse,
  UpdateCompatibilitiesRequest,
  UpdateCompatibilitiesResponse,
} from '@app/contracts';
import {
  toGemstoneOptionResponse,
  toGemstoneSlotResponse,
} from './catalog.mapper';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from './catalog.repository';

@Injectable()
export class ListGemstoneOptionsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async execute(
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

    const totalPages = total <= 0 ? 0 : Math.ceil(total / limit);

    return {
      data: rows.map((g) => toGemstoneOptionResponse(g)),
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
export class ListGemstoneSlotsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async execute(
    request: ListGemstoneSlotsRequest,
  ): Promise<ListGemstoneSlotsResponse> {
    const rawSlots = await this.repository.findGemstoneSlotsByTemplateId(
      request.templateId,
    );
    return {
      data: rawSlots.map((s) => toGemstoneSlotResponse(s, request.templateId)),
    };
  }
}

@Injectable()
export class CreateGemstoneOptionUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async execute(
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
      stoneType: request.stoneType,
      shape: request.shape,
      lengthMm: request.lengthMm,
      widthMm: request.widthMm,
      colorGrade: request.colorGrade,
      clarityGrade: request.clarityGrade,
      certifiedRequired: request.certifiedRequired ?? false,
      status: 'ACTIVE',
    });

    return toGemstoneOptionResponse(created);
  }
}

@Injectable()
export class UpdateCompatibilitiesUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async execute(
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
}
