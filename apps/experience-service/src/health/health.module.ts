import { Module } from '@nestjs/common';
import { PrismaModule } from '../persistence/prisma/prisma.module';
import { GrpcHealthController } from './grpc-health.controller';
import { ExperienceReadinessService } from './readiness.service';

@Module({
  imports: [PrismaModule],
  controllers: [GrpcHealthController],
  providers: [ExperienceReadinessService],
  exports: [ExperienceReadinessService],
})
export class HealthModule {}
