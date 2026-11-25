import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AcceptServiceQuoteRequest,
  AcceptServiceQuoteResponse,
  ConfirmFinalQuoteRequest,
  ConfirmFinalQuoteResponse,
  CreateFinalQuoteRequest,
  FullQuoteDetail,
  GetOrderFinalConfirmationsRequest,
  GetOrderFinalConfirmationsResponse,
  GetOrderQuoteByIdRequest,
  ListClaimQuotesRequest,
  ListClaimQuotesResponse,
  ListOrderQuotesRequest,
  ListOrderQuotesResponse,
  PublishFinalQuoteRequest,
  RejectFinalQuoteRequest,
  RejectFinalQuoteResponse,
  UpdateFinalQuoteRequest,
} from '@app/contracts';
import { mapQuoteToDetail } from './ordering.mapper';
import {
  ORDERING_REPOSITORY,
  type OrderingRepository,
} from './ordering.repository';
import {
  resolveOrderingActorId,
  validateOrderingActor,
} from './ordering.validation';

@Injectable()
export class QuoteUseCases {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async listOrderQuotes(
    request: ListOrderQuotesRequest,
  ): Promise<ListOrderQuotesResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId, guestSessionId } = resolveOrderingActorId(actor);

    const quotes = await this.repository.listOrderQuotes(
      request.orderId,
      actorId,
      guestSessionId,
    );
    if (!quotes) {
      throw new NotFoundException('Order not found or access denied');
    }

    return {
      orderId: request.orderId,
      quotes: quotes.map((q) => mapQuoteToDetail(q)),
    };
  }

  async createFinalQuote(
    request: CreateFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
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

  async updateFinalQuote(
    request: UpdateFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
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

  async publishFinalQuote(
    request: PublishFinalQuoteRequest,
  ): Promise<FullQuoteDetail> {
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

  async getOrderQuoteById(
    request: GetOrderQuoteByIdRequest,
  ): Promise<FullQuoteDetail> {
    if (request.actor) {
      const actor = validateOrderingActor(request.actor);
      const actorId = actor.userId ?? actor.guestSessionId!;
      const order = await this.repository.findOrderById(
        request.orderId,
        actorId,
      );
      if (!order) {
        throw new NotFoundException(`Order ${request.orderId} not found`);
      }
    }

    const quote = await this.repository.findQuoteById(
      request.orderId,
      request.quoteId,
    );
    if (!quote) {
      throw new NotFoundException(
        `Quote ${request.quoteId} not found for order ${request.orderId}`,
      );
    }

    return mapQuoteToDetail(quote);
  }

  async confirmFinalQuote(
    request: ConfirmFinalQuoteRequest,
  ): Promise<ConfirmFinalQuoteResponse> {
    const actor = validateOrderingActor(request.actor);
    if (!actor.userId) {
      throw new ForbiddenException(
        'Only registered customers can confirm a final quote',
      );
    }

    const order = await this.repository.findOrderById(
      request.orderId,
      actor.userId,
    );
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const targetQuoteId = request.quoteId || order.currentQuoteId;
    if (!targetQuoteId) {
      throw new BadRequestException(
        'Order does not have an active quote to confirm',
      );
    }

    const quote = await this.repository.findQuoteById(
      request.orderId,
      targetQuoteId,
    );
    if (!quote) {
      throw new NotFoundException(`Quote ${targetQuoteId} not found`);
    }

    if (quote.status !== 'ISSUED') {
      throw new BadRequestException(
        `Quote in status '${quote.status}' cannot be confirmed. Only ISSUED quotes are eligible.`,
      );
    }

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

  async rejectFinalQuote(
    request: RejectFinalQuoteRequest,
  ): Promise<RejectFinalQuoteResponse> {
    const actor = validateOrderingActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const targetQuoteId = request.quoteId || order.currentQuoteId;
    if (!targetQuoteId) {
      throw new BadRequestException(
        'Order does not have an active quote to reject',
      );
    }

    const quote = await this.repository.findQuoteById(
      request.orderId,
      targetQuoteId,
    );
    if (!quote) {
      throw new NotFoundException(`Quote ${targetQuoteId} not found`);
    }

    if (quote.status !== 'ISSUED') {
      throw new BadRequestException(
        `Quote in status '${quote.status}' cannot be rejected. Only ISSUED quotes can be rejected.`,
      );
    }

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

  async getOrderFinalConfirmations(
    request: GetOrderFinalConfirmationsRequest,
  ): Promise<GetOrderFinalConfirmationsResponse> {
    const actor = validateOrderingActor(request.actor);
    const actorId = actor.userId ?? actor.guestSessionId!;

    const order = await this.repository.findOrderById(request.orderId, actorId);
    if (!order) {
      throw new NotFoundException(`Order ${request.orderId} not found`);
    }

    const confirmations = await this.repository.findFinalConfirmations(
      request.orderId,
    );

    return {
      orderId: request.orderId,
      confirmations: confirmations.map((c) => ({
        id: c.id,
        orderId: c.orderId,
        quoteId: c.quoteId,
        quoteNo: c.quoteNo,
        quoteTotalAmount: c.quoteTotalAmount,
        confirmedByCustomerIdentityId: c.confirmedByCustomerIdentityId,
        status: c.status,
        confirmedAt: c.confirmedAt.toISOString(),
        invalidatedAt: c.invalidatedAt?.toISOString(),
        invalidationReason: c.invalidationReason,
        items: [...c.items],
      })),
    };
  }

  async listClaimQuotes(
    request: ListClaimQuotesRequest,
  ): Promise<ListClaimQuotesResponse> {
    if (!request.claimId) {
      throw new BadRequestException('Claim ID is required');
    }
    validateOrderingActor(request.actor);

    const quotes = await this.repository.findClaimQuotes(request.claimId);
    return {
      quotes: quotes.map((q) => mapQuoteToDetail(q)),
    };
  }

  async acceptServiceQuote(
    request: AcceptServiceQuoteRequest,
  ): Promise<AcceptServiceQuoteResponse> {
    if (!request.claimId || !request.quoteId) {
      throw new BadRequestException('Claim ID and Quote ID are required');
    }

    const actor = validateOrderingActor(request.actor);
    const customerIdentityId = actor.userId ?? actor.guestSessionId;
    if (!customerIdentityId) {
      throw new ForbiddenException(
        'A valid customer identity is required to accept a service quote',
      );
    }

    const quote = await this.repository.findClaimQuoteById(
      request.claimId,
      request.quoteId,
    );
    if (!quote) {
      throw new NotFoundException(
        `Service quote ${request.quoteId} for claim ${request.claimId} not found`,
      );
    }

    if (quote.quoteType !== 'SERVICE') {
      throw new BadRequestException(
        `Quote is not a SERVICE quote (type: '${quote.quoteType}')`,
      );
    }

    if (quote.status === 'ACCEPTED') {
      return {
        success: true,
        quoteId: quote.id,
        status: quote.status,
        acceptedAt: (quote.acceptedAt ?? new Date()).toISOString(),
      };
    }

    if (quote.status !== 'ISSUED') {
      throw new BadRequestException(
        `Only ISSUED service quotes can be accepted. Current status: '${quote.status}'`,
      );
    }

    if (quote.validUntil && quote.validUntil < new Date()) {
      throw new BadRequestException(
        `Service quote expired on ${quote.validUntil.toISOString()}`,
      );
    }

    const updated = await this.repository.acceptClaimQuote({
      quoteId: quote.id,
      customerIdentityId,
    });

    return {
      success: true,
      quoteId: updated.id,
      status: updated.status,
      acceptedAt: (updated.acceptedAt ?? new Date()).toISOString(),
    };
  }
}
