import { Injectable } from '@nestjs/common';
import { createInternalGrpcAuthGuard } from '@app/common';

/**
 * Put on every business gRPC controller: `@UseGuards(CommerceInternalGrpcAuthGuard)`.
 * Verifies COMMERCE_INTERNAL_GRPC_SECRET for internal callers. User authorization
 * and resource ownership are checked in the owning use case.
 */
@Injectable()
export class CommerceInternalGrpcAuthGuard extends createInternalGrpcAuthGuard(
  'commerce.internalGrpcSecret',
) {}
