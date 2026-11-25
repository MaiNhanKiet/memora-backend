import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type {
  CertifiedGemstoneResponse,
  CreateCertifiedGemstoneRequest,
  ListCertifiedGemstoneAvailabilityRequest,
  ListCertifiedGemstoneAvailabilityResponse,
} from '@app/contracts';
import {
  parseJsonRecord,
  toCertifiedGemstoneResponse,
} from './inventory.mapper';
import {
  INVENTORY_REPOSITORY,
  type InventoryRepository,
} from './inventory.repository';

@Injectable()
export class CertifiedGemstoneUseCases {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async listCertifiedGemstoneAvailability(
    request: ListCertifiedGemstoneAvailabilityRequest,
  ): Promise<ListCertifiedGemstoneAvailabilityResponse> {
    const limit = request.limit && request.limit > 0 ? request.limit : 20;
    const offset = request.offset && request.offset >= 0 ? request.offset : 0;

    const { items, total } =
      await this.repository.findCertifiedGemstoneAvailability({
        gemstoneOptionId: request.gemstoneOptionId,
        status: request.status ?? 'AVAILABLE',
        limit,
        offset,
      });

    return {
      items: items.map((g) => toCertifiedGemstoneResponse(g)),
      total,
    };
  }

  async createCertifiedGemstone(
    request: CreateCertifiedGemstoneRequest,
  ): Promise<CertifiedGemstoneResponse> {
    const existing = await this.repository.findCertifiedGemstoneByCode(
      request.internalCode,
    );
    if (existing) {
      throw new ConflictException(
        `Certified gemstone with internal code '${request.internalCode}' already exists`,
      );
    }

    const parsedMetadata = parseJsonRecord(request.certificateMetadataJson);

    const created = await this.repository.createCertifiedGemstone({
      internalCode: request.internalCode,
      gemstoneOptionId: request.gemstoneOptionId,
      certificateProvider: request.certificateProvider,
      certificateNumber: request.certificateNumber,
      certificateUrl: request.certificateUrl,
      certificateMetadataJson: parsedMetadata,
      purchaseCost: request.purchaseCost,
      locationCode: request.locationCode,
      performedByUserId: request.performedByUserId,
    });

    return toCertifiedGemstoneResponse(created);
  }
}
