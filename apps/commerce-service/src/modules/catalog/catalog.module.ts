import { Module } from '@nestjs/common';
import { CatalogGrpcController } from '../../presentation/grpc/catalog.grpc.controller';
import { CatalogService } from '../../application/catalog/catalog.service';
import { CatalogMapper } from '../../application/catalog/catalog.mapper';
import { RepositoriesModule } from '../../repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [CatalogGrpcController],
  providers: [CatalogService, CatalogMapper],
  exports: [CatalogService],
})
export class CatalogModule {}
