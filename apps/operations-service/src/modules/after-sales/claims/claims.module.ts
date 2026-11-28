import { Module } from '@nestjs/common';
import { CLAIM_ACCESS_REPOSITORY } from './application/claim-access.repository';
import { ClaimAccessUseCase } from './application/claim-access.use-case';
import { ReturnReceiptUseCase } from './application/return-receipt.use-case';
import { PrismaClaimAccessRepository } from './infrastructure/prisma-claim-access.repository';
import { ClaimAccessGrpcController } from './presentation/claim-access.grpc.controller';

@Module({
  controllers: [ClaimAccessGrpcController],
  providers: [
    ClaimAccessUseCase,
    ReturnReceiptUseCase,
    {
      provide: CLAIM_ACCESS_REPOSITORY,
      useClass: PrismaClaimAccessRepository,
    },
  ],
})
export class ClaimsModule {}
