import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  AcceptServiceQuoteRequest,
  AcceptServiceQuoteResponse,
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
import { CreateOrderUseCase } from '../application/create-order.use-case';
import { OrderLifecycleUseCases } from '../application/order-lifecycle.use-cases';
import { OrderQueryUseCases } from '../application/order-query.use-cases';
import { PaymentUseCases } from '../application/payment.use-cases';
import { QuoteUseCases } from '../application/quote.use-cases';
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class OrderingGrpcController implements OrderingServiceHandler {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly orderQueryUseCases: OrderQueryUseCases,
    private readonly orderLifecycleUseCases: OrderLifecycleUseCases,
    private readonly quoteUseCases: QuoteUseCases,
    private readonly paymentUseCases: PaymentUseCases,
  ) {}

  @GrpcMethod('OrderingService', 'CreateOrder')
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.createOrderUseCase.execute(request);
  }

  @GrpcMethod('OrderingService', 'ListOrders')
  listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse> {
    return this.orderQueryUseCases.listOrders(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderById')
  getOrderById(request: GetOrderByIdRequest): Promise<GetOrderByIdResponse> {
    return this.orderQueryUseCases.getOrderById(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderTimeline')
  getOrderTimeline(
    request: GetOrderTimelineRequest,
  ): Promise<GetOrderTimelineResponse> {
    return this.orderQueryUseCases.getOrderTimeline(request);
  }

  @GrpcMethod('OrderingService', 'GetRingItemDetails')
  getRingItemDetails(
    request: GetRingItemDetailsRequest,
  ): Promise<GetRingItemDetailsResponse> {
    return this.orderQueryUseCases.getRingItemDetails(request);
  }

  @GrpcMethod('OrderingService', 'ListAdminOrders')
  listAdminOrders(
    request: ListAdminOrdersRequest,
  ): Promise<ListAdminOrdersResponse> {
    return this.orderQueryUseCases.listAdminOrders(request);
  }

  @GrpcMethod('OrderingService', 'GetAdminOrderDetails')
  getAdminOrderDetails(
    request: GetAdminOrderDetailsRequest,
  ): Promise<GetAdminOrderDetailsResponse> {
    return this.orderQueryUseCases.getAdminOrderDetails(request);
  }

  @GrpcMethod('OrderingService', 'UpdateOrderStatus')
  updateOrderStatus(
    request: UpdateOrderStatusRequest,
  ): Promise<UpdateOrderStatusResponse> {
    return this.orderLifecycleUseCases.updateOrderStatus(request);
  }

  @GrpcMethod('OrderingService', 'ListRingItemVersions')
  listRingItemVersions(
    request: ListRingItemVersionsRequest,
  ): Promise<ListRingItemVersionsResponse> {
    return this.orderQueryUseCases.listRingItemVersions(request);
  }

  @GrpcMethod('OrderingService', 'UpdateCurrentRingItemVersion')
  updateCurrentRingItemVersion(
    request: UpdateCurrentRingItemVersionRequest,
  ): Promise<UpdateCurrentRingItemVersionResponse> {
    return this.orderQueryUseCases.updateCurrentRingItemVersion(request);
  }

  @GrpcMethod('OrderingService', 'ListOrderQuotes')
  listOrderQuotes(
    request: ListOrderQuotesRequest,
  ): Promise<ListOrderQuotesResponse> {
    return this.quoteUseCases.listOrderQuotes(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderPersonalizationContext')
  getOrderPersonalizationContext(
    request: GetOrderPersonalizationContextRequest,
  ): Promise<GetOrderPersonalizationContextResponse> {
    return this.orderQueryUseCases.getOrderPersonalizationContext(request);
  }

  @GrpcMethod('OrderingService', 'CancelOrder')
  cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResponse> {
    return this.orderLifecycleUseCases.cancelOrder(request);
  }

  @GrpcMethod('OrderingService', 'CreateFinalQuote')
  createFinalQuote(request: CreateFinalQuoteRequest): Promise<FullQuoteDetail> {
    return this.quoteUseCases.createFinalQuote(request);
  }

  @GrpcMethod('OrderingService', 'UpdateFinalQuote')
  updateFinalQuote(request: UpdateFinalQuoteRequest): Promise<FullQuoteDetail> {
    return this.quoteUseCases.updateFinalQuote(request);
  }

  @GrpcMethod('OrderingService', 'PublishFinalQuote')
  publishFinalQuote(
    request: PublishFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
    return this.quoteUseCases.publishFinalQuote(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderQuoteById')
  getOrderQuoteById(
    request: GetOrderQuoteByIdRequest,
  ): Promise<FullQuoteDetail> {
    return this.quoteUseCases.getOrderQuoteById(request);
  }

  @GrpcMethod('OrderingService', 'ConfirmFinalQuote')
  confirmFinalQuote(
    request: ConfirmFinalQuoteRequest,
  ): Promise<ConfirmFinalQuoteResponse> {
    return this.quoteUseCases.confirmFinalQuote(request);
  }

  @GrpcMethod('OrderingService', 'RejectFinalQuote')
  rejectFinalQuote(
    request: RejectFinalQuoteRequest,
  ): Promise<RejectFinalQuoteResponse> {
    return this.quoteUseCases.rejectFinalQuote(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderFinalConfirmations')
  getOrderFinalConfirmations(
    request: GetOrderFinalConfirmationsRequest,
  ): Promise<GetOrderFinalConfirmationsResponse> {
    return this.quoteUseCases.getOrderFinalConfirmations(request);
  }

  @GrpcMethod('OrderingService', 'ListOrderPayments')
  listOrderPayments(
    request: ListOrderPaymentsRequest,
  ): Promise<ListOrderPaymentsResponse> {
    return this.paymentUseCases.listOrderPayments(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderPaymentById')
  getOrderPaymentById(
    request: GetOrderPaymentByIdRequest,
  ): Promise<PaymentTransactionDetail> {
    return this.paymentUseCases.getOrderPaymentById(request);
  }

  @GrpcMethod('OrderingService', 'GetPaymentReceipt')
  getPaymentReceipt(
    request: GetPaymentReceiptRequest,
  ): Promise<PaymentReceiptDetail> {
    return this.paymentUseCases.getPaymentReceipt(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderInvoice')
  getOrderInvoice(
    request: GetOrderInvoiceRequest,
  ): Promise<OrderInvoiceDetail> {
    return this.paymentUseCases.getOrderInvoice(request);
  }

  @GrpcMethod('OrderingService', 'CreateRefundRequest')
  createRefundRequest(
    request: CreateRefundRequestMessage,
  ): Promise<CreateRefundResponse> {
    return this.paymentUseCases.createRefundRequest(request);
  }

  @GrpcMethod('OrderingService', 'ListClaimQuotes')
  listClaimQuotes(
    request: ListClaimQuotesRequest,
  ): Promise<ListClaimQuotesResponse> {
    return this.quoteUseCases.listClaimQuotes(request);
  }

  @GrpcMethod('OrderingService', 'AcceptServiceQuote')
  acceptServiceQuote(
    request: AcceptServiceQuoteRequest,
  ): Promise<AcceptServiceQuoteResponse> {
    return this.quoteUseCases.acceptServiceQuote(request);
  }

  @GrpcMethod('OrderingService', 'CreateOrderPaymentLink')
  createOrderPaymentLink(
    request: CreateOrderPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    return this.paymentUseCases.createOrderPaymentLink(request);
  }

  @GrpcMethod('OrderingService', 'ProcessPayosWebhook')
  processPayosWebhook(
    request: PayosWebhookRequest,
  ): Promise<PayosWebhookResponse> {
    return this.paymentUseCases.processPayosWebhook(request);
  }

  @GrpcMethod('OrderingService', 'ReconcilePaymentTransaction')
  reconcilePaymentTransaction(
    request: ReconcilePaymentTransactionRequest,
  ): Promise<PaymentTransactionDetail> {
    return this.paymentUseCases.reconcilePaymentTransaction(request);
  }

  @GrpcMethod('OrderingService', 'CreateClaimPaymentLink')
  createClaimPaymentLink(
    request: CreateClaimPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    return this.paymentUseCases.createClaimPaymentLink(request);
  }
}
