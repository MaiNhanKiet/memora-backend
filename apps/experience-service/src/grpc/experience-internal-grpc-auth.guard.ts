import { Injectable } from '@nestjs/common';
import { createInternalGrpcAuthGuard } from '@app/common';

/**
 * Put on every business gRPC controller: `@UseGuards(ExperienceInternalGrpcAuthGuard)`.
 * Verifies the Gateway caller secret (EXPERIENCE_INTERNAL_GRPC_SECRET). It does not
 * authorize a user; resource ownership is checked in the owning use case.
 */
@Injectable()
export class ExperienceInternalGrpcAuthGuard extends createInternalGrpcAuthGuard(
  'experience.internalGrpcSecret',
) {}
