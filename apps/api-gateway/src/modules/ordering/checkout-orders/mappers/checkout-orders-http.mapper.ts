import type {
  CancelOrderRequest,
  CreateOrderRequest,
  GetOrderByIdRequest,
  GetOrderTimelineRequest,
  GetRingItemDetailsRequest,
  ListOrdersRequest,
  ListRingItemVersionsRequest,
  UpdateCurrentRingItemVersionRequest,
  VerifiedActor,
} from '@app/contracts';
import type {
  CancelOrderBodyDto,
  CreateOrderBodyDto,
  ListOrdersQueryDto,
  UpdateCurrentRingItemVersionBodyDto,
} from '../dto';

export function toCreateOrderGrpcRequest(
  actor: VerifiedActor,
  body: CreateOrderBodyDto,
): CreateOrderRequest {
  return {
    actor,
    selectedDraftIds: body.selectedDraftIds,
    fulfillmentMode: body.fulfillmentMode || 'DELIVERY',
    recipientName: body.recipientName,
    recipientPhone: body.recipientPhone,
    recipientEmail: body.recipientEmail,
    deliveryAddressJson: JSON.stringify(body.deliveryAddress),
    sourcePlanMode: body.sourcePlanMode,
    preP1Acknowledgement: body.preP1Acknowledgement
      ? {
          noticeVersion: body.preP1Acknowledgement.noticeVersion,
          privacyNoticeAcknowledged:
            body.preP1Acknowledgement.privacyNoticeAcknowledged,
          p1NonrefundAcknowledged:
            body.preP1Acknowledgement.p1NonrefundAcknowledged,
        }
      : undefined,
  };
}

export function toListOrdersGrpcRequest(
  actor: VerifiedActor,
  query: ListOrdersQueryDto,
): ListOrdersRequest {
  return {
    actor,
    page: query.page,
    limit: query.limit,
    status: query.status,
  };
}

export function toGetOrderByIdGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
): GetOrderByIdRequest {
  return { actor, orderId };
}

export function toGetOrderTimelineGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
): GetOrderTimelineRequest {
  return { actor, orderId };
}

export function toGetRingItemDetailsGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
  ringItemId: string,
): GetRingItemDetailsRequest {
  return { actor, orderId, ringItemId };
}

export function toListRingItemVersionsGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
  ringItemId: string,
): ListRingItemVersionsRequest {
  return { actor, orderId, ringItemId };
}

export function toUpdateCurrentRingItemVersionGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
  ringItemId: string,
  body: UpdateCurrentRingItemVersionBodyDto,
): UpdateCurrentRingItemVersionRequest {
  return {
    actor,
    orderId,
    ringItemId,
    targetSize: body.targetSize,
    changeReason: body.changeReason,
    memoryEnabled: body.memoryEnabled,
    gemstoneSelections: body.gemstoneSelections,
  };
}

export function toCancelOrderGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
  body?: CancelOrderBodyDto,
): CancelOrderRequest {
  return {
    actor,
    orderId,
    reason: body?.reason,
  };
}
