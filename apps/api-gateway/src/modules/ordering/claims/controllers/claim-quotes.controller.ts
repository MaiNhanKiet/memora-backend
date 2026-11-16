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
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { OrderingGrpcClient } from '../../clients/ordering-grpc.client';
import {
  AcceptServiceQuoteResponseDto,
  CreateClaimPaymentLinkBodyDto,
  ListClaimQuotesResponseDto,
  PaymentLinkResponseDto,
} from '../dto';
import {
  ApiAcceptServiceQuote,
  ApiCreateClaimPaymentLink,
  ApiListClaimQuotes,
} from '../docs/claims.swagger';
import {
  toAcceptServiceQuoteGrpcRequest,
  toCreateClaimPaymentLinkGrpcRequest,
  toListClaimQuotesGrpcRequest,
} from '../mappers/claims-http.mapper';

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
    return this.orderingGrpcClient.listClaimQuotes(
      toListClaimQuotesGrpcRequest(claimId, actor),
    );
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
    return this.orderingGrpcClient.acceptServiceQuote(
      toAcceptServiceQuoteGrpcRequest(claimId, quoteId, actor),
    );
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
    return this.orderingGrpcClient.createClaimPaymentLink(
      toCreateClaimPaymentLinkGrpcRequest(claimId, body, actor),
    );
  }
}
