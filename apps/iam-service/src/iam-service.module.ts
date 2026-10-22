import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  createServiceConfigModule,
  iamConfig,
  validateIamEnv,
} from '@app/config';
import { LoggingInterceptor } from '@app/logger';
import { ObservabilityModule } from '@app/observability';
import { ApplicationModule } from './application/application.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './persistence/prisma/prisma.module';
import { RedisModule } from './persistence/redis/redis.module';
import { AccountGrpcController } from './presentation/grpc/account.grpc.controller';
import { GuestIdentityGrpcController } from './presentation/grpc/guest-identity.grpc.controller';
import { IamAdminGrpcController } from './presentation/grpc/iam-admin.grpc.controller';
import { AuthenticationGrpcController } from './presentation/grpc/authentication.grpc.controller';
import { AuthorizationGrpcController } from './presentation/grpc/authorization.grpc.controller';
import { InternalGrpcAuthGuard } from './presentation/grpc/internal-grpc-auth.guard';

@Module({
  imports: [
    createServiceConfigModule({
      validate: validateIamEnv,
      load: [iamConfig],
    }),
    ObservabilityModule,
    PrismaModule,
    RedisModule,
    ApplicationModule,
    HealthModule,
  ],
  controllers: [
    AuthenticationGrpcController,
    AccountGrpcController,
    GuestIdentityGrpcController,
    IamAdminGrpcController,
    AuthorizationGrpcController,
  ],
  providers: [
    InternalGrpcAuthGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class IamServiceModule {}
