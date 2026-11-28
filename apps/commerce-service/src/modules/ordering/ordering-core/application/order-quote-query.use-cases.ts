import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  FullQuoteDetail,
  GetOrderFinalConfirmationsRequest,
  GetOrderFinalConfirmationsResponse,
  GetOrderQuoteByIdRequest,
  ListOrderQuotesRequest,
  ListOrderQuotesResponse,
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
export class ListOrderQuotesUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
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
}

@Injectable()
export class GetOrderQuoteByIdUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(request: GetOrderQuoteByIdRequest): Promise<FullQuoteDetail> {
    if (request.actor) {
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
}

@Injectable()
export class GetOrderFinalConfirmationsUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: GetOrderFinalConfirmationsRequest,
  ): Promise<GetOrderFinalConfirmationsResponse> {
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
}
