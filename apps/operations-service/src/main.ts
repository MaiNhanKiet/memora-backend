import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GrpcExceptionFilter } from '@app/common';
import { loadOperationsRuntimeConfig } from '@app/config';
import { createMemoraLogger } from '@app/logger';
import { join } from 'node:path';
import { startHealthHttpServer } from './health/http-health.server';
import { OperationsReadinessService } from './health/readiness.service';
import { OperationsServiceModule } from './operations-service.module';

async function bootstrap() {
  const operations = loadOperationsRuntimeConfig();
  const grpcUrl = `${operations.OPERATIONS_GRPC_HOST}:${operations.OPERATIONS_GRPC_PORT}`;
  const logger = createMemoraLogger({
    service: 'operations-service',
    domain: 'operations',
    nodeEnv: operations.NODE_ENV,
  });
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OperationsServiceModule,
    {
      logger,
      transport: Transport.GRPC,
      options: {
        url: grpcUrl,
        package: ['grpc.health.v1'],
        protoPath: [join(process.cwd(), 'proto/grpc/health/v1/health.proto')],
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
    operations.OPERATIONS_HEALTH_HOST,
    operations.OPERATIONS_HEALTH_PORT,
    app.get(OperationsReadinessService),
  );
  const closeHealthServer = () => {
    healthServer.close();
  };
  process.once('SIGTERM', closeHealthServer);
  process.once('SIGINT', closeHealthServer);
  Logger.log(`Operations gRPC listening on ${grpcUrl}`, 'Bootstrap');
  Logger.log(
    `Operations health listening on ${operations.OPERATIONS_HEALTH_HOST}:${operations.OPERATIONS_HEALTH_PORT}`,
    'Bootstrap',
  );
}

void bootstrap();
