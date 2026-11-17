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
  ringItemId?: string;
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
  validUntil?: string;
  issuedAt?: string;
  acceptedAt?: string;
}

export interface ListOrderQuotesResponse {
  orderId: string;
  quotes: FullQuoteDetail[];
}

export interface CancelOrderRequest {
  actor: VerifiedActor;
  orderId: string;
  reason?: string;
}

export interface CancelOrderResponse {
  orderId: string;
  status: string;
  cancelledAt: string;
  cancellationReason?: string;
}

export interface QuoteLineItemInput {
  ringItemId?: string;
  componentType: string;
  description?: string;
  quantity?: number;
  unitAmount: number;
  lineAmount: number;
  priceSourceType?: string;
}

export interface CreateFinalQuoteRequest {
  orderId: string;
  subtotalAmount?: number;
  deliveryAmount?: number;
  adjustmentAmount?: number;
  totalAmount: number;
  currency?: string;
  validUntil?: string;
  staffUserId?: string;
  items: QuoteLineItemInput[];
}

export interface UpdateQuoteLineItemInput {
  id?: string;
  ringItemId?: string;
  componentType: string;
  description?: string;
  quantity?: number;
  unitAmount: number;
  lineAmount: number;
  priceSourceType?: string;
}

export interface UpdateFinalQuoteRequest {
  orderId: string;
  quoteId: string;
  subtotalAmount?: number;
  deliveryAmount?: number;
  adjustmentAmount?: number;
  totalAmount?: number;
  validUntil?: string;
  staffUserId?: string;
  items?: UpdateQuoteLineItemInput[];
}

export interface PublishFinalQuoteRequest {
  orderId: string;
  quoteId: string;
  staffUserId?: string;
}

export interface GetOrderQuoteByIdRequest {
  actor?: VerifiedActor;
  orderId: string;
  quoteId: string;
}

export interface FinalConfirmationItemSummary {
  id: string;
  ringItemId: string;
  ringItemVersionId: string;
  versionNo: number;
}

export interface ConfirmFinalQuoteRequest {
  actor: VerifiedActor;
  orderId: string;
  quoteId?: string;
  notes?: string;
}

export interface ConfirmFinalQuoteResponse {
  confirmationId: string;
  orderId: string;
  quoteId: string;
  status: string;
  confirmedAt: string;
  nextOrderStatus: string;
  items: FinalConfirmationItemSummary[];
}

export interface RejectFinalQuoteRequest {
  actor: VerifiedActor;
  orderId: string;
  quoteId?: string;
  reason: string;
}

export interface RejectFinalQuoteResponse {
  orderId: string;
  quoteId: string;
  status: string;
  reason: string;
  updatedOrderStatus: string;
}

export interface GetOrderFinalConfirmationsRequest {
  actor: VerifiedActor;
  orderId: string;
}

export interface FinalConfirmationDetail {
  id: string;
  orderId: string;
  quoteId: string;
  quoteNo: string;
  quoteTotalAmount: number;
  confirmedByCustomerIdentityId: string;
  status: string;
  confirmedAt: string;
  invalidatedAt?: string;
  invalidationReason?: string;
  items: FinalConfirmationItemSummary[];
}

export interface GetOrderFinalConfirmationsResponse {
  orderId: string;
  confirmations: FinalConfirmationDetail[];
}

export interface ListOrderPaymentsRequest {
  actor: VerifiedActor;
  orderId: string;
}

export interface PaymentTransactionSummary {
  id: string;
  orderId: string;
  paymentStage: string;
  transactionType: string;
  amount: number;
  currency: string;
  status: string;
  provider?: string;
  paymentMethod?: string;
  requestedAt: string;
  completedAt?: string;
  receiptNo?: string;
}

export interface ListOrderPaymentsResponse {
  orderId: string;
  totalPaidAmount: number;
  currency: string;
  payments: PaymentTransactionSummary[];
}

export interface GetOrderPaymentByIdRequest {
  actor: VerifiedActor;
  orderId: string;
  transactionId: string;
}

export interface PaymentTransactionDetail {
  id: string;
  orderId: string;
  paymentStage: string;
  transactionType: string;
  amount: number;
  currency: string;
  status: string;
  provider?: string;
  paymentMethod?: string;
  providerOrderCode?: string;
  providerTransactionId?: string;
  providerReference?: string;
  relatedTransactionId?: string;
  requestedAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  receiptNo?: string;
  receiptIssuedAt?: string;
  metadataJson?: string;
}

export interface GetPaymentReceiptRequest {
  actor: VerifiedActor;
  orderId: string;
  transactionId: string;
}

export interface PaymentReceiptDetail {
  receiptNo: string;
  transactionId: string;
  orderId: string;
  orderNo: string;
  paymentStage: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  completedAt: string;
  recipientName: string;
  issuedAt: string;
}

export interface GetOrderInvoiceRequest {
  actor: VerifiedActor;
  orderId: string;
}

export interface InvoiceItemSummary {
  componentType: string;
  description: string;
  quantity: number;
  unitAmount: number;
  lineAmount: number;
}

export interface InvoicePaymentRecord {
  paymentStage: string;
  amount: number;
  completedAt: string;
  receiptNo?: string;
}

export interface OrderInvoiceDetail {
  invoiceNo: string;
  orderId: string;
  orderNo: string;
  status: string;
  issuedAt: string;
  totalAmount: number;
  totalPaidAmount: number;
  remainingAmount: number;
  currency: string;
  recipientName: string;
  recipientPhone?: string;
  deliveryAddressJson?: string;
  items: InvoiceItemSummary[];
  paymentTransactions: InvoicePaymentRecord[];
}

export interface CreateRefundRequestMessage {
  transactionId: string;
  refundAmount: number;
  reason: string;
  notes?: string;
  staffUserId?: string;
}

export interface CreateRefundResponse {
  refundTransactionId: string;
  originalTransactionId: string;
  orderId: string;
  refundAmount: number;
  currency: string;
  status: string;
  requestedAt: string;
  reason: string;
}

export interface ListClaimQuotesRequest {
  claimId: string;
  actor: VerifiedActor;
}

export interface ListClaimQuotesResponse {
  quotes: FullQuoteDetail[];
}

export interface AcceptServiceQuoteRequest {
  claimId: string;
  quoteId: string;
  actor: VerifiedActor;
}

export interface AcceptServiceQuoteResponse {
  success: boolean;
  quoteId: string;
  status: string;
  acceptedAt: string;
}

export interface CreateOrderPaymentLinkRequest {
  orderId: string;
  paymentStage?: string;
  returnUrl?: string;
  cancelUrl?: string;
  actor: VerifiedActor;
}

export interface PaymentLinkResponse {
  transactionId: string;
  orderCode: number | string;
  checkoutUrl: string;
  qrCode: string;
  amount: number;
  currency: string;
  paymentStage: string;
  status: string;
  expiresAt?: string;
}

export interface PayosWebhookRequest {
  code: string;
  desc: string;
  success: boolean;
  dataJson: string;
  signature: string;
}

export interface PayosWebhookResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  status?: string;
}

export interface ReconcilePaymentTransactionRequest {
  transactionId: string;
  actor: VerifiedActor;
}

export interface CreateClaimPaymentLinkRequest {
  claimId: string;
  returnUrl?: string;
  cancelUrl?: string;
  actor: VerifiedActor;
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
  cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResponse>;
  createFinalQuote(request: CreateFinalQuoteRequest): Promise<FullQuoteDetail>;
  updateFinalQuote(request: UpdateFinalQuoteRequest): Promise<FullQuoteDetail>;
  publishFinalQuote(
    request: PublishFinalQuoteRequest,
  ): Promise<FullQuoteDetail>;
  getOrderQuoteById(
    request: GetOrderQuoteByIdRequest,
  ): Promise<FullQuoteDetail>;
  confirmFinalQuote(
    request: ConfirmFinalQuoteRequest,
  ): Promise<ConfirmFinalQuoteResponse>;
  rejectFinalQuote(
    request: RejectFinalQuoteRequest,
  ): Promise<RejectFinalQuoteResponse>;
  getOrderFinalConfirmations(
    request: GetOrderFinalConfirmationsRequest,
  ): Promise<GetOrderFinalConfirmationsResponse>;
  listOrderPayments(
    request: ListOrderPaymentsRequest,
  ): Promise<ListOrderPaymentsResponse>;
  getOrderPaymentById(
    request: GetOrderPaymentByIdRequest,
  ): Promise<PaymentTransactionDetail>;
  getPaymentReceipt(
    request: GetPaymentReceiptRequest,
  ): Promise<PaymentReceiptDetail>;
  getOrderInvoice(request: GetOrderInvoiceRequest): Promise<OrderInvoiceDetail>;
  createRefundRequest(
    request: CreateRefundRequestMessage,
  ): Promise<CreateRefundResponse>;
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
  cancelOrder(
    request: CancelOrderRequest,
    metadata?: Metadata,
  ): Observable<CancelOrderResponse>;
  createFinalQuote(
    request: CreateFinalQuoteRequest,
    metadata?: Metadata,
  ): Observable<FullQuoteDetail>;
  updateFinalQuote(
    request: UpdateFinalQuoteRequest,
    metadata?: Metadata,
  ): Observable<FullQuoteDetail>;
  publishFinalQuote(
    request: PublishFinalQuoteRequest,
    metadata?: Metadata,
  ): Observable<FullQuoteDetail>;
  getOrderQuoteById(
    request: GetOrderQuoteByIdRequest,
    metadata?: Metadata,
  ): Observable<FullQuoteDetail>;
  confirmFinalQuote(
    request: ConfirmFinalQuoteRequest,
    metadata?: Metadata,
  ): Observable<ConfirmFinalQuoteResponse>;
  rejectFinalQuote(
    request: RejectFinalQuoteRequest,
    metadata?: Metadata,
  ): Observable<RejectFinalQuoteResponse>;
  getOrderFinalConfirmations(
    request: GetOrderFinalConfirmationsRequest,
    metadata?: Metadata,
  ): Observable<GetOrderFinalConfirmationsResponse>;
  listOrderPayments(
    request: ListOrderPaymentsRequest,
    metadata?: Metadata,
  ): Observable<ListOrderPaymentsResponse>;
  getOrderPaymentById(
    request: GetOrderPaymentByIdRequest,
    metadata?: Metadata,
  ): Observable<PaymentTransactionDetail>;
  getPaymentReceipt(
    request: GetPaymentReceiptRequest,
    metadata?: Metadata,
  ): Observable<PaymentReceiptDetail>;
  getOrderInvoice(
    request: GetOrderInvoiceRequest,
    metadata?: Metadata,
  ): Observable<OrderInvoiceDetail>;
  createRefundRequest(
    request: CreateRefundRequestMessage,
    metadata?: Metadata,
  ): Observable<CreateRefundResponse>;
  listClaimQuotes(
    request: ListClaimQuotesRequest,
    metadata?: Metadata,
  ): Observable<ListClaimQuotesResponse>;
  acceptServiceQuote(
    request: AcceptServiceQuoteRequest,
    metadata?: Metadata,
  ): Observable<AcceptServiceQuoteResponse>;
  createOrderPaymentLink(
    request: CreateOrderPaymentLinkRequest,
    metadata?: Metadata,
  ): Observable<PaymentLinkResponse>;
  processPayosWebhook(
    request: PayosWebhookRequest,
    metadata?: Metadata,
  ): Observable<PayosWebhookResponse>;
  reconcilePaymentTransaction(
    request: ReconcilePaymentTransactionRequest,
    metadata?: Metadata,
  ): Observable<PaymentTransactionDetail>;
  createClaimPaymentLink(
    request: CreateClaimPaymentLinkRequest,
    metadata?: Metadata,
  ): Observable<PaymentLinkResponse>;
}
