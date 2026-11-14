import { Module } from '@nestjs/common';
import { CatalogRepository } from './catalog.repository';
import { PricingRepository } from './pricing.repository';
import { CartRepository } from './cart.repository';
import { OrderingRepository } from './ordering.repository';
import { PrismaModule } from '../persistence/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    CatalogRepository,
    PricingRepository,
    CartRepository,
    OrderingRepository,
  ],
  exports: [
    CatalogRepository,
    PricingRepository,
    CartRepository,
    OrderingRepository,
  ],
})
export class RepositoriesModule {}
