import { Module } from '@nestjs/common';
import { CatalogCoreModule } from './catalog-core/catalog-core.module';

@Module({
  imports: [CatalogCoreModule],
  exports: [CatalogCoreModule],
})
export class CatalogModule {}
