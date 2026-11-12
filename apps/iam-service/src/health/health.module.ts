import { Module } from '@nestjs/common';
import { PrismaModule } from '../persistence/prisma/prisma.module';
import { RedisModule } from '../persistence/redis/redis.module';
import { GrpcHealthController } from './grpc-health.controller';
import { IamReadinessService } from './readiness.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [GrpcHealthController],
  providers: [IamReadinessService],
  exports: [IamReadinessService],
})
export class HealthModule {}
