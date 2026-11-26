import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateRefundRequestMessage,
  CreateRefundResponse,
  GetOrderInvoiceRequest,
  GetOrderPaymentByIdRequest,
  GetPaymentReceiptRequest,
  ListOrderPaymentsRequest,
  ListOrderPaymentsResponse,
  OrderInvoiceDetail,
  PaymentReceiptDetail,
  PaymentTransactionDetail,
  VerifiedActor,
} from '@app/contracts';
import {
  mapOrderInvoice,
  mapPaymentReceipt,
  mapPaymentTransactionDetail,
} from './ordering.mapper';
import {
  ORDERING_REPOSITORY,
  type OrderingRepository,
} from './ordering.repository';
import {
  resolveOrderingActorId,
  validateOrderingActor,
} from './ordering.validation';

async function assertOrderExistsForActor(
  repository: OrderingRepository,
  actorInput: VerifiedActor | undefined,
  orderId: string,
): Promise<void> {
  const actor = validateOrderingActor(actorInput);
  const { actorId, guestSessionId } = resolveOrderingActorId(actor);
  const order = await repository.findOrderById(
    orderId,
    actorId,
    guestSessionId,
  );
  if (!order) {
    throw new NotFoundException(`Order ${orderId} not found`);
  }
}

@Injectable()
export class ListOrderPaymentsUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: ListOrderPaymentsRequest,
  ): Promise<ListOrderPaymentsResponse> {
    await assertOrderExistsForActor(
      this.repository,
      request.actor,
      request.orderId,
    );

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
}

@Injectable()
export class GetOrderPaymentByIdUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: GetOrderPaymentByIdRequest,
  ): Promise<PaymentTransactionDetail> {
    await assertOrderExistsForActor(
      this.repository,
      request.actor,
      request.orderId,
    );

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
}

@Injectable()
export class GetPaymentReceiptUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: GetPaymentReceiptRequest,
  ): Promise<PaymentReceiptDetail> {
    await assertOrderExistsForActor(
      this.repository,
      request.actor,
      request.orderId,
    );

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
}

@Injectable()
export class GetOrderInvoiceUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(request: GetOrderInvoiceRequest): Promise<OrderInvoiceDetail> {
    await assertOrderExistsForActor(
      this.repository,
      request.actor,
      request.orderId,
    );

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
}

@Injectable()
export class CreateRefundRequestUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
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
}
