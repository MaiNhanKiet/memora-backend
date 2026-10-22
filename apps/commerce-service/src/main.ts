import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GrpcExceptionFilter } from '@app/common';
import { loadCommerceRuntimeConfig } from '@app/config';
import { createMemoraLogger } from '@app/logger';
import { join } from 'node:path';
import { CommerceServiceModule } from './commerce-service.module';
import { startHealthHttpServer } from './health/http-health.server';
import { CommerceReadinessService } from './health/readiness.service';

async function bootstrap() {
  const commerce = loadCommerceRuntimeConfig();
  const grpcUrl = `${commerce.COMMERCE_GRPC_HOST}:${commerce.COMMERCE_GRPC_PORT}`;
  const logger = createMemoraLogger({
    service: 'commerce-service',
    domain: 'commerce',
    nodeEnv: commerce.NODE_ENV,
  });
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    CommerceServiceModule,
    {
      logger,
      transport: Transport.GRPC,
      options: {
        url: grpcUrl,
        package: ['grpc.health.v1', 'memora.catalog.v1'],
        protoPath: [
          join(process.cwd(), 'proto/grpc/health/v1/health.proto'),
          join(process.cwd(), 'proto/catalog/v1/catalog.proto'),
        ],
        loader: {
          includeDirs: [join(process.cwd(), 'proto')],
          longs: String,
          keepCase: false,
        },
      },
    },
  );

  app.useGlobalFilters(new GrpcExceptionFilter());
  app.enableShutdownHooks();
  await app.listen();
  const healthServer = startHealthHttpServer(
    commerce.COMMERCE_HEALTH_HOST,
    commerce.COMMERCE_HEALTH_PORT,
    app.get(CommerceReadinessService),
  );
  const closeHealthServer = () => {
    healthServer.close();
  };
  process.once('SIGTERM', closeHealthServer);
  process.once('SIGINT', closeHealthServer);
  Logger.log(`Commerce gRPC listening on ${grpcUrl}`, 'Bootstrap');
  Logger.log(
    `Commerce health listening on ${commerce.COMMERCE_HEALTH_HOST}:${commerce.COMMERCE_HEALTH_PORT}`,
    'Bootstrap',
  );
}

void bootstrap();
