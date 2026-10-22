import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  commerceConfig,
  createServiceConfigModule,
  validateCommerceEnv,
} from '@app/config';
import { LoggingInterceptor } from '@app/logger';
import { ObservabilityModule } from '@app/observability';
import { HealthModule } from './health/health.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { DesignModule } from './modules/design/design.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrderingModule } from './modules/ordering/ordering.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { PrismaModule } from './persistence/prisma/prisma.module';

@Module({
  imports: [
    createServiceConfigModule({
      validate: validateCommerceEnv,
      load: [commerceConfig],
    }),
    ObservabilityModule,
    PrismaModule,
    HealthModule,
    CatalogModule,
    PricingModule,
    InventoryModule,
    DesignModule,
    OrderingModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class CommerceServiceModule {}
