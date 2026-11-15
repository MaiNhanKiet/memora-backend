import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { domainGrpcClientOptions } from '../../common/grpc/domain-grpc';
import { CatalogController } from './controllers/catalog.controller';
import { AdminCatalogController } from './controllers/admin-catalog.controller';
import {
  CatalogGrpcClient,
  COMMERCE_CATALOG_GRPC_CLIENT,
} from './clients/catalog-grpc.client';

@Module({
  imports: [
    ClientsModule.registerAsync([
      domainGrpcClientOptions({
        name: COMMERCE_CATALOG_GRPC_CLIENT,
        urlConfigKey: 'apiGateway.commerceGrpcUrl',
        protoPackage: 'memora.commerce.v1',
        protoFile: 'commerce/v1/catalog.proto',
      }),
    ]),
  ],
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogGrpcClient],
  exports: [CatalogGrpcClient],
})
export class CatalogModule {}
