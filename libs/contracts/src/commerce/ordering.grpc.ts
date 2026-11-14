// Contract gRPC của Commerce Ordering, khớp proto/commerce/v1/ordering.proto.

import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';

export const COMMERCE_ORDERING_SERVICE_NAME = 'OrderingService';

export interface OrderActorIdentity {
  userId?: string;
  guestSessionId?: string;
}

export interface OrderPreP1Acknowledgement {
  noticeVersion: string;
  privacyNoticeAcknowledged: boolean;
  p1NonrefundAcknowledged: boolean;
}

export interface CreateOrderRequest {
  actor: OrderActorIdentity;
  selectedDraftIds: string[];
  fulfillmentMode: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  deliveryAddressJson: string;
  sourcePlanMode?: string;
  preP1Acknowledgement?: OrderPreP1Acknowledgement;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNo: string;
  status: string;
  sourcePlanMode: string;
  itemsCount: number;
  totalAmount: number;
  depositAmount: number;
  currency: string;
  createdAt: string;
}

export interface ListOrdersRequest {
  actor: OrderActorIdentity;
  page?: number;
  limit?: number;
  status?: string;
}

export interface OrderSummaryItem {
  id: string;
  orderNo: string;
  status: string;
  sourcePlanMode: string;
  itemsCount: number;
  totalAmount: number;
  currency: string;
  recipientName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListOrdersResponse {
  items: OrderSummaryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetOrderByIdRequest {
  actor: OrderActorIdentity;
  orderId: string;
}

export interface OrderQuoteSummary {
  quoteId: string;
  quoteNo: string;
  quoteType: string;
  subtotalAmount: number;
  deliveryAmount: number;
  adjustmentAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
}

export interface RingItemSummary {
  id: string;
  itemNo: number;
  sourceRingDesignDraftId: string;
  currentVersionId: string;
  versionNo: number;
  templateVariantId: string;
  templateCode: string;
  templateName: string;
  materialName: string;
  targetSize: number;
  personalizationPackage: string;
  memoryEnabled: boolean;
}

export interface GetOrderByIdResponse {
  id: string;
  orderNo: string;
  status: string;
  sourcePlanMode: string;
  fulfillmentMode: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  deliveryAddressJson: string;
  currentQuote?: OrderQuoteSummary;
  items: RingItemSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface GetOrderTimelineRequest {
  actor: OrderActorIdentity;
  orderId: string;
}

export interface TimelineEventItem {
  eventType: string;
  title: string;
  description: string;
  occurredAt: string;
  status: string;
}

export interface StageGateItem {
  stageCode: string;
  stageName: string;
  status: string;
  isCurrent: boolean;
  completedAt?: string;
}

export interface GetOrderTimelineResponse {
  orderId: string;
  orderNo: string;
  currentStatus: string;
  events: TimelineEventItem[];
  stageGates: StageGateItem[];
}

export interface GetRingItemDetailsRequest {
  actor: OrderActorIdentity;
  orderId: string;
  ringItemId: string;
}

export interface RingItemGemstoneDetail {
  slotNumber: number;
  gemstoneSlotId: string;
  gemstoneOptionId: string;
  gemstoneType: string;
  gemstoneName: string;
  shape: string;
  caratWeight: number;
  color: string;
  clarity: string;
}

export interface GetRingItemDetailsResponse {
  id: string;
  orderId: string;
  itemNo: number;
  sourceRingDesignDraftId: string;
  currentVersionId: string;
  versionNo: number;
  templateVariantId: string;
  templateCode: string;
  templateName: string;
  materialName: string;
  targetSize: number;
  personalizationPackage: string;
  memoryEnabled: boolean;
  gemstones: RingItemGemstoneDetail[];
  createdAt: string;
}

export interface OrderingServiceHandler {
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>;
  listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse>;
  getOrderById(request: GetOrderByIdRequest): Promise<GetOrderByIdResponse>;
  getOrderTimeline(
    request: GetOrderTimelineRequest,
  ): Promise<GetOrderTimelineResponse>;
  getRingItemDetails(
    request: GetRingItemDetailsRequest,
  ): Promise<GetRingItemDetailsResponse>;
}

export interface CommerceOrderingServiceClient {
  createOrder(
    request: CreateOrderRequest,
    metadata?: Metadata,
  ): Observable<CreateOrderResponse>;
  listOrders(
    request: ListOrdersRequest,
    metadata?: Metadata,
  ): Observable<ListOrdersResponse>;
  getOrderById(
    request: GetOrderByIdRequest,
    metadata?: Metadata,
  ): Observable<GetOrderByIdResponse>;
  getOrderTimeline(
    request: GetOrderTimelineRequest,
    metadata?: Metadata,
  ): Observable<GetOrderTimelineResponse>;
  getRingItemDetails(
    request: GetRingItemDetailsRequest,
    metadata?: Metadata,
  ): Observable<GetRingItemDetailsResponse>;
}
