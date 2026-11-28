import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import {
  ClaimQuoteAction,
  type AcceptServiceQuoteRequest,
  type AcceptServiceQuoteResponse,
  type ListClaimQuotesRequest,
  type ListClaimQuotesResponse,
} from '@app/contracts';
import {
  OPERATIONS_CLAIM_ACCESS,
  requireClaimQuoteAccess,
  type OperationsClaimAccess,
} from './operations-claim-access.port';
import { mapQuoteToDetail } from './ordering.mapper';
import {
  ORDERING_REPOSITORY,
  type OrderingRepository,
} from './ordering.repository';

@Injectable()
export class ListClaimQuotesUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
    @Inject(OPERATIONS_CLAIM_ACCESS)
    private readonly claimAccess: OperationsClaimAccess,
  ) {}

  async execute(
    request: ListClaimQuotesRequest,
  ): Promise<ListClaimQuotesResponse> {
    await requireClaimQuoteAccess(
      this.claimAccess,
      request.claimId,
      request.actor,
      ClaimQuoteAction.VIEW_QUOTE,
    );

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
    @Inject(OPERATIONS_CLAIM_ACCESS)
    private readonly claimAccess: OperationsClaimAccess,
  ) {}

  async execute(
    request: AcceptServiceQuoteRequest,
  ): Promise<AcceptServiceQuoteResponse> {
    if (!isUUID(request.quoteId)) {
      throw new BadRequestException('Quote ID must be a UUID');
    }

    const customerIdentityId = await requireClaimQuoteAccess(
      this.claimAccess,
      request.claimId,
      request.actor,
      ClaimQuoteAction.ACCEPT_QUOTE,
    );

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

    if (quote.status !== 'ISSUED' && quote.status !== 'ACCEPTED') {
      throw new BadRequestException(
        `Only ISSUED service quotes can be accepted. Current status: '${quote.status}'`,
      );
    }

    if (
      quote.status === 'ISSUED' &&
      quote.validUntil &&
      quote.validUntil < new Date()
    ) {
      throw new BadRequestException(
        `Service quote expired on ${quote.validUntil.toISOString()}`,
      );
    }

    const updated = await this.repository.acceptClaimQuote({
      claimId: request.claimId,
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
