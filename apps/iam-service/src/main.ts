import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GrpcExceptionFilter } from '@app/common';
import { loadIamRuntimeConfig } from '@app/config';
import { createMemoraLogger } from '@app/logger';
import { join } from 'node:path';
import { startHealthHttpServer } from './health/http-health.server';
import { IamReadinessService } from './health/readiness.service';
import { IamServiceModule } from './iam-service.module';
import {
  IAM_POSTGRES_DATABASE,
  IAM_POSTGRES_SCHEMA,
} from './persistence/prisma/iam-postgres.constants';
import { PrismaService } from './persistence/prisma/prisma.service';
import { RedisService } from './persistence/redis/redis.service';

async function bootstrap() {
  const iam = loadIamRuntimeConfig();
  const grpcUrl = `${iam.IAM_GRPC_HOST}:${iam.IAM_GRPC_PORT}`;
  const logger = createMemoraLogger({
    service: 'iam-service',
    domain: 'iam',
    nodeEnv: iam.NODE_ENV,
  });
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    IamServiceModule,
    {
      logger,
      transport: Transport.GRPC,
      options: {
        url: grpcUrl,
        package: ['memora.iam.v1', 'grpc.health.v1'],
        protoPath: [
          join(process.cwd(), 'proto/iam/v1/iam.proto'),
          join(process.cwd(), 'proto/grpc/health/v1/health.proto'),
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
  app.get(PrismaService);
  app.get(RedisService);
  const healthServer = startHealthHttpServer(
    iam.IAM_HEALTH_HOST,
    iam.IAM_HEALTH_PORT,
    app.get(IamReadinessService),
  );
  const closeHealthServer = () => {
    healthServer.close();
  };
  process.once('SIGTERM', closeHealthServer);
  process.once('SIGINT', closeHealthServer);
  Logger.log(
    `IAM PostgreSQL connected (database=${IAM_POSTGRES_DATABASE}, schema=${IAM_POSTGRES_SCHEMA})`,
    'Bootstrap',
  );
  Logger.log('IAM Redis connected', 'Bootstrap');
  Logger.log(`IAM gRPC Service running on ${grpcUrl}`, 'Bootstrap');
  Logger.log(
    `IAM health listening on ${iam.IAM_HEALTH_HOST}:${iam.IAM_HEALTH_PORT}`,
    'Bootstrap',
  );
}

void bootstrap();
