import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { OrderingGrpcClient } from '../../clients/ordering-grpc.client';
import { CreateRefundRequestBodyDto } from '../dto';
import {
  ApiCreateRefundRequestDocs,
  ApiReconcilePaymentTransaction,
} from '../docs/payments.swagger';
import {
  toCreateRefundRequestGrpcRequest,
  toReconcilePaymentTransactionGrpcRequest,
} from '../mappers/payments-http.mapper';

@ApiTags('commerce-admin-payments')
@Controller('admin/payments')
@Roles('STORE_MANAGER', 'STORE_STAFF', 'SUPER_ADMIN', 'ADMIN', 'MANAGER')
export class AdminPaymentsController {
  constructor(private readonly orderingClient: OrderingGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [ORDER-023] POST /api/v1/admin/payments/:transactionId/refund-requests
  // ---------------------------------------------------------------------------
  @Post(':transactionId/refund-requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateRefundRequestDocs()
  async createRefundRequest(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() body: CreateRefundRequestBodyDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    return this.orderingClient.createRefundRequest(
      toCreateRefundRequestGrpcRequest(transactionId, body, user?.userId),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-020] POST /api/v1/admin/payments/:transactionId/reconcile
  // ---------------------------------------------------------------------------
  @Post(':transactionId/reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiReconcilePaymentTransaction()
  async reconcilePayment(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @CurrentUser() user: AuthenticatedPrincipal,
  ) {
    const actor = toVerifiedActor(user);
    return this.orderingClient.reconcilePaymentTransaction(
      toReconcilePaymentTransactionGrpcRequest(transactionId, actor),
    );
  }
}
