import type {
  CreateFinalQuoteRequest,
  GetAdminOrderDetailsRequest,
  ListAdminOrdersRequest,
  PublishFinalQuoteRequest,
  UpdateFinalQuoteRequest,
  UpdateOrderStatusRequest,
} from '@app/contracts';
import type {
  CreateFinalQuoteBodyDto,
  ListAdminOrdersQueryDto,
  UpdateFinalQuoteBodyDto,
  UpdateOrderStatusBodyDto,
} from '../dto';

export function toListAdminOrdersGrpcRequest(
  query: ListAdminOrdersQueryDto,
): ListAdminOrdersRequest {
  return {
    page: query.page,
    limit: query.limit,
    status: query.status,
    search: query.search,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  };
}

export function toGetAdminOrderDetailsGrpcRequest(
  orderId: string,
): GetAdminOrderDetailsRequest {
  return { orderId };
}

export function toUpdateOrderStatusGrpcRequest(
  orderId: string,
  body: UpdateOrderStatusBodyDto,
  staffUserId?: string,
): UpdateOrderStatusRequest {
  return {
    orderId,
    targetStatus: body.targetStatus,
    reason: body.reason,
    staffUserId,
  };
}

export function toCreateFinalQuoteGrpcRequest(
  orderId: string,
  body: CreateFinalQuoteBodyDto,
  staffUserId?: string,
): CreateFinalQuoteRequest {
  return {
    orderId,
    subtotalAmount: body.subtotalAmount,
    deliveryAmount: body.deliveryAmount,
    adjustmentAmount: body.adjustmentAmount,
    totalAmount: body.totalAmount,
    currency: body.currency,
    validUntil: body.validUntil,
    staffUserId,
    items: body.items,
  };
}

export function toUpdateFinalQuoteGrpcRequest(
  orderId: string,
  quoteId: string,
  body: UpdateFinalQuoteBodyDto,
  staffUserId?: string,
): UpdateFinalQuoteRequest {
  return {
    orderId,
    quoteId,
    subtotalAmount: body.subtotalAmount,
    deliveryAmount: body.deliveryAmount,
    adjustmentAmount: body.adjustmentAmount,
    totalAmount: body.totalAmount,
    validUntil: body.validUntil,
    staffUserId,
    items: body.items,
  };
}

export function toPublishFinalQuoteGrpcRequest(
  orderId: string,
  quoteId: string,
  staffUserId?: string,
): PublishFinalQuoteRequest {
  return {
    orderId,
    quoteId,
    staffUserId,
  };
}
