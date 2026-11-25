import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  GetResizePoliciesRequest,
  ResizePoliciesResponse,
  UpdateResizePoliciesRequest,
} from '@app/contracts';
import { toResizePolicyItem } from './catalog.mapper';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from './catalog.repository';

async function loadResizePolicies(
  repository: CatalogRepository,
  filter: { templateVariantId?: string; templateId?: string },
): Promise<ResizePoliciesResponse> {
  const variants = await repository.findResizePolicies(filter);
  return {
    data: variants.map((v) => toResizePolicyItem(v)),
  };
}

@Injectable()
export class GetResizePoliciesUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async execute(
    request: GetResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    return loadResizePolicies(this.repository, {
      templateVariantId: request.templateVariantId,
      templateId: request.templateId,
    });
  }
}

@Injectable()
export class UpdateResizePoliciesUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async execute(
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

    await this.repository.updateVariant(request.templateVariantId, {
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
      ...(request.minRemainingWallThicknessMm !== undefined
        ? {
            minRemainingWallThicknessMm: request.minRemainingWallThicknessMm,
          }
        : {}),
      ...(request.maxSafeEngravingDepthMm !== undefined
        ? { maxSafeEngravingDepthMm: request.maxSafeEngravingDepthMm }
        : {}),
    });

    return loadResizePolicies(this.repository, {
      templateVariantId: request.templateVariantId,
    });
  }
}
