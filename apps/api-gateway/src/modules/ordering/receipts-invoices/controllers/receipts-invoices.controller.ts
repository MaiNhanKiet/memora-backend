import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { OrderingGrpcClient } from '../../clients/ordering-grpc.client';
import {
  ApiGetOrderInvoiceDocs,
  ApiGetPaymentReceiptDocs,
} from '../docs/receipts-invoices.swagger';
import {
  toGetOrderInvoiceGrpcRequest,
  toGetPaymentReceiptGrpcRequest,
} from '../mappers/receipts-invoices-http.mapper';

@ApiTags('commerce-orders')
@Controller('orders')
export class ReceiptsInvoicesController {
  constructor(private readonly orderingClient: OrderingGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [ORDER-021] GET /api/v1/orders/:orderId/payments/:transactionId/receipt
  // ---------------------------------------------------------------------------
  @Get(':orderId/payments/:transactionId/receipt')
  @ApiGetPaymentReceiptDocs()
  async getPaymentReceipt(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.getPaymentReceipt(
      toGetPaymentReceiptGrpcRequest(actor, orderId, transactionId),
    );
  }

  // ---------------------------------------------------------------------------
  // [ORDER-022] GET /api/v1/orders/:orderId/invoice
  // ---------------------------------------------------------------------------
  @Get(':orderId/invoice')
  @ApiGetOrderInvoiceDocs()
  async getOrderInvoice(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.orderingClient.getOrderInvoice(
      toGetOrderInvoiceGrpcRequest(actor, orderId),
    );
  }
}
