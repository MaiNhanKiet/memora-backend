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
import { OrderingService } from '../../application/ordering/ordering.service';
import { CommerceInternalGrpcAuthGuard } from '../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class OrderingGrpcController implements OrderingServiceHandler {
  constructor(private readonly orderingService: OrderingService) {}

  @GrpcMethod('OrderingService', 'CreateOrder')
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.orderingService.createOrder(request);
  }

  @GrpcMethod('OrderingService', 'ListOrders')
  listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse> {
    return this.orderingService.listOrders(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderById')
  getOrderById(request: GetOrderByIdRequest): Promise<GetOrderByIdResponse> {
    return this.orderingService.getOrderById(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderTimeline')
  getOrderTimeline(
    request: GetOrderTimelineRequest,
  ): Promise<GetOrderTimelineResponse> {
    return this.orderingService.getOrderTimeline(request);
  }

  @GrpcMethod('OrderingService', 'GetRingItemDetails')
  getRingItemDetails(
    request: GetRingItemDetailsRequest,
  ): Promise<GetRingItemDetailsResponse> {
    return this.orderingService.getRingItemDetails(request);
  }

  @GrpcMethod('OrderingService', 'ListAdminOrders')
  listAdminOrders(
    request: ListAdminOrdersRequest,
  ): Promise<ListAdminOrdersResponse> {
    return this.orderingService.listAdminOrders(request);
  }

  @GrpcMethod('OrderingService', 'GetAdminOrderDetails')
  getAdminOrderDetails(
    request: GetAdminOrderDetailsRequest,
  ): Promise<GetAdminOrderDetailsResponse> {
    return this.orderingService.getAdminOrderDetails(request);
  }

  @GrpcMethod('OrderingService', 'UpdateOrderStatus')
  updateOrderStatus(
    request: UpdateOrderStatusRequest,
  ): Promise<UpdateOrderStatusResponse> {
    return this.orderingService.updateOrderStatus(request);
  }

  @GrpcMethod('OrderingService', 'ListRingItemVersions')
  listRingItemVersions(
    request: ListRingItemVersionsRequest,
  ): Promise<ListRingItemVersionsResponse> {
    return this.orderingService.listRingItemVersions(request);
  }

  @GrpcMethod('OrderingService', 'UpdateCurrentRingItemVersion')
  updateCurrentRingItemVersion(
    request: UpdateCurrentRingItemVersionRequest,
  ): Promise<UpdateCurrentRingItemVersionResponse> {
    return this.orderingService.updateCurrentRingItemVersion(request);
  }

  @GrpcMethod('OrderingService', 'ListOrderQuotes')
  listOrderQuotes(
    request: ListOrderQuotesRequest,
  ): Promise<ListOrderQuotesResponse> {
    return this.orderingService.listOrderQuotes(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderPersonalizationContext')
  getOrderPersonalizationContext(
    request: GetOrderPersonalizationContextRequest,
  ): Promise<GetOrderPersonalizationContextResponse> {
    return this.orderingService.getOrderPersonalizationContext(request);
  }

  @GrpcMethod('OrderingService', 'CancelOrder')
  cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResponse> {
    return this.orderingService.cancelOrder(request);
  }

  @GrpcMethod('OrderingService', 'CreateFinalQuote')
  createFinalQuote(
    request: CreateFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
    return this.orderingService.createFinalQuote(request);
  }

  @GrpcMethod('OrderingService', 'UpdateFinalQuote')
  updateFinalQuote(
    request: UpdateFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
    return this.orderingService.updateFinalQuote(request);
  }

  @GrpcMethod('OrderingService', 'PublishFinalQuote')
  publishFinalQuote(
    request: PublishFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
    return this.orderingService.publishFinalQuote(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderQuoteById')
  getOrderQuoteById(
    request: GetOrderQuoteByIdRequest,
  ): Promise<FullQuoteDetail> {
    return this.orderingService.getOrderQuoteById(request);
  }

  @GrpcMethod('OrderingService', 'ConfirmFinalQuote')
  confirmFinalQuote(
    request: ConfirmFinalQuoteRequest,
  ): Promise<ConfirmFinalQuoteResponse> {
    return this.orderingService.confirmFinalQuote(request);
  }

  @GrpcMethod('OrderingService', 'RejectFinalQuote')
  rejectFinalQuote(
    request: RejectFinalQuoteRequest,
  ): Promise<RejectFinalQuoteResponse> {
    return this.orderingService.rejectFinalQuote(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderFinalConfirmations')
  getOrderFinalConfirmations(
    request: GetOrderFinalConfirmationsRequest,
  ): Promise<GetOrderFinalConfirmationsResponse> {
    return this.orderingService.getOrderFinalConfirmations(request);
  }

  @GrpcMethod('OrderingService', 'ListOrderPayments')
  listOrderPayments(
    request: ListOrderPaymentsRequest,
  ): Promise<ListOrderPaymentsResponse> {
    return this.orderingService.listOrderPayments(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderPaymentById')
  getOrderPaymentById(
    request: GetOrderPaymentByIdRequest,
  ): Promise<PaymentTransactionDetail> {
    return this.orderingService.getOrderPaymentById(request);
  }

  @GrpcMethod('OrderingService', 'GetPaymentReceipt')
  getPaymentReceipt(
    request: GetPaymentReceiptRequest,
  ): Promise<PaymentReceiptDetail> {
    return this.orderingService.getPaymentReceipt(request);
  }

  @GrpcMethod('OrderingService', 'GetOrderInvoice')
  getOrderInvoice(
    request: GetOrderInvoiceRequest,
  ): Promise<OrderInvoiceDetail> {
    return this.orderingService.getOrderInvoice(request);
  }

  @GrpcMethod('OrderingService', 'CreateRefundRequest')
  createRefundRequest(
    request: CreateRefundRequestMessage,
  ): Promise<CreateRefundResponse> {
    return this.orderingService.createRefundRequest(request);
  }

  @GrpcMethod('OrderingService', 'ListClaimQuotes')
  listClaimQuotes(
    request: ListClaimQuotesRequest,
  ): Promise<ListClaimQuotesResponse> {
    return this.orderingService.listClaimQuotes(request);
  }

  @GrpcMethod('OrderingService', 'AcceptServiceQuote')
  acceptServiceQuote(
    request: AcceptServiceQuoteRequest,
  ): Promise<AcceptServiceQuoteResponse> {
    return this.orderingService.acceptServiceQuote(request);
  }

  @GrpcMethod('OrderingService', 'CreateOrderPaymentLink')
  createOrderPaymentLink(
    request: CreateOrderPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    return this.orderingService.createOrderPaymentLink(request);
  }

  @GrpcMethod('OrderingService', 'ProcessPayosWebhook')
  processPayosWebhook(
    request: PayosWebhookRequest,
  ): Promise<PayosWebhookResponse> {
    return this.orderingService.processPayosWebhook(request);
  }

  @GrpcMethod('OrderingService', 'ReconcilePaymentTransaction')
  reconcilePaymentTransaction(
    request: ReconcilePaymentTransactionRequest,
  ): Promise<PaymentTransactionDetail> {
    return this.orderingService.reconcilePaymentTransaction(request);
  }

  @GrpcMethod('OrderingService', 'CreateClaimPaymentLink')
  createClaimPaymentLink(
    request: CreateClaimPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    return this.orderingService.createClaimPaymentLink(request);
  }
}
