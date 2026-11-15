import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'node:path';
import {
  COMMERCE_ORDERING_GRPC_CLIENT,
  CommerceOrderPersonalizationContextAdapter,
  orderPersonalizationContextProvider,
} from './infrastructure/commerce-order-personalization-context.adapter';
import { ORDER_PERSONALIZATION_CONTEXT_PORT } from './order-personalization-context.port';

/** Binds the order-facts port to the Commerce gRPC adapter. */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: COMMERCE_ORDERING_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: config.getOrThrow<string>('operations.commerceGrpcUrl'),
            package: 'memora.commerce.v1',
            protoPath: join(
              process.cwd(),
              'proto',
              'commerce/v1/ordering.proto',
            ),
            loader: {
              includeDirs: [join(process.cwd(), 'proto')],
              longs: String,
              keepCase: false,
            },
          },
        }),
      },
    ]),
  ],
  providers: [
    CommerceOrderPersonalizationContextAdapter,
    orderPersonalizationContextProvider,
  ],
  exports: [ORDER_PERSONALIZATION_CONTEXT_PORT],
})
export class OrderContextModule {}
