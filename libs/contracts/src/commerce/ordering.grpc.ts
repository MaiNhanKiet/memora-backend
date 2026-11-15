// Contract gRPC của Commerce Ordering, khớp proto/commerce/v1/ordering.proto.

import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type { VerifiedActor } from '../common/actor';

export const COMMERCE_ORDERING_SERVICE_NAME = 'OrderingService';

export interface OrderPreP1Acknowledgement {
  noticeVersion: string;
  privacyNoticeAcknowledged: boolean;
  p1NonrefundAcknowledged: boolean;
}

export interface CreateOrderRequest {
  actor: VerifiedActor;
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
  actor: VerifiedActor;
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
  actor: VerifiedActor;
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
  actor: VerifiedActor;
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
  actor: VerifiedActor;
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

export interface ListAdminOrdersRequest {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminOrderSummaryItem {
  id: string;
  orderNo: string;
  status: string;
  sourcePlanMode: string;
  ownerCustomerIdentityId: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  itemsCount: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAdminOrdersResponse {
  items: AdminOrderSummaryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetAdminOrderDetailsRequest {
  orderId: string;
}

export interface AdminCustomerInfo {
  customerIdentityId: string;
  guestEmail?: string;
  guestPhone?: string;
  guestEmailVerifiedAt?: string;
}

export interface GetAdminOrderDetailsResponse {
  id: string;
  orderNo: string;
  status: string;
  sourcePlanMode: string;
  fulfillmentMode?: string;
  customer: AdminCustomerInfo;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  deliveryAddressJson?: string;
  preP1EvidenceJson?: string;
  currentQuote?: OrderQuoteSummary;
  items: RingItemSummary[];
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrderStatusRequest {
  orderId: string;
  targetStatus: string;
  reason?: string;
  staffUserId?: string;
}

export interface UpdateOrderStatusResponse {
  orderId: string;
  orderNo: string;
  previousStatus: string;
  currentStatus: string;
  updatedAt: string;
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

export interface ListRingItemVersionsRequest {
  actor: VerifiedActor;
  orderId: string;
  ringItemId: string;
}

export interface RingItemVersionSummary {
  id: string;
  versionNo: number;
  status: string;
  targetSize: number;
  personalizationPackage: string;
  memoryEnabled: boolean;
  changeReason?: string;
  templateVariantId: string;
  templateCode: string;
  templateName: string;
  materialName: string;
  gemstones: RingItemGemstoneDetail[];
  createdAt: string;
}

export interface ListRingItemVersionsResponse {
  ringItemId: string;
  orderId: string;
  versions: RingItemVersionSummary[];
}

export interface RingItemGemstoneInput {
  slotNumber: number;
  gemstoneOptionId: string;
}

export interface UpdateCurrentRingItemVersionRequest {
  actor: VerifiedActor;
  orderId: string;
  ringItemId: string;
  targetSize?: number;
  changeReason?: string;
  memoryEnabled?: boolean;
  gemstoneSelections?: RingItemGemstoneInput[];
}

export interface UpdateCurrentRingItemVersionResponse {
  ringItemId: string;
  versionId: string;
  versionNo: number;
  status: string;
  targetSize: number;
  changeReason?: string;
  updatedAt: string;
}

export interface ListOrderQuotesRequest {
  actor: VerifiedActor;
  orderId: string;
}

export interface QuoteLineItem {
  id: string;
  componentType: string;
  description?: string;
  quantity: number;
  unitAmount: number;
  lineAmount: number;
  priceSourceType: string;
}

export interface FullQuoteDetail {
  id: string;
  quoteNo: string;
  quoteType: string;
  versionNo: number;
  status: string;
  subtotalAmount: number;
  deliveryAmount: number;
  adjustmentAmount: number;
  totalAmount: number;
  currency: string;
  items: QuoteLineItem[];
  createdAt: string;
}

export interface ListOrderQuotesResponse {
  orderId: string;
  quotes: FullQuoteDetail[];
}

export interface GetOrderPersonalizationContextRequest {
  orderId: string;
}

export interface PersonalizationRingItem {
  ringItemId: string;
  itemNo: number;
  currentVersionId: string;
  personalizationPackage: string;
  versionStatus: string;
}

export interface GetOrderPersonalizationContextResponse {
  orderId: string;
  ownerCustomerIdentityId: string;
  status: string;
  p1Paid: boolean;
  sourcePlanMode: string;
  ringItems: PersonalizationRingItem[];
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
  listAdminOrders(
    request: ListAdminOrdersRequest,
  ): Promise<ListAdminOrdersResponse>;
  getAdminOrderDetails(
    request: GetAdminOrderDetailsRequest,
  ): Promise<GetAdminOrderDetailsResponse>;
  updateOrderStatus(
    request: UpdateOrderStatusRequest,
  ): Promise<UpdateOrderStatusResponse>;
  listRingItemVersions(
    request: ListRingItemVersionsRequest,
  ): Promise<ListRingItemVersionsResponse>;
  updateCurrentRingItemVersion(
    request: UpdateCurrentRingItemVersionRequest,
  ): Promise<UpdateCurrentRingItemVersionResponse>;
  listOrderQuotes(
    request: ListOrderQuotesRequest,
  ): Promise<ListOrderQuotesResponse>;
  getOrderPersonalizationContext(
    request: GetOrderPersonalizationContextRequest,
  ): Promise<GetOrderPersonalizationContextResponse>;
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
  listAdminOrders(
    request: ListAdminOrdersRequest,
    metadata?: Metadata,
  ): Observable<ListAdminOrdersResponse>;
  getAdminOrderDetails(
    request: GetAdminOrderDetailsRequest,
    metadata?: Metadata,
  ): Observable<GetAdminOrderDetailsResponse>;
  updateOrderStatus(
    request: UpdateOrderStatusRequest,
    metadata?: Metadata,
  ): Observable<UpdateOrderStatusResponse>;
  listRingItemVersions(
    request: ListRingItemVersionsRequest,
    metadata?: Metadata,
  ): Observable<ListRingItemVersionsResponse>;
  updateCurrentRingItemVersion(
    request: UpdateCurrentRingItemVersionRequest,
    metadata?: Metadata,
  ): Observable<UpdateCurrentRingItemVersionResponse>;
  listOrderQuotes(
    request: ListOrderQuotesRequest,
    metadata?: Metadata,
  ): Observable<ListOrderQuotesResponse>;
  getOrderPersonalizationContext(
    request: GetOrderPersonalizationContextRequest,
    metadata?: Metadata,
  ): Observable<GetOrderPersonalizationContextResponse>;
}
