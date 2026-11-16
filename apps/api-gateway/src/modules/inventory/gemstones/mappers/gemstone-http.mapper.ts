import type {
  CreateCertifiedGemstoneRequest,
  ListCertifiedGemstoneAvailabilityRequest,
  ListGemstoneBatchesRequest,
  ReceiveGemstoneBatchRequest,
} from '@app/contracts';
import type {
  CreateCertifiedGemstoneBodyDto,
  ListCertifiedGemstoneAvailabilityQueryDto,
  ListGemstoneBatchesQueryDto,
  ReceiveGemstoneBatchBodyDto,
} from '../dto';

export function toListGemstoneBatchesGrpcRequest(
  query: ListGemstoneBatchesQueryDto,
): ListGemstoneBatchesRequest {
  return {
    gemstoneOptionId: query.gemstoneOptionId,
    status: query.status,
    limit: query.limit,
    offset: query.offset,
  };
}

export function toReceiveGemstoneBatchGrpcRequest(
  body: ReceiveGemstoneBatchBodyDto,
  userId?: string,
): ReceiveGemstoneBatchRequest {
  return {
    gemstoneOptionId: body.gemstoneOptionId,
    lotCode: body.lotCode,
    supplierRef: body.supplierRef,
    quantity: body.quantity,
    unitCost: body.unitCost,
    locationCode: body.locationCode,
    receivedAt: body.receivedAt,
    performedByUserId: userId,
  };
}

export function toCreateCertifiedGemstoneGrpcRequest(
  body: CreateCertifiedGemstoneBodyDto,
  userId?: string,
): CreateCertifiedGemstoneRequest {
  return {
    internalCode: body.internalCode,
    gemstoneOptionId: body.gemstoneOptionId,
    certificateProvider: body.certificateProvider,
    certificateNumber: body.certificateNumber,
    certificateUrl: body.certificateUrl,
    certificateMetadataJson: body.certificateMetadata
      ? JSON.stringify(body.certificateMetadata)
      : undefined,
    purchaseCost: body.purchaseCost,
    locationCode: body.locationCode,
    performedByUserId: userId,
  };
}

export function toListCertifiedGemstoneAvailabilityGrpcRequest(
  query: ListCertifiedGemstoneAvailabilityQueryDto,
): ListCertifiedGemstoneAvailabilityRequest {
  return {
    gemstoneOptionId: query.gemstoneOptionId,
    status: query.status,
    limit: query.limit,
    offset: query.offset,
  };
}
