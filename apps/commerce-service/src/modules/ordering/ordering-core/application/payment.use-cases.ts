import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateClaimPaymentLinkRequest,
  CreateOrderPaymentLinkRequest,
  CreateRefundRequestMessage,
  CreateRefundResponse,
  GetOrderInvoiceRequest,
  GetOrderPaymentByIdRequest,
  GetPaymentReceiptRequest,
  ListOrderPaymentsRequest,
  ListOrderPaymentsResponse,
  OrderInvoiceDetail,
  PaymentLinkResponse,
  PaymentReceiptDetail,
  PaymentTransactionDetail,
  PayosWebhookRequest,
  PayosWebhookResponse,
  ReconcilePaymentTransactionRequest,
} from '@app/contracts';
import type { PayosWebhookData } from '../infrastructure/payment/payos.interface';
import { PayosProvider } from '../infrastructure/payment/payos.provider';
import {
  resolveNextOrderStatusAfterPayment,
  resolvePaymentStageForOrderStatus,
} from './ordering-state';
import {
  mapOrderInvoice,
  mapPaymentReceipt,
  mapPaymentTransactionDetail,
} from './ordering.mapper';
import {
  ORDERING_REPOSITORY,
  type OrderingRepository,
} from './ordering.repository';
import { validateOrderingActor } from './ordering.validation';

@Injectable()
export class PaymentUseCases {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
    private readonly payosProvider: PayosProvider,
  ) {}

  async listOrderPayments(
    request: ListOrderPaymentsRequest,
  ): Promise<ListOrderPaymentsResponse> {
    const actor = validateOrderingActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const payments = await this.repository.findOrderPayments(request.orderId);
    const totalPaidAmount = payments
      .filter(
        (p) => p.status === 'SUCCEEDED' && p.transactionType === 'PAYMENT',
      )
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      orderId: request.orderId,
      totalPaidAmount,
      currency: payments[0]?.currency || 'VND',
      payments: payments.map((p) => ({
        id: p.id,
        orderId: p.orderId || request.orderId,
        paymentStage: p.paymentStage,
        transactionType: p.transactionType,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        paymentMethod: p.paymentMethod,
        requestedAt: p.requestedAt.toISOString(),
        completedAt: p.completedAt?.toISOString(),
        receiptNo: p.receiptNo,
      })),
    };
  }

  async getOrderPaymentById(
    request: GetOrderPaymentByIdRequest,
  ): Promise<PaymentTransactionDetail> {
    const actor = validateOrderingActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const p = await this.repository.findOrderPaymentById(
      request.orderId,
      request.transactionId,
    );
    if (!p) {
      throw new NotFoundException(
        `Payment transaction ${request.transactionId} not found for order ${request.orderId}`,
      );
    }

    return mapPaymentTransactionDetail(p, request.orderId);
  }

  async getPaymentReceipt(
    request: GetPaymentReceiptRequest,
  ): Promise<PaymentReceiptDetail> {
    const actor = validateOrderingActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const tx = await this.repository.findPaymentReceipt(
      request.orderId,
      request.transactionId,
    );
    if (!tx) {
      throw new NotFoundException(
        `Payment transaction ${request.transactionId} not found for order ${request.orderId}`,
      );
    }

    if (tx.status !== 'SUCCEEDED') {
      throw new BadRequestException(
        `Receipt is only available for SUCCEEDED transactions. Current status: '${tx.status}'.`,
      );
    }

    return mapPaymentReceipt(tx, request.orderId);
  }

  async getOrderInvoice(
    request: GetOrderInvoiceRequest,
  ): Promise<OrderInvoiceDetail> {
    const actor = validateOrderingActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const orderDetails = await this.repository.findOrderInvoice(
      request.orderId,
    );
    if (!orderDetails) {
      throw new NotFoundException(
        `Invoice details not found for order ${request.orderId}`,
      );
    }

    return mapOrderInvoice(orderDetails);
  }

  async createRefundRequest(
    request: CreateRefundRequestMessage,
  ): Promise<CreateRefundResponse> {
    if (!request.refundAmount || request.refundAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    if (!request.reason || request.reason.trim().length === 0) {
      throw new BadRequestException('A reason for the refund is required');
    }

    const refund = await this.repository.createRefundRequest(request);
    if (!refund) {
      throw new NotFoundException(
        `Original payment transaction ${request.transactionId} not found`,
      );
    }

    return {
      refundTransactionId: refund.id,
      originalTransactionId:
        refund.relatedTransactionId || request.transactionId,
      orderId: refund.orderId || '',
      refundAmount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      requestedAt: refund.requestedAt.toISOString(),
      reason: request.reason,
    };
  }

  async createOrderPaymentLink(
    request: CreateOrderPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    const actor = validateOrderingActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const stage = resolvePaymentStageForOrderStatus(
      order.status,
      request.paymentStage,
    );

    const currentQuote = order.currentQuote;
    const totalAmount = currentQuote?.totalAmount ?? 0;
    const currency = currentQuote?.currency || 'VND';

    let amount = totalAmount;
    if (stage === 'DEPOSIT_P1') {
      amount = Math.round(totalAmount * 0.3);
    } else if (stage === 'MILESTONE_P2') {
      amount = Math.round(totalAmount * 0.4);
    } else if (stage === 'FINAL_P3') {
      const existingPayments = await this.repository.findOrderPayments(
        order.id,
      );
      const paid = existingPayments
        .filter(
          (p) => p.status === 'SUCCEEDED' && p.transactionType === 'PAYMENT',
        )
        .reduce((sum, p) => sum + p.amount, 0);
      amount = Math.max(0, totalAmount - paid);
    }

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    const orderCode = this.payosProvider.generateOrderCode();
    const returnUrl =
      request.returnUrl || `https://memora.vn/orders/${order.id}`;
    const cancelUrl =
      request.cancelUrl || `https://memora.vn/orders/${order.id}`;

    const paymentLink = await this.payosProvider.createPaymentLink({
      orderCode,
      amount,
      description: `MEMORA ${order.orderNo} ${stage}`,
      returnUrl,
      cancelUrl,
    });

    const tx = await this.repository.createPaymentTransaction({
      orderId: order.id,
      paymentStage: stage,
      providerOrderCode: BigInt(orderCode),
      amount,
      currency,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      metadata: {
        paymentLinkId: paymentLink.paymentLinkId,
        checkoutUrl: paymentLink.checkoutUrl,
        qrCode: paymentLink.qrCode,
      },
    });

    return {
      transactionId: tx.id,
      orderCode,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      amount,
      currency: tx.currency,
      paymentStage: stage,
      status: tx.status,
      expiresAt: tx.expiresAt?.toISOString(),
    };
  }

  async processPayosWebhook(
    request: PayosWebhookRequest,
  ): Promise<PayosWebhookResponse> {
    let payloadData: PayosWebhookData;
    try {
      const parsed: unknown =
        typeof request.dataJson === 'string'
          ? (JSON.parse(request.dataJson) as unknown)
          : request.dataJson;
      payloadData = parsed as PayosWebhookData;
    } catch {
      throw new BadRequestException('Invalid dataJson in PayOS webhook');
    }

    const isValid = this.payosProvider.verifyWebhookSignature({
      code: request.code,
      desc: request.desc,
      success: request.success,
      data: payloadData,
      signature: request.signature,
    });

    if (!isValid) {
      throw new ForbiddenException('Invalid PayOS webhook signature');
    }

    const orderCode = BigInt(payloadData.orderCode);
    const tx = await this.repository.findTransactionByOrderCode(orderCode);
    if (!tx) {
      return {
        success: false,
        message: `Transaction with provider_order_code ${orderCode} not found`,
      };
    }

    if (tx.status === 'SUCCEEDED') {
      return {
        success: true,
        message: 'Transaction already processed',
        transactionId: tx.id,
        status: tx.status,
        orderId: tx.orderId,
      };
    }

    const nextOrderStatus = resolveNextOrderStatusAfterPayment(
      tx.paymentStage,
      tx.orderStatus,
    );

    const updated = await this.repository.markPaymentTransactionSucceeded({
      transactionId: tx.id,
      providerTransactionId: payloadData.reference || payloadData.paymentLinkId,
      providerReference: payloadData.reference,
      completedAt: payloadData.transactionDateTime
        ? new Date(payloadData.transactionDateTime)
        : new Date(),
      nextOrderStatus,
    });

    return {
      success: true,
      message: 'Payment processed successfully',
      transactionId: updated.id,
      status: updated.status,
      orderId: tx.orderId,
    };
  }

  async reconcilePaymentTransaction(
    request: ReconcilePaymentTransactionRequest,
  ): Promise<PaymentTransactionDetail> {
    const tx = await this.repository.findPaymentTransactionById(
      request.transactionId,
    );
    if (!tx) {
      throw new NotFoundException(
        `Transaction ${request.transactionId} not found`,
      );
    }

    if (tx.status === 'SUCCEEDED') {
      return mapPaymentTransactionDetail(tx);
    }

    if (!tx.providerOrderCode) {
      throw new BadRequestException(
        'Transaction has no provider_order_code to reconcile',
      );
    }

    const info = await this.payosProvider.getPaymentInformation(
      Number(tx.providerOrderCode),
    );

    if (info && info.status === 'PAID') {
      const nextOrderStatus = resolveNextOrderStatusAfterPayment(
        tx.paymentStage,
        tx.orderStatus,
      );

      const updated = await this.repository.markPaymentTransactionSucceeded({
        transactionId: tx.id,
        completedAt: new Date(),
        nextOrderStatus,
      });

      return mapPaymentTransactionDetail(updated);
    }

    return mapPaymentTransactionDetail(tx);
  }

  async createClaimPaymentLink(
    request: CreateClaimPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    if (!request.claimId) {
      throw new BadRequestException('Claim ID is required');
    }
    validateOrderingActor(request.actor);

    const quotes = await this.repository.findClaimQuotes(request.claimId);
    const acceptedQuote = quotes.find((q) => q.status === 'ACCEPTED');
    if (!acceptedQuote) {
      throw new BadRequestException(
        `No ACCEPTED service quote found for claim ${request.claimId}`,
      );
    }

    const amount = acceptedQuote.totalAmount;
    if (amount <= 0) {
      throw new BadRequestException(
        'Accepted quote amount must be greater than 0',
      );
    }

    const orderCode = this.payosProvider.generateOrderCode();
    const returnUrl =
      request.returnUrl || `https://memora.vn/claims/${request.claimId}`;
    const cancelUrl =
      request.cancelUrl || `https://memora.vn/claims/${request.claimId}`;

    const paymentLink = await this.payosProvider.createPaymentLink({
      orderCode,
      amount,
      description: `MEMORA CLAIM ${acceptedQuote.quoteNo}`,
      returnUrl,
      cancelUrl,
    });

    const tx = await this.repository.createPaymentTransaction({
      claimId: request.claimId,
      quoteId: acceptedQuote.id,
      paymentStage: 'SERVICE_FEE',
      providerOrderCode: BigInt(orderCode),
      amount,
      currency: acceptedQuote.currency || 'VND',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      metadata: {
        paymentLinkId: paymentLink.paymentLinkId,
        checkoutUrl: paymentLink.checkoutUrl,
        qrCode: paymentLink.qrCode,
      },
    });

    return {
      transactionId: tx.id,
      orderCode,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      amount,
      currency: tx.currency,
      paymentStage: 'SERVICE_FEE',
      status: tx.status,
      expiresAt: tx.expiresAt?.toISOString(),
    };
  }
}
