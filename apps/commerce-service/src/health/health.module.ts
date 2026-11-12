import { Module } from '@nestjs/common';
import { PrismaModule } from '../persistence/prisma/prisma.module';
import { GrpcHealthController } from './grpc-health.controller';
import { CommerceReadinessService } from './readiness.service';

@Module({
  imports: [PrismaModule],
  controllers: [GrpcHealthController],
  providers: [CommerceReadinessService],
  exports: [CommerceReadinessService],
})
export class HealthModule {}
