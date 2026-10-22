import { Module } from '@nestjs/common';
import { CatalogClientsModule } from './clients/catalog-clients.module';
import { TemplatesController } from './templates/controllers/templates.controller';

@Module({
  imports: [CatalogClientsModule],
  controllers: [TemplatesController],
})
export class CatalogModule {}
