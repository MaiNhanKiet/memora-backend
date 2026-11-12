import { Injectable } from '@nestjs/common';
import { createInternalGrpcAuthGuard } from '@app/common';

/**
 * Put on every business gRPC controller: `@UseGuards(CommerceInternalGrpcAuthGuard)`.
 * Verifies the Gateway caller secret (COMMERCE_INTERNAL_GRPC_SECRET). It does not
 * authorize a user; resource ownership is checked in the owning use case.
 */
@Injectable()
export class CommerceInternalGrpcAuthGuard extends createInternalGrpcAuthGuard(
  'commerce.internalGrpcSecret',
) {}
