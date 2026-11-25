import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import type {
  AcceptServiceQuoteRequest,
  AcceptServiceQuoteResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  CommerceOrderingServiceClient,
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
import { DomainGrpcClient } from '../../../common/grpc/domain-grpc';

export const COMMERCE_ORDERING_GRPC_CLIENT = 'COMMERCE_ORDERING_GRPC_CLIENT';

@Injectable()
export class OrderingGrpcClient
  extends DomainGrpcClient
  implements OnModuleInit
{
  private orderingService!: CommerceOrderingServiceClient;

  constructor(
    @Inject(COMMERCE_ORDERING_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
    configService: ConfigService,
  ) {
    super(configService, 'apiGateway.commerceInternalGrpcSecret', {
      optional: true,
    });
  }

  onModuleInit(): void {
    this.orderingService =
      this.grpcClient.getService<CommerceOrderingServiceClient>(
        'OrderingService',
      );
  }

  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.unary((metadata) =>
      this.orderingService.createOrder(request, metadata),
    );
  }

  listOrders(request: ListOrdersRequest): Promise<ListOrdersResponse> {
    return this.unary((metadata) =>
      this.orderingService.listOrders(request, metadata),
    );
  }

  getOrderById(request: GetOrderByIdRequest): Promise<GetOrderByIdResponse> {
    return this.unary((metadata) =>
      this.orderingService.getOrderById(request, metadata),
    );
  }

  getOrderTimeline(
    request: GetOrderTimelineRequest,
  ): Promise<GetOrderTimelineResponse> {
    return this.unary((metadata) =>
      this.orderingService.getOrderTimeline(request, metadata),
    );
  }

  getRingItemDetails(
    request: GetRingItemDetailsRequest,
  ): Promise<GetRingItemDetailsResponse> {
    return this.unary((metadata) =>
      this.orderingService.getRingItemDetails(request, metadata),
    );
  }

  listAdminOrders(
    request: ListAdminOrdersRequest,
  ): Promise<ListAdminOrdersResponse> {
    return this.unary((metadata) =>
      this.orderingService.listAdminOrders(request, metadata),
    );
  }

  getAdminOrderDetails(
    request: GetAdminOrderDetailsRequest,
  ): Promise<GetAdminOrderDetailsResponse> {
    return this.unary((metadata) =>
      this.orderingService.getAdminOrderDetails(request, metadata),
    );
  }

  updateOrderStatus(
    request: UpdateOrderStatusRequest,
  ): Promise<UpdateOrderStatusResponse> {
    return this.unary((metadata) =>
      this.orderingService.updateOrderStatus(request, metadata),
    );
  }

  listRingItemVersions(
    request: ListRingItemVersionsRequest,
  ): Promise<ListRingItemVersionsResponse> {
    return this.unary((metadata) =>
      this.orderingService.listRingItemVersions(request, metadata),
    );
  }

  updateCurrentRingItemVersion(
    request: UpdateCurrentRingItemVersionRequest,
  ): Promise<UpdateCurrentRingItemVersionResponse> {
    return this.unary((metadata) =>
      this.orderingService.updateCurrentRingItemVersion(request, metadata),
    );
  }

  listOrderQuotes(
    request: ListOrderQuotesRequest,
  ): Promise<ListOrderQuotesResponse> {
    return this.unary((metadata) =>
      this.orderingService.listOrderQuotes(request, metadata),
    );
  }

  cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResponse> {
    return this.unary((metadata) =>
      this.orderingService.cancelOrder(request, metadata),
    );
  }

  createFinalQuote(request: CreateFinalQuoteRequest): Promise<FullQuoteDetail> {
    return this.unary((metadata) =>
      this.orderingService.createFinalQuote(request, metadata),
    );
  }

  updateFinalQuote(request: UpdateFinalQuoteRequest): Promise<FullQuoteDetail> {
    return this.unary((metadata) =>
      this.orderingService.updateFinalQuote(request, metadata),
    );
  }

  publishFinalQuote(
    request: PublishFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
    return this.unary((metadata) =>
      this.orderingService.publishFinalQuote(request, metadata),
    );
  }

  getOrderQuoteById(
    request: GetOrderQuoteByIdRequest,
  ): Promise<FullQuoteDetail> {
    return this.unary((metadata) =>
      this.orderingService.getOrderQuoteById(request, metadata),
    );
  }

  confirmFinalQuote(
    request: ConfirmFinalQuoteRequest,
  ): Promise<ConfirmFinalQuoteResponse> {
    return this.unary((metadata) =>
      this.orderingService.confirmFinalQuote(request, metadata),
    );
  }

  rejectFinalQuote(
    request: RejectFinalQuoteRequest,
  ): Promise<RejectFinalQuoteResponse> {
    return this.unary((metadata) =>
      this.orderingService.rejectFinalQuote(request, metadata),
    );
  }

  getOrderFinalConfirmations(
    request: GetOrderFinalConfirmationsRequest,
  ): Promise<GetOrderFinalConfirmationsResponse> {
    return this.unary((metadata) =>
      this.orderingService.getOrderFinalConfirmations(request, metadata),
    );
  }

  listOrderPayments(
    request: ListOrderPaymentsRequest,
  ): Promise<ListOrderPaymentsResponse> {
    return this.unary((metadata) =>
      this.orderingService.listOrderPayments(request, metadata),
    );
  }

  getOrderPaymentById(
    request: GetOrderPaymentByIdRequest,
  ): Promise<PaymentTransactionDetail> {
    return this.unary((metadata) =>
      this.orderingService.getOrderPaymentById(request, metadata),
    );
  }

  getPaymentReceipt(
    request: GetPaymentReceiptRequest,
  ): Promise<PaymentReceiptDetail> {
    return this.unary((metadata) =>
      this.orderingService.getPaymentReceipt(request, metadata),
    );
  }

  getOrderInvoice(
    request: GetOrderInvoiceRequest,
  ): Promise<OrderInvoiceDetail> {
    return this.unary((metadata) =>
      this.orderingService.getOrderInvoice(request, metadata),
    );
  }

  createRefundRequest(
    request: CreateRefundRequestMessage,
  ): Promise<CreateRefundResponse> {
    return this.unary((metadata) =>
      this.orderingService.createRefundRequest(request, metadata),
    );
  }

  listClaimQuotes(
    request: ListClaimQuotesRequest,
  ): Promise<ListClaimQuotesResponse> {
    return this.unary((metadata) =>
      this.orderingService.listClaimQuotes(request, metadata),
    );
  }

  acceptServiceQuote(
    request: AcceptServiceQuoteRequest,
  ): Promise<AcceptServiceQuoteResponse> {
    return this.unary((metadata) =>
      this.orderingService.acceptServiceQuote(request, metadata),
    );
  }

  createOrderPaymentLink(
    request: CreateOrderPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    return this.unary((metadata) =>
      this.orderingService.createOrderPaymentLink(request, metadata),
    );
  }

  processPayosWebhook(
    request: PayosWebhookRequest,
  ): Promise<PayosWebhookResponse> {
    return this.unary((metadata) =>
      this.orderingService.processPayosWebhook(request, metadata),
    );
  }

  reconcilePaymentTransaction(
    request: ReconcilePaymentTransactionRequest,
  ): Promise<PaymentTransactionDetail> {
    return this.unary((metadata) =>
      this.orderingService.reconcilePaymentTransaction(request, metadata),
    );
  }

  createClaimPaymentLink(
    request: CreateClaimPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    return this.unary((metadata) =>
      this.orderingService.createClaimPaymentLink(request, metadata),
    );
  }
}
