import type {
  ApprovePriceVersionRequest,
  CreatePriceItemRequest,
  CreatePriceVersionRequest,
  ListPriceItemsRequest,
  ListPriceVersionsRequest,
  RejectPriceVersionRequest,
} from '@app/contracts';
import type {
  ApprovePriceVersionBodyDto,
  CreatePriceItemBodyDto,
  CreatePriceVersionBodyDto,
  ListPriceItemsQueryDto,
  ListPriceVersionsQueryDto,
  RejectPriceVersionBodyDto,
} from '../dto';

export function toListPriceItemsGrpcRequest(
  query: ListPriceItemsQueryDto,
): ListPriceItemsRequest {
  return {
    priceType: query.priceType,
    status: query.status,
    limit: query.limit,
    offset: query.offset,
  };
}

export function toCreatePriceItemGrpcRequest(
  body: CreatePriceItemBodyDto,
): CreatePriceItemRequest {
  return {
    priceType: body.priceType,
    code: body.code,
    templateVariantId: body.templateVariantId,
    gemstoneOptionId: body.gemstoneOptionId,
    certifiedGemstoneId: body.certifiedGemstoneId,
    personalizationPackage: body.personalizationPackage,
    status: body.status,
  };
}

export function toListPriceVersionsGrpcRequest(
  query: ListPriceVersionsQueryDto,
): ListPriceVersionsRequest {
  return {
    priceItemId: query.priceItemId,
    status: query.status,
    limit: query.limit,
    offset: query.offset,
  };
}

export function toCreatePriceVersionGrpcRequest(
  body: CreatePriceVersionBodyDto,
  userId?: string,
): CreatePriceVersionRequest {
  return {
    priceItemId: body.priceItemId,
    amount: body.amount,
    currency: body.currency,
    effectiveFrom: body.effectiveFrom,
    effectiveTo: body.effectiveTo,
    sourceType: body.sourceType,
    marketSnapshotJson: body.marketSnapshot
      ? JSON.stringify(body.marketSnapshot)
      : undefined,
    createdByUserId: userId,
  };
}

export function toApprovePriceVersionGrpcRequest(
  versionId: string,
  body: ApprovePriceVersionBodyDto,
  userId?: string,
): ApprovePriceVersionRequest {
  return {
    versionId,
    reviewNote: body.reviewNote,
    reviewedByUserId: userId,
  };
}

export function toRejectPriceVersionGrpcRequest(
  versionId: string,
  body: RejectPriceVersionBodyDto,
  userId?: string,
): RejectPriceVersionRequest {
  return {
    versionId,
    reviewNote: body.reviewNote ?? '',
    reviewedByUserId: userId,
  };
}
