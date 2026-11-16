import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { OrderInvoiceDetailDto, PaymentReceiptDetailDto } from '../dto';

const bearer = ApiBearerAuth('bearer');
const guestSessionHeader = ApiHeader({
  name: 'x-guest-session-id',
  description: 'Anonymous guest session UUID',
  required: false,
});
const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});
const forbidden = (reason?: string) =>
  ApiResponse({
    status: 403,
    description: reason ?? 'Caller lacks required role or ownership',
  });
const notFound = (resource: string) =>
  ApiResponse({
    status: 404,
    description: `${resource} not found`,
  });

export function ApiGetPaymentReceiptDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-021] Get Immutable Payment Receipt',
      description:
        'Retrieves official electronic payment receipt with immutable receipt_no for a completed payment.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({
      name: 'transactionId',
      description: 'Transaction UUID',
      type: String,
    }),
    ApiSuccessResponse({
      type: PaymentReceiptDetailDto,
      description: 'Payment receipt returned successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Receipt is only available for SUCCEEDED transactions',
    }),
    unauthorized,
    forbidden('Caller does not own this receipt'),
    notFound('Payment transaction or order'),
  );
}

export function ApiGetOrderInvoiceDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-022] Get Order Invoice / Summary',
      description:
        'Retrieves comprehensive order invoice breakdown with invoice_no, total, totalPaid, remaining, and items.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: OrderInvoiceDetailDto,
      description: 'Order invoice returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order invoice'),
    notFound('Order'),
  );
}
