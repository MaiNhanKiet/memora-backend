import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { parseVerifiedActor, requireCustomerIdentity } from '@app/common';
import {
  AFTER_SALES_CLAIMS_SERVICE_NAME,
  type AuthorizeClaimQuoteAccessRequest,
  type GetReturnReceiptForRefundRequest,
} from '@app/contracts';
import { OperationsInternalGrpcAuthGuard } from '../../../../grpc/operations-internal-grpc-auth.guard';
import { ClaimAccessUseCase } from '../application/claim-access.use-case';
import { ReturnReceiptUseCase } from '../application/return-receipt.use-case';

@Controller()
@UseGuards(OperationsInternalGrpcAuthGuard)
export class ClaimAccessGrpcController {
  constructor(
    private readonly claimAccess: ClaimAccessUseCase,
    private readonly returnReceipt: ReturnReceiptUseCase,
  ) {}

  @GrpcMethod(AFTER_SALES_CLAIMS_SERVICE_NAME, 'AuthorizeClaimQuoteAccess')
  authorizeClaimQuoteAccess(request: AuthorizeClaimQuoteAccessRequest) {
    const customerIdentityId = requireCustomerIdentity(
      parseVerifiedActor(request.actor),
    );
    return this.claimAccess.execute(
      request.claimId,
      customerIdentityId,
      request.action,
    );
  }

  @GrpcMethod(AFTER_SALES_CLAIMS_SERVICE_NAME, 'GetReturnReceiptForRefund')
  getReturnReceiptForRefund(request: GetReturnReceiptForRefundRequest) {
    return this.returnReceipt.execute(request.claimId);
  }
}
