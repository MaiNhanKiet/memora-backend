import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import { CATALOG_GRPC_CLIENT, CatalogGrpcClient } from './catalog-grpc.client';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: CATALOG_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const url =
            configService.get<string>('apiGateway.commerceGrpcUrl') ??
            process.env.COMMERCE_GRPC_URL ??
            '127.0.0.1:50052';

          return {
            transport: Transport.GRPC,
            options: {
              url,
              package: 'memora.catalog.v1',
              protoPath: join(process.cwd(), 'proto/catalog/v1/catalog.proto'),
              loader: {
                includeDirs: [join(process.cwd(), 'proto')],
                longs: String,
                keepCase: false,
              },
            },
          };
        },
      },
    ]),
  ],
  providers: [CatalogGrpcClient],
  exports: [CatalogGrpcClient],
})
export class CatalogClientsModule {}
