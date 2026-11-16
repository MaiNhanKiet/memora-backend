import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../common/grpc/verified-actor';
import { OrderingGrpcClient } from '../clients/ordering-grpc.client';
import {
  ApiAcceptServiceQuote,
  ApiListClaimQuotes,
} from '../docs/claim-quotes.swagger';
import { ApiCreateClaimPaymentLink } from '../docs/payos-payments.swagger';
import type {
  AcceptServiceQuoteResponseDto,
  ListClaimQuotesResponseDto,
} from '../dto/claim-quotes.dto';
import {
  CreateClaimPaymentLinkBodyDto,
  PaymentLinkResponseDto,
} from '../dto/payos-payments.dto';

@ApiTags('commerce-claims')
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

  // ---------------------------------------------------------------------------
  // [ORDER-026] Customer creates payment link for service quote
  // ---------------------------------------------------------------------------
  @Post(':claimId/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateClaimPaymentLink()
  async createClaimPaymentLink(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @Body() body: CreateClaimPaymentLinkBodyDto,
    @CurrentUser() principal: AuthenticatedPrincipal,
  ): Promise<PaymentLinkResponseDto> {
    const actor = toVerifiedActor(principal);
    const result = await this.orderingGrpcClient.createClaimPaymentLink({
      claimId,
      returnUrl: body.returnUrl,
      cancelUrl: body.cancelUrl,
      actor,
    });
    return result;
  }
}
