import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  createServiceConfigModule,
  operationsConfig,
  validateOperationsEnv,
} from '@app/config';
import { LoggingInterceptor } from '@app/logger';
import { ObservabilityModule } from '@app/observability';
import { HealthModule } from './health/health.module';
import { AfterSalesModule } from './modules/after-sales/after-sales.module';
import { FulfillmentModule } from './modules/fulfillment/fulfillment.module';
import { PersonalizationModule } from './modules/personalization/personalization.module';
import { ProductionModule } from './modules/production/production.module';
import { PrismaModule } from './persistence/prisma/prisma.module';

@Module({
  imports: [
    createServiceConfigModule({
      validate: validateOperationsEnv,
      load: [operationsConfig],
    }),
    ObservabilityModule,
    PrismaModule,
    HealthModule,
    PersonalizationModule,
    ProductionModule,
    FulfillmentModule,
    AfterSalesModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class OperationsServiceModule {}
