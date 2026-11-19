import { Module } from '@nestjs/common';
import { CatalogGrpcController } from './presentation/catalog.grpc.controller';
import { CatalogService } from './application/catalog.service';
import { CatalogMapper } from './application/catalog.mapper';
import { CatalogRepository } from './infrastructure/catalog.repository';

@Module({
  controllers: [CatalogGrpcController],
  providers: [CatalogService, CatalogMapper, CatalogRepository],
  exports: [CatalogService, CatalogMapper, CatalogRepository],
})
export class CatalogCoreModule {}
