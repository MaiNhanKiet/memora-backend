import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  ApprovePriceVersionRequest,
  CreatePriceVersionRequest,
  ListPriceVersionsRequest,
  ListPriceVersionsResponse,
  PriceVersionResponse,
  RejectPriceVersionRequest,
} from '@app/contracts';
import {
  parseOptionalJsonRecord,
  toPriceVersionResponse,
} from './pricing.mapper';
import {
  PRICING_REPOSITORY,
  type PricingRepository,
} from './pricing.repository';

function mapPriceVersionMutationError(
  error: unknown,
  versionId: string,
  action: 'approved' | 'rejected',
): never {
  if (error instanceof Error) {
    if (error.message === 'PRICE_VERSION_NOT_FOUND') {
      throw new NotFoundException(`Price version ${versionId} not found`);
    }
    if (error.message === 'PRICE_VERSION_NOT_DRAFT') {
      throw new UnprocessableEntityException(
        `Only DRAFT price versions can be ${action}`,
      );
    }
  }
  throw error;
}

@Injectable()
export class ListPriceVersionsUseCase {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingRepository,
  ) {}

  async execute(
    request: ListPriceVersionsRequest,
  ): Promise<ListPriceVersionsResponse> {
    const limit = request.limit && request.limit > 0 ? request.limit : 20;
    const offset = request.offset && request.offset >= 0 ? request.offset : 0;

    const { versions, total } = await this.repository.findPriceVersions({
      priceItemId: request.priceItemId,
      status: request.status,
      limit,
      offset,
    });

    return {
      versions: versions.map((v) => toPriceVersionResponse(v)),
      total,
    };
  }
}

@Injectable()
export class CreatePriceVersionUseCase {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingRepository,
  ) {}

  async execute(
    request: CreatePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    const priceItem = await this.repository.findPriceItemById(
      request.priceItemId,
    );
    if (!priceItem) {
      throw new NotFoundException(
        `Price item ${request.priceItemId} not found`,
      );
    }

    if (request.amount <= 0) {
      throw new UnprocessableEntityException('Amount must be greater than 0');
    }

    const latestVersion = await this.repository.getLatestVersionNoForPriceItem(
      request.priceItemId,
    );

    const created = await this.repository.createPriceVersion({
      priceItemId: request.priceItemId,
      amount: request.amount,
      currency: request.currency ?? 'VND',
      versionNo: latestVersion + 1,
      status: 'DRAFT',
      effectiveFrom: request.effectiveFrom
        ? new Date(request.effectiveFrom)
        : undefined,
      effectiveTo: request.effectiveTo
        ? new Date(request.effectiveTo)
        : undefined,
      sourceType: request.sourceType ?? 'MANUAL',
      marketSnapshotJson: parseOptionalJsonRecord(request.marketSnapshotJson),
      createdByUserId: request.createdByUserId,
    });

    return toPriceVersionResponse(created);
  }
}

@Injectable()
export class ApprovePriceVersionUseCase {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingRepository,
  ) {}

  async execute(
    request: ApprovePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    try {
      const approved = await this.repository.approvePriceVersion(
        request.versionId,
        request.reviewedByUserId,
        request.reviewNote,
      );
      return toPriceVersionResponse(approved);
    } catch (error) {
      mapPriceVersionMutationError(error, request.versionId, 'approved');
    }
  }
}

@Injectable()
export class RejectPriceVersionUseCase {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingRepository,
  ) {}

  async execute(
    request: RejectPriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    try {
      const rejected = await this.repository.rejectPriceVersion(
        request.versionId,
        request.reviewedByUserId,
        request.reviewNote,
      );
      return toPriceVersionResponse(rejected);
    } catch (error) {
      mapPriceVersionMutationError(error, request.versionId, 'rejected');
    }
  }
}
