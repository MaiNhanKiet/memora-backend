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
  ListClaimQuotesRequest,
  ListClaimQuotesResponse,
} from '@app/contracts';
import { mapQuoteToDetail } from './ordering.mapper';
import {
  ORDERING_REPOSITORY,
  type OrderingRepository,
} from './ordering.repository';
import { validateOrderingActor } from './ordering.validation';

@Injectable()
export class ListClaimQuotesUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
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
}

@Injectable()
export class AcceptServiceQuoteUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
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
