import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { parseVerifiedActor, requireUserActor } from '@app/common';
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
  OPERATIONS_CLAIM_ACCESS,
  type OperationsClaimAccess,
} from './operations-claim-access.port';
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
        `No issued invoice found for order ${request.orderId}`,
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
    @Inject(OPERATIONS_CLAIM_ACCESS)
    private readonly claimAccess: OperationsClaimAccess,
  ) {}

  async execute(
    request: CreateRefundRequestMessage,
  ): Promise<CreateRefundResponse> {
    if (!isUUID(request.transactionId)) {
      throw new BadRequestException('Transaction ID must be a UUID');
    }
    if (!Number.isFinite(request.refundAmount) || request.refundAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    if (!request.reason || request.reason.trim().length === 0) {
      throw new BadRequestException('A reason for the refund is required');
    }

    const staffUserId =
      request.actor || request.claimId
        ? requireUserActor(parseVerifiedActor(request.actor)).userId
        : request.staffUserId;
    const claimId = request.claimId;
    let returnReceipt: Parameters<
      OrderingRepository['createRefundRequest']
    >[0]['returnReceipt'];
    if (claimId !== undefined) {
      if (!isUUID(claimId))
        throw new BadRequestException('Claim ID must be a UUID');
      const receipt = await this.claimAccess.getReturnReceipt(claimId);
      if (!receipt.eligible) {
        throw new ConflictException('A verified ring return is required');
      }
      returnReceipt = { ...receipt, claimId };
    }
    const refund = await this.repository.createRefundRequest({
      transactionId: request.transactionId,
      refundAmount: request.refundAmount,
      reason: request.reason,
      notes: request.notes,
      staffUserId,
      returnReceipt,
    });
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
