import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { domainGrpcClientOptions } from '../../common/grpc/domain-grpc';
import { CatalogBrowseController } from './browse/controllers/catalog-browse.controller';
import { AdminTemplateController } from './templates-admin/controllers/admin-template.controller';
import { AdminMaterialController } from './materials-admin/controllers/admin-material.controller';
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
        optional: true,
      }),
    ]),
  ],
  controllers: [
    CatalogBrowseController,
    AdminTemplateController,
    AdminMaterialController,
  ],
  providers: [CatalogGrpcClient],
  exports: [CatalogGrpcClient],
})
export class CatalogModule {}
