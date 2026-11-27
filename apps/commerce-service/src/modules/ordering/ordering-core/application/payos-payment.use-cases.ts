import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
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
} from './payos.gateway';

function readPaymentLinkId(metadata: unknown): string | undefined {
  if (
    typeof metadata === 'object' &&
    metadata !== null &&
    'paymentLinkId' in metadata &&
    typeof metadata.paymentLinkId === 'string'
  ) {
    return metadata.paymentLinkId;
  }
  return undefined;
}

function readStoredLink(
  metadata: unknown,
): Pick<PayosPaymentLinkData, 'checkoutUrl' | 'qrCode'> | undefined {
  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    !('checkoutUrl' in metadata) ||
    !('qrCode' in metadata) ||
    typeof metadata.checkoutUrl !== 'string' ||
    typeof metadata.qrCode !== 'string'
  ) {
    return undefined;
  }
  return { checkoutUrl: metadata.checkoutUrl, qrCode: metadata.qrCode };
}

function toPaymentLinkResponse(
  tx: OrderingPaymentTransactionRecord,
  orderCode: number,
  paymentLink: Pick<PayosPaymentLinkData, 'checkoutUrl' | 'qrCode'>,
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

    const { transaction, created } =
      await this.repository.beginOrderPaymentAttempt({
        orderId: order.id,
        paymentStage: request.paymentStage,
        providerOrderCode: BigInt(this.payosGateway.generateOrderCode()),
      });
    const orderCode = Number(transaction.providerOrderCode);
    const stage = transaction.paymentStage;
    if (!created) {
      const link = readStoredLink(transaction.metadataJson);
      if (!link) {
        throw new ConflictException('Link đang được tạo, vui lòng thử lại');
      }
      return toPaymentLinkResponse(transaction, orderCode, link, stage);
    }

    const paymentLink = await this.payosGateway.createPaymentLink({
      orderCode,
      amount: transaction.amount,
      description: `MEMORA ${order.orderNo} ${stage}`,
      returnUrl: request.returnUrl || `https://memora.vn/orders/${order.id}`,
      cancelUrl: request.cancelUrl || `https://memora.vn/orders/${order.id}`,
      expiredAt: transaction.expiresAt
        ? Math.floor(transaction.expiresAt.getTime() / 1000)
        : undefined,
    });
    if (
      paymentLink.orderCode !== orderCode ||
      paymentLink.amount !== transaction.amount ||
      paymentLink.currency !== transaction.currency ||
      !paymentLink.paymentLinkId ||
      !paymentLink.checkoutUrl
    ) {
      throw new ServiceUnavailableException(
        'PayOS returned a mismatched payment link',
      );
    }
    const saved = await this.repository.saveOrderPaymentLink(transaction.id, {
      paymentLinkId: paymentLink.paymentLinkId,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
    });
    return toPaymentLinkResponse(saved, orderCode, paymentLink, stage);
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
    let payload: unknown;
    try {
      payload = JSON.parse(request.dataJson);
    } catch {
      throw new BadRequestException('Invalid dataJson in PayOS webhook');
    }
    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload)
    ) {
      throw new BadRequestException('Invalid dataJson in PayOS webhook');
    }
    const payloadData = payload as Record<string, unknown>;

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

    if (
      request.success !== true ||
      request.code !== '00' ||
      payloadData.code !== '00'
    ) {
      return { success: false, message: 'PayOS did not confirm payment' };
    }

    const {
      orderCode: providerCode,
      amount,
      currency,
      paymentLinkId,
      reference,
    } = payloadData;
    if (
      typeof providerCode !== 'number' ||
      !Number.isSafeInteger(providerCode) ||
      providerCode <= 0 ||
      typeof amount !== 'number' ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      typeof currency !== 'string' ||
      typeof paymentLinkId !== 'string' ||
      !paymentLinkId ||
      typeof reference !== 'string' ||
      !reference
    ) {
      throw new BadRequestException('Incomplete payment data from PayOS');
    }
    const orderCode = BigInt(providerCode);
    const tx = await this.repository.findTransactionByOrderCode(orderCode);
    if (!tx) {
      return {
        success: false,
        message: `Transaction with provider_order_code ${orderCode} not found`,
      };
    }

    const storedLinkId = readPaymentLinkId(tx.metadataJson);
    if (
      tx.transactionType !== 'PAYMENT' ||
      tx.provider !== 'PAYOS' ||
      tx.amount !== amount ||
      tx.currency !== currency ||
      (storedLinkId && storedLinkId !== paymentLinkId)
    ) {
      return {
        success: false,
        message: 'PayOS payment requires reconciliation',
      };
    }

    const { transaction: updated, applied } =
      await this.repository.markPaymentTransactionSucceeded({
        transactionId: tx.id,
        providerTransactionId: reference,
        providerReference: reference,
        completedAt: new Date(),
      });

    return {
      success: updated.status === 'SUCCEEDED',
      applied,
      message: applied
        ? 'Payment processed successfully'
        : 'Payment already recorded or requires reconciliation',
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

    if (tx.provider !== 'PAYOS' || tx.transactionType !== 'PAYMENT') {
      throw new BadRequestException('Only PayOS payments can be reconciled');
    }

    if (tx.status === 'SUCCEEDED') {
      const { transaction } =
        await this.repository.markPaymentTransactionSucceeded({
          transactionId: tx.id,
          completedAt: tx.completedAt ?? new Date(),
        });
      return mapPaymentTransactionDetail(transaction);
    }

    if (!tx.providerOrderCode) {
      throw new BadRequestException(
        'Transaction has no provider_order_code to reconcile',
      );
    }

    const info = await this.payosGateway.getPaymentInformation(
      Number(tx.providerOrderCode),
    );

    const storedLinkId = readPaymentLinkId(tx.metadataJson);
    if (
      info?.status === 'PAID' &&
      info.orderCode === Number(tx.providerOrderCode) &&
      info.amount === tx.amount &&
      info.amountPaid === tx.amount &&
      info.amountRemaining === 0 &&
      (!storedLinkId || info.id === storedLinkId)
    ) {
      const { transaction } =
        await this.repository.markPaymentTransactionSucceeded({
          transactionId: tx.id,
          completedAt: new Date(),
        });
      return mapPaymentTransactionDetail(transaction);
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
