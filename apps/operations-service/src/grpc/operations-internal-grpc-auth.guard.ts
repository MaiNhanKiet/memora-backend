import { Injectable } from '@nestjs/common';
import { createInternalGrpcAuthGuard } from '@app/common';

/**
 * Put on every business gRPC controller: `@UseGuards(OperationsInternalGrpcAuthGuard)`.
 * Verifies the Gateway caller secret (OPERATIONS_INTERNAL_GRPC_SECRET). It does not
 * authorize a user; resource ownership is checked in the owning use case.
 */
@Injectable()
export class OperationsInternalGrpcAuthGuard extends createInternalGrpcAuthGuard(
  'operations.internalGrpcSecret',
) {}
