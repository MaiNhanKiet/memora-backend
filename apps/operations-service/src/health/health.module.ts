import { Module } from '@nestjs/common';
import { PrismaModule } from '../persistence/prisma/prisma.module';
import { GrpcHealthController } from './grpc-health.controller';
import { OperationsReadinessService } from './readiness.service';

@Module({
  imports: [PrismaModule],
  controllers: [GrpcHealthController],
  providers: [OperationsReadinessService],
  exports: [OperationsReadinessService],
})
export class HealthModule {}
