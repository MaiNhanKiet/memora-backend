import { Module } from '@nestjs/common';
import { CatalogRepository } from './catalog.repository';
import { PricingRepository } from './pricing.repository';
import { PrismaModule } from '../persistence/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CatalogRepository, PricingRepository],
  exports: [CatalogRepository, PricingRepository],
})
export class RepositoriesModule {}
