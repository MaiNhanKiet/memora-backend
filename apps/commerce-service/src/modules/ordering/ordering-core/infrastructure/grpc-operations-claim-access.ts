import {
  Injectable,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { isUUID } from 'class-validator';
import { join } from 'node:path';
import { firstValueFrom, timeout } from 'rxjs';
import { INTERNAL_GRPC_AUTH_METADATA_KEY } from '@app/common';
import {
  AFTER_SALES_CLAIMS_SERVICE_NAME,
  AFTER_SALES_PACKAGE,
  type AfterSalesClaimsServiceClient,
  type AuthorizeClaimQuoteAccessRequest,
  type GetReturnReceiptForRefundResponse,
} from '@app/contracts';
import { createOutgoingGrpcMetadata } from '@app/logger';
import type { OperationsClaimAccess } from '../application/operations-claim-access.port';

@Injectable()
export class GrpcOperationsClaimAccess
  implements OperationsClaimAccess, OnModuleDestroy
{
  private readonly proxy?: ClientGrpcProxy;
  private readonly secret?: string;

  constructor(config: ConfigService) {
    const target = config.get<{ url: string; secret: string }>(
      'commerce.operationsClaimAccess',
    );
    if (target) {
      const protoRoot = join(process.cwd(), 'proto');
      this.secret = target.secret;
      this.proxy = new ClientGrpcProxy({
        url: target.url,
        package: AFTER_SALES_PACKAGE,
        protoPath: join(protoRoot, 'operations/v1/after-sales.proto'),
        loader: { includeDirs: [protoRoot], keepCase: false, longs: String },
      });
    }
  }

  onModuleDestroy(): void {
    this.proxy?.close();
  }

  async authorize(request: AuthorizeClaimQuoteAccessRequest): Promise<boolean> {
    const { service, metadata } = this.requestContext();
    try {
      const response = await firstValueFrom(
        service
          .authorizeClaimQuoteAccess(request, metadata)
          .pipe(timeout(2000)),
      );
      return response.allowed === true;
    } catch (cause: unknown) {
      throw new ServiceUnavailableException(
        'Claim access verification is unavailable',
        { cause },
      );
    }
  }

  async getReturnReceipt(
    claimId: string,
  ): Promise<GetReturnReceiptForRefundResponse> {
    const { service, metadata } = this.requestContext();
    try {
      const response = await firstValueFrom(
        service
          .getReturnReceiptForRefund({ claimId }, metadata)
          .pipe(timeout(2000)),
      );
      if (response.eligible !== true) return { eligible: false };
      if (
        ![response.orderId, response.ringItemId, response.receiptId].every(
          (id) => isUUID(id),
        )
      ) {
        throw new Error('Invalid return receipt response');
      }
      return response;
    } catch (cause: unknown) {
      throw new ServiceUnavailableException(
        'Return receipt verification is unavailable',
        { cause },
      );
    }
  }

  private requestContext() {
    if (!this.proxy || !this.secret) {
      throw new ServiceUnavailableException(
        'After-sales verification is unavailable',
      );
    }
    const service = this.proxy.getService<AfterSalesClaimsServiceClient>(
      AFTER_SALES_CLAIMS_SERVICE_NAME,
    );
    const metadata = createOutgoingGrpcMetadata();
    metadata.set(INTERNAL_GRPC_AUTH_METADATA_KEY, this.secret);
    return { service, metadata };
  }
}
