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

@Injectable()
export class ResizePolicyUseCases {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  async getResizePolicies(
    request: GetResizePoliciesRequest,
  ): Promise<ResizePoliciesResponse> {
    const variants = await this.repository.findResizePolicies({
      templateVariantId: request.templateVariantId,
      templateId: request.templateId,
    });

    return {
      data: variants.map((v) => toResizePolicyItem(v)),
    };
  }

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

    return this.getResizePolicies({
      templateVariantId: request.templateVariantId,
    });
  }
}
