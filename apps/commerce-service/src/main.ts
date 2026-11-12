import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GrpcExceptionFilter } from '@app/common';
import { loadCommerceRuntimeConfig } from '@app/config';
import { createMemoraLogger } from '@app/logger';
import { join } from 'node:path';
import { COMMERCE_GRPC_PROTOS } from './grpc/commerce-grpc.registry';
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
        package: COMMERCE_GRPC_PROTOS.map((proto) => proto.package),
        protoPath: COMMERCE_GRPC_PROTOS.map((proto) =>
          join(process.cwd(), 'proto', proto.file),
        ),
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
