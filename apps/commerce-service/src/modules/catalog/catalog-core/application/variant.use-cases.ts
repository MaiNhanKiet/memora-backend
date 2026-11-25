import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateVariantRequest,
  ListTemplateVariantsRequest,
  ListTemplateVariantsResponse,
  TemplateVariantResponse,
  UpdateVariantRequest,
} from '@app/contracts';
import { toVariantResponse } from './catalog.mapper';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from './catalog.repository';

@Injectable()
export class VariantUseCases {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async listTemplateVariants(
    request: ListTemplateVariantsRequest,
  ): Promise<ListTemplateVariantsResponse> {
    const rows = await this.repository.findVariantsByTemplateId(
      request.templateId,
      request.materialId,
      'ACTIVE',
    );
    return {
      data: rows.map((v) => toVariantResponse(v)),
    };
  }

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
      ringTemplateId: request.ringTemplateId,
      materialId: request.materialId,
      standardSize: request.standardSize,
      maxUpDelta: request.maxUpDelta,
      maxDownDelta: request.maxDownDelta,
      resizeMethod: request.resizeMethod,
      addedMetalAllowed: request.addedMetalAllowed ?? false,
      localWallThicknessMm: request.localWallThicknessMm,
      minRemainingWallThicknessMm: request.minRemainingWallThicknessMm,
      maxSafeEngravingDepthMm: request.maxSafeEngravingDepthMm,
      status: 'ACTIVE',
      createdByUserId: request.createdByUserId,
    });

    return toVariantResponse(created);
  }

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

    const updated = await this.repository.updateVariant(request.variantId, {
      ...(request.standardSize !== undefined
        ? { standardSize: request.standardSize }
        : {}),
      ...(request.maxUpDelta !== undefined
        ? { maxUpDelta: request.maxUpDelta }
        : {}),
      ...(request.maxDownDelta !== undefined
        ? { maxDownDelta: request.maxDownDelta }
        : {}),
      ...(request.resizeMethod !== undefined
        ? { resizeMethod: request.resizeMethod }
        : {}),
      ...(request.addedMetalAllowed !== undefined
        ? { addedMetalAllowed: request.addedMetalAllowed }
        : {}),
      ...(request.localWallThicknessMm !== undefined
        ? { localWallThicknessMm: request.localWallThicknessMm }
        : {}),
      ...(request.minRemainingWallThicknessMm !== undefined
        ? { minRemainingWallThicknessMm: request.minRemainingWallThicknessMm }
        : {}),
      ...(request.maxSafeEngravingDepthMm !== undefined
        ? { maxSafeEngravingDepthMm: request.maxSafeEngravingDepthMm }
        : {}),
      ...(request.status !== undefined ? { status: request.status } : {}),
    });

    return toVariantResponse(updated);
  }
}
