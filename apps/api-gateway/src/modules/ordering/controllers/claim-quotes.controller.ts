import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../common/grpc/verified-actor';
import { OrderingGrpcClient } from '../clients/ordering-grpc.client';
import {
  ApiAcceptServiceQuote,
  ApiListClaimQuotes,
} from '../docs/claim-quotes.swagger';
import type {
  AcceptServiceQuoteResponseDto,
  ListClaimQuotesResponseDto,
} from '../dto/claim-quotes.dto';

@Controller('claims')
export class ClaimQuotesController {
  constructor(private readonly orderingGrpcClient: OrderingGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [ORDER-024] View service quotes for a claim
  // ---------------------------------------------------------------------------
  @Get(':claimId/quotes')
  @ApiListClaimQuotes()
  async listClaimQuotes(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<ListClaimQuotesResponseDto> {
    const actor = toVerifiedActor(principal);
    const result = await this.orderingGrpcClient.listClaimQuotes({
      claimId,
      actor,
    });
    return result;
  }

  // ---------------------------------------------------------------------------
  // [ORDER-025] Customer accepts a service quote
  // ---------------------------------------------------------------------------
  @Post(':claimId/quotes/:quoteId/accept')
  @ApiAcceptServiceQuote()
  async acceptServiceQuote(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<AcceptServiceQuoteResponseDto> {
    const actor = toVerifiedActor(principal);
    const result = await this.orderingGrpcClient.acceptServiceQuote({
      claimId,
      quoteId,
      actor,
    });
    return result;
  }
}
