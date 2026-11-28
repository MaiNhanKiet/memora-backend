import { Module } from '@nestjs/common';
import { GetFullOrderHandoverUseCase } from './application/get-full-order-handover.use-case';
import { HANDOVER_PROOF_REPOSITORY } from './application/handover-proof.repository';
import { PrismaHandoverProofRepository } from './infrastructure/prisma-handover-proof.repository';
import { HandoverProofGrpcController } from './presentation/handover-proof.grpc.controller';

@Module({
  controllers: [HandoverProofGrpcController],
  providers: [
    GetFullOrderHandoverUseCase,
    {
      provide: HANDOVER_PROOF_REPOSITORY,
      useClass: PrismaHandoverProofRepository,
    },
  ],
})
export class HandoverModule {}
