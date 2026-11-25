import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ConfirmFinalQuoteRequest,
  ConfirmFinalQuoteResponse,
  CreateFinalQuoteRequest,
  FullQuoteDetail,
  PublishFinalQuoteRequest,
  RejectFinalQuoteRequest,
  RejectFinalQuoteResponse,
  UpdateFinalQuoteRequest,
} from '@app/contracts';
import { mapQuoteToDetail } from './ordering.mapper';
import {
  ORDERING_REPOSITORY,
  type OrderingDetailRecord,
  type OrderingQuoteRecord,
  type OrderingRepository,
} from './ordering.repository';
import { validateOrderingActor } from './ordering.validation';

async function loadActiveIssuedQuote(
  repository: OrderingRepository,
  orderId: string,
  actorId: string,
  requestedQuoteId: string | undefined,
  action: 'confirm' | 'reject',
): Promise<{
  readonly order: OrderingDetailRecord;
  readonly quote: OrderingQuoteRecord;
}> {
  const order = await repository.findOrderById(orderId, actorId);
  if (!order) {
    throw new NotFoundException(`Order ${orderId} not found`);
  }

  const targetQuoteId = requestedQuoteId || order.currentQuoteId;
  if (!targetQuoteId) {
    throw new BadRequestException(
      `Order does not have an active quote to ${action}`,
    );
  }

  const quote = await repository.findQuoteById(orderId, targetQuoteId);
  if (!quote) {
    throw new NotFoundException(`Quote ${targetQuoteId} not found`);
  }

  if (quote.status !== 'ISSUED') {
    const suffix =
      action === 'confirm'
        ? 'Only ISSUED quotes are eligible.'
        : 'Only ISSUED quotes can be rejected.';
    throw new BadRequestException(
      `Quote in status '${quote.status}' cannot be ${action}ed. ${suffix}`,
    );
  }

  return { order, quote };
}

@Injectable()
export class CreateFinalQuoteUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(request: CreateFinalQuoteRequest): Promise<FullQuoteDetail> {
    const order = await this.repository.findAdminOrderById(request.orderId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    if (!request.items || request.items.length === 0) {
      throw new BadRequestException(
        'Final quote must contain at least one line item',
      );
    }

    const quote = await this.repository.createFinalQuote(request);
    if (!quote) {
      throw new NotFoundException('Failed to create quote: order not found');
    }

    return mapQuoteToDetail(quote);
  }
}

@Injectable()
export class UpdateFinalQuoteUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(request: UpdateFinalQuoteRequest): Promise<FullQuoteDetail> {
    const existing = await this.repository.findQuoteById(
      request.orderId,
      request.quoteId,
    );
    if (!existing) {
      throw new NotFoundException(
        `Quote ${request.quoteId} not found for order ${request.orderId}`,
      );
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        `Quote in status '${existing.status}' cannot be modified. Only DRAFT quotes can be edited.`,
      );
    }

    if (existing.quoteType !== 'FINAL') {
      throw new BadRequestException(
        `Quote type '${existing.quoteType}' cannot be modified through this endpoint. Only FINAL quotes are editable.`,
      );
    }

    const updated = await this.repository.updateFinalQuote(request);
    return mapQuoteToDetail(updated);
  }
}

@Injectable()
export class PublishFinalQuoteUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(request: PublishFinalQuoteRequest): Promise<FullQuoteDetail> {
    const existing = await this.repository.findQuoteById(
      request.orderId,
      request.quoteId,
    );
    if (!existing) {
      throw new NotFoundException(
        `Quote ${request.quoteId} not found for order ${request.orderId}`,
      );
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot publish quote in status '${existing.status}'. Expected 'DRAFT'.`,
      );
    }

    const published = await this.repository.publishFinalQuote(
      request.orderId,
      request.quoteId,
    );
    return mapQuoteToDetail(published);
  }
}

@Injectable()
export class ConfirmFinalQuoteUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: ConfirmFinalQuoteRequest,
  ): Promise<ConfirmFinalQuoteResponse> {
    const actor = validateOrderingActor(request.actor);
    if (!actor.userId) {
      throw new ForbiddenException(
        'Only registered customers can confirm a final quote',
      );
    }

    const { order, quote } = await loadActiveIssuedQuote(
      this.repository,
      request.orderId,
      actor.userId,
      request.quoteId,
      'confirm',
    );

    if (quote.validUntil && quote.validUntil < new Date()) {
      throw new BadRequestException(
        'This quote has expired. Please contact our support team for an updated quote.',
      );
    }

    const nextOrderStatus =
      order.sourcePlanMode === 'NONE' ? 'PRODUCTION_AUTHORIZED' : 'AWAITING_P2';

    const confirmation = await this.repository.confirmFinalQuote(
      request.orderId,
      quote.id,
      actor.userId,
      nextOrderStatus,
    );

    return {
      confirmationId: confirmation.id,
      orderId: confirmation.orderId,
      quoteId: confirmation.quoteId,
      status: confirmation.status,
      confirmedAt: confirmation.confirmedAt.toISOString(),
      nextOrderStatus,
      items: [...confirmation.items],
    };
  }
}

@Injectable()
export class RejectFinalQuoteUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: RejectFinalQuoteRequest,
  ): Promise<RejectFinalQuoteResponse> {
    const actor = validateOrderingActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const { quote } = await loadActiveIssuedQuote(
      this.repository,
      request.orderId,
      actorId,
      request.quoteId,
      'reject',
    );

    if (!request.reason || request.reason.trim().length === 0) {
      throw new BadRequestException('A reason for rejection is required');
    }

    await this.repository.rejectFinalQuote(
      request.orderId,
      quote.id,
      request.reason,
    );

    return {
      orderId: request.orderId,
      quoteId: quote.id,
      status: 'REJECTED',
      reason: request.reason,
      updatedOrderStatus: 'PENDING_FINAL_QUOTE',
    };
  }
}
