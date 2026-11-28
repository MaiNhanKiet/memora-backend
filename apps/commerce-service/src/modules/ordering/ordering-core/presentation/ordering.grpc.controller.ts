import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { COMMERCE_RING_ITEM_REVIEW_SERVICE_NAME } from '@app/contracts';
import type {
  AcceptServiceQuoteRequest,
  AcceptServiceQuoteResponse,
  ApplyRingItemReviewTransitionRequest,
  ApplyRingItemReviewTransitionResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  ConfirmFinalQuoteRequest,
  ConfirmFinalQuoteResponse,
  CreateClaimPaymentLinkRequest,
  CreateFinalQuoteRequest,
  CreateOrderPaymentLinkRequest,
  CreateOrderRequest,
  CreateOrderResponse,
  CreateRefundRequestMessage,
  CreateRefundResponse,
  FullQuoteDetail,
  GetAdminOrderDetailsRequest,
  GetAdminOrderDetailsResponse,
  GetOrderByIdRequest,
  GetOrderByIdResponse,
  GetOrderFinalConfirmationsRequest,
  GetOrderFinalConfirmationsResponse,
  GetOrderInvoiceRequest,
  GetOrderPaymentByIdRequest,
  GetOrderPersonalizationContextRequest,
  GetOrderPersonalizationContextResponse,
  GetOrderQuoteByIdRequest,
  GetOrderTimelineRequest,
  GetOrderTimelineResponse,
  GetPaymentReceiptRequest,
  GetRingItemDetailsRequest,
  GetRingItemDetailsResponse,
  ListAdminOrdersRequest,
  ListAdminOrdersResponse,
  ListClaimQuotesRequest,
  ListClaimQuotesResponse,
  ListOrderPaymentsRequest,
  ListOrderPaymentsResponse,
  ListOrderQuotesRequest,
  ListOrderQuotesResponse,
  ListOrdersRequest,
  ListOrdersResponse,
  ListRingItemVersionsRequest,
  ListRingItemVersionsResponse,
  OrderInvoiceDetail,
  OrderingServiceHandler,
  PaymentLinkResponse,
  PaymentReceiptDetail,
  PaymentTransactionDetail,
  PayosWebhookRequest,
  PayosWebhookResponse,
  PublishFinalQuoteRequest,
  ReconcilePaymentTransactionRequest,
  RejectFinalQuoteRequest,
  RejectFinalQuoteResponse,
  UpdateCurrentRingItemVersionRequest,
  UpdateCurrentRingItemVersionResponse,
  UpdateFinalQuoteRequest,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse,
} from '@app/contracts';
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';
import { ApplyRingItemReviewTransitionUseCase } from '../application/apply-ring-item-review-transition.use-case';
import {
  AcceptServiceQuoteUseCase,
  ListClaimQuotesUseCase,
} from '../application/claim-quote.use-cases';
import { CreateOrderUseCase } from '../application/create-order.use-case';
import {
  ConfirmFinalQuoteUseCase,
  CreateFinalQuoteUseCase,
  PublishFinalQuoteUseCase,
  RejectFinalQuoteUseCase,
  UpdateFinalQuoteUseCase,
} from '../application/final-quote.use-cases';
import {
  CancelOrderUseCase,
  UpdateOrderStatusUseCase,
} from '../application/order-lifecycle.use-cases';
import {
  GetAdminOrderDetailsUseCase,
  GetOrderByIdUseCase,
  GetOrderPersonalizationContextUseCase,
  GetOrderTimelineUseCase,
  ListAdminOrdersUseCase,
  ListOrdersUseCase,
} from '../application/order-query.use-cases';
import {
  GetOrderFinalConfirmationsUseCase,
  GetOrderQuoteByIdUseCase,
  ListOrderQuotesUseCase,
} from '../application/order-quote-query.use-cases';
import {
  CreateRefundRequestUseCase,
  GetOrderInvoiceUseCase,
  GetOrderPaymentByIdUseCase,
  GetPaymentReceiptUseCase,
  ListOrderPaymentsUseCase,
} from '../application/payment-query-and-refund.use-cases';
import {
  CreateClaimPaymentLinkUseCase,
  CreateOrderPaymentLinkUseCase,
  ProcessPayosWebhookUseCase,
  ReconcilePaymentTransactionUseCase,
} from '../application/payos-payment.use-cases';
import {
  GetRingItemDetailsUseCase,
  ListRingItemVersionsUseCase,
  UpdateCurrentRingItemVersionUseCase,
} from '../application/ring-item.use-cases';

/** Thin gRPC adapter. Actor parsing and resource authorization live in the use cases. */
@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class OrderingGrpcController implements OrderingServiceHandler {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly listOrdersUseCase: ListOrdersUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase,
    private readonly getOrderTimelineUseCase: GetOrderTimelineUseCase,
    private readonly getRingItemDetailsUseCase: GetRingItemDetailsUseCase,
    private readonly listAdminOrdersUseCase: ListAdminOrdersUseCase,
    private readonly getAdminOrderDetailsUseCase: GetAdminOrderDetailsUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private readonly listRingItemVersionsUseCase: ListRingItemVersionsUseCase,
    private readonly updateCurrentRingItemVersionUseCase: UpdateCurrentRingItemVersionUseCase,
    private readonly applyRingItemReviewTransitionUseCase: ApplyRingItemReviewTransitionUseCase,
    private readonly listOrderQuotesUseCase: ListOrderQuotesUseCase,
    private readonly getOrderPersonalizationContextUseCase: GetOrderPersonalizationContextUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly createFinalQuoteUseCase: CreateFinalQuoteUseCase,
    private readonly updateFinalQuoteUseCase: UpdateFinalQuoteUseCase,
    private readonly publishFinalQuoteUseCase: PublishFinalQuoteUseCase,
    private readonly getOrderQuoteByIdUseCase: GetOrderQuoteByIdUseCase,
    private readonly confirmFinalQuoteUseCase: ConfirmFinalQuoteUseCase,
    private readonly rejectFinalQuoteUseCase: RejectFinalQuoteUseCase,
    private readonly getOrderFinalConfirmationsUseCase: GetOrderFinalConfirmationsUseCase,
    private readonly listOrderPaymentsUseCase: ListOrderPaymentsUseCase,
    private readonly getOrderPaymentByIdUseCase: GetOrderPaymentByIdUseCase,
    private readonly getPaymentReceiptUseCase: GetPaymentReceiptUseCase,
    private readonly getOrderInvoiceUseCase: GetOrderInvoiceUseCase,
    private readonly createRefundRequestUseCase: CreateRefundRequestUseCase,
    private readonly listClaimQuotesUseCase: ListClaimQuotesUseCase,
    private readonly acceptServiceQuoteUseCase: AcceptServiceQuoteUseCase,
    private readonly createOrderPaymentLinkUseCase: CreateOrderPaymentLinkUseCase,
    private readonly processPayosWebhookUseCase: ProcessPayosWebhookUseCase,
    private readonly reconcilePaymentTransactionUseCase: ReconcilePaymentTransactionUseCase,
    private readonly createClaimPaymentLinkUseCase: CreateClaimPaymentLinkUseCase,
  ) {}

  @GrpcMethod('OrderingService', 'CreateOrder')
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.createOrderUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'ListOrders')
  listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse> {
    return this.listOrdersUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderById')
  getOrderById(request: GetOrderByIdRequest): Promise<GetOrderByIdResponse> {
    return this.getOrderByIdUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderTimeline')
  getOrderTimeline(
    request: GetOrderTimelineRequest,
  ): Promise<GetOrderTimelineResponse> {
    return this.getOrderTimelineUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'GetRingItemDetails')
  getRingItemDetails(
    request: GetRingItemDetailsRequest,
  ): Promise<GetRingItemDetailsResponse> {
    return this.getRingItemDetailsUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'ListAdminOrders')
  listAdminOrders(
    request: ListAdminOrdersRequest,
  ): Promise<ListAdminOrdersResponse> {
    return this.listAdminOrdersUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'GetAdminOrderDetails')
  getAdminOrderDetails(
    request: GetAdminOrderDetailsRequest,
  ): Promise<GetAdminOrderDetailsResponse> {
    return this.getAdminOrderDetailsUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'UpdateOrderStatus')
  updateOrderStatus(
    request: UpdateOrderStatusRequest,
  ): Promise<UpdateOrderStatusResponse> {
    return this.updateOrderStatusUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'ListRingItemVersions')
  listRingItemVersions(
    request: ListRingItemVersionsRequest,
  ): Promise<ListRingItemVersionsResponse> {
    return this.listRingItemVersionsUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'UpdateCurrentRingItemVersion')
  updateCurrentRingItemVersion(
    request: UpdateCurrentRingItemVersionRequest,
  ): Promise<UpdateCurrentRingItemVersionResponse> {
    return this.updateCurrentRingItemVersionUseCase.execute(request);
  }

  @GrpcMethod(
    COMMERCE_RING_ITEM_REVIEW_SERVICE_NAME,
    'ApplyRingItemReviewTransition',
  )
  applyRingItemReviewTransition(
    request: ApplyRingItemReviewTransitionRequest,
  ): Promise<ApplyRingItemReviewTransitionResponse> {
    return this.applyRingItemReviewTransitionUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'ListOrderQuotes')
  listOrderQuotes(
    request: ListOrderQuotesRequest,
  ): Promise<ListOrderQuotesResponse> {
    return this.listOrderQuotesUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderPersonalizationContext')
  getOrderPersonalizationContext(
    request: GetOrderPersonalizationContextRequest,
  ): Promise<GetOrderPersonalizationContextResponse> {
    return this.getOrderPersonalizationContextUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'CancelOrder')
  cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResponse> {
    return this.cancelOrderUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'CreateFinalQuote')
  createFinalQuote(request: CreateFinalQuoteRequest): Promise<FullQuoteDetail> {
    return this.createFinalQuoteUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'UpdateFinalQuote')
  updateFinalQuote(request: UpdateFinalQuoteRequest): Promise<FullQuoteDetail> {
    return this.updateFinalQuoteUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'PublishFinalQuote')
  publishFinalQuote(
    request: PublishFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
    return this.publishFinalQuoteUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderQuoteById')
  getOrderQuoteById(
    request: GetOrderQuoteByIdRequest,
  ): Promise<FullQuoteDetail> {
    return this.getOrderQuoteByIdUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'ConfirmFinalQuote')
  confirmFinalQuote(
    request: ConfirmFinalQuoteRequest,
  ): Promise<ConfirmFinalQuoteResponse> {
    return this.confirmFinalQuoteUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'RejectFinalQuote')
  rejectFinalQuote(
    request: RejectFinalQuoteRequest,
  ): Promise<RejectFinalQuoteResponse> {
    return this.rejectFinalQuoteUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderFinalConfirmations')
  getOrderFinalConfirmations(
    request: GetOrderFinalConfirmationsRequest,
  ): Promise<GetOrderFinalConfirmationsResponse> {
    return this.getOrderFinalConfirmationsUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'ListOrderPayments')
  listOrderPayments(
    request: ListOrderPaymentsRequest,
  ): Promise<ListOrderPaymentsResponse> {
    return this.listOrderPaymentsUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderPaymentById')
  getOrderPaymentById(
    request: GetOrderPaymentByIdRequest,
  ): Promise<PaymentTransactionDetail> {
    return this.getOrderPaymentByIdUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'GetPaymentReceipt')
  getPaymentReceipt(
    request: GetPaymentReceiptRequest,
  ): Promise<PaymentReceiptDetail> {
    return this.getPaymentReceiptUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderInvoice')
  getOrderInvoice(
    request: GetOrderInvoiceRequest,
  ): Promise<OrderInvoiceDetail> {
    return this.getOrderInvoiceUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'CreateRefundRequest')
  createRefundRequest(
    request: CreateRefundRequestMessage,
  ): Promise<CreateRefundResponse> {
    return this.createRefundRequestUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'ListClaimQuotes')
  listClaimQuotes(
    request: ListClaimQuotesRequest,
  ): Promise<ListClaimQuotesResponse> {
    return this.listClaimQuotesUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'AcceptServiceQuote')
  acceptServiceQuote(
    request: AcceptServiceQuoteRequest,
  ): Promise<AcceptServiceQuoteResponse> {
    return this.acceptServiceQuoteUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'CreateOrderPaymentLink')
  createOrderPaymentLink(
    request: CreateOrderPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    return this.createOrderPaymentLinkUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'ProcessPayosWebhook')
  processPayosWebhook(
    request: PayosWebhookRequest,
  ): Promise<PayosWebhookResponse> {
    return this.processPayosWebhookUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'ReconcilePaymentTransaction')
  reconcilePaymentTransaction(
    request: ReconcilePaymentTransactionRequest,
  ): Promise<PaymentTransactionDetail> {
    return this.reconcilePaymentTransactionUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'CreateClaimPaymentLink')
  createClaimPaymentLink(
    request: CreateClaimPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    return this.createClaimPaymentLinkUseCase.execute(request);
  }
}
