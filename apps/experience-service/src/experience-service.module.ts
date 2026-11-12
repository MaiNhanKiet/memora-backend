import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  createServiceConfigModule,
  experienceConfig,
  validateExperienceEnv,
} from '@app/config';
import { LoggingInterceptor } from '@app/logger';
import { ObservabilityModule } from '@app/observability';
import { HealthModule } from './health/health.module';
import { MemoryModule } from './modules/memory/memory.module';
import { PlatformModule } from './modules/platform/platform.module';
import { PrismaModule } from './persistence/prisma/prisma.module';

@Module({
  imports: [
    createServiceConfigModule({
      validate: validateExperienceEnv,
      load: [experienceConfig],
    }),
    ObservabilityModule,
    PrismaModule,
    HealthModule,
    MemoryModule,
    PlatformModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class ExperienceServiceModule {}
