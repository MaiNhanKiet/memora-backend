import { Module } from '@nestjs/common';
import { CatalogService } from '../../application/catalog/catalog.service';
import { CatalogGrpcController } from '../../presentation/grpc/catalog.grpc.controller';
import { RepositoriesModule } from '../../repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [CatalogGrpcController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
