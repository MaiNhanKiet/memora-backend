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
  PaymentLinkResponse,
  PaymentTransactionDetail,
  PayosWebhookRequest,
  PayosWebhookResponse,
  ReconcilePaymentTransactionRequest,
} from '@app/contracts';
import {
  resolveNextOrderStatusAfterPayment,
  resolvePaymentStageForOrderStatus,
} from './ordering-state';
import { mapPaymentTransactionDetail } from './ordering.mapper';
import {
  ORDERING_REPOSITORY,
  type OrderingPaymentTransactionRecord,
  type OrderingRepository,
} from './ordering.repository';
import {
  resolveOrderingActorId,
  validateOrderingActor,
} from './ordering.validation';
import {
  PAYOS_GATEWAY,
  type PayosGateway,
  type PayosPaymentLinkData,
  type PayosWebhookData,
} from './payos.gateway';

function toPaymentLinkResponse(
  tx: OrderingPaymentTransactionRecord,
  orderCode: number,
  paymentLink: PayosPaymentLinkData,
  paymentStage: string,
): PaymentLinkResponse {
  return {
    transactionId: tx.id,
    orderCode,
    checkoutUrl: paymentLink.checkoutUrl,
    qrCode: paymentLink.qrCode,
    amount: tx.amount,
    currency: tx.currency,
    paymentStage,
    status: tx.status,
    expiresAt: tx.expiresAt?.toISOString(),
  };
}

@Injectable()
export class CreateOrderPaymentLinkUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
    @Inject(PAYOS_GATEWAY)
    private readonly payosGateway: PayosGateway,
  ) {}

  async execute(
    request: CreateOrderPaymentLinkRequest,
  ): Promise<PaymentLinkResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);

    const order = await this.repository.findOrderById(
      request.orderId,
      actorId,
      guestSessionId,
    );
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

    const orderCode = this.payosGateway.generateOrderCode();
    const returnUrl =
      request.returnUrl || `https://memora.vn/orders/${order.id}`;
    const cancelUrl =
      request.cancelUrl || `https://memora.vn/orders/${order.id}`;

    const paymentLink = await this.payosGateway.createPaymentLink({
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

    return toPaymentLinkResponse(tx, orderCode, paymentLink, stage);
  }
}

@Injectable()
export class ProcessPayosWebhookUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
    @Inject(PAYOS_GATEWAY)
    private readonly payosGateway: PayosGateway,
  ) {}

  async execute(request: PayosWebhookRequest): Promise<PayosWebhookResponse> {
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

    const isValid = this.payosGateway.verifyWebhookSignature({
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
}

@Injectable()
export class ReconcilePaymentTransactionUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
    @Inject(PAYOS_GATEWAY)
    private readonly payosGateway: PayosGateway,
  ) {}

  async execute(
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

    const info = await this.payosGateway.getPaymentInformation(
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
}

@Injectable()
export class CreateClaimPaymentLinkUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
    @Inject(PAYOS_GATEWAY)
    private readonly payosGateway: PayosGateway,
  ) {}

  async execute(
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

    const orderCode = this.payosGateway.generateOrderCode();
    const returnUrl =
      request.returnUrl || `https://memora.vn/claims/${request.claimId}`;
    const cancelUrl =
      request.cancelUrl || `https://memora.vn/claims/${request.claimId}`;

    const paymentLink = await this.payosGateway.createPaymentLink({
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

    return toPaymentLinkResponse(tx, orderCode, paymentLink, 'SERVICE_FEE');
  }
}
