import type {
  ListRingBlankStocksRequest,
  ReceiveRingBlankStockRequest,
} from '@app/contracts';
import type {
  ListRingBlankStocksQueryDto,
  ReceiveRingBlankStockBodyDto,
} from '../dto';

export function toListRingBlankStocksGrpcRequest(
  query: ListRingBlankStocksQueryDto,
): ListRingBlankStocksRequest {
  return {
    templateVariantId: query.templateVariantId,
    status: query.status,
    limit: query.limit,
    offset: query.offset,
  };
}

export function toReceiveRingBlankStockGrpcRequest(
  body: ReceiveRingBlankStockBodyDto,
  userId?: string,
): ReceiveRingBlankStockRequest {
  return {
    templateVariantId: body.templateVariantId,
    lotCode: body.lotCode,
    supplierRef: body.supplierRef,
    quantity: body.quantity,
    unitCost: body.unitCost,
    locationCode: body.locationCode,
    receivedAt: body.receivedAt,
    performedByUserId: userId,
  };
}
