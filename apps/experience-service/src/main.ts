import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GrpcExceptionFilter } from '@app/common';
import { loadExperienceRuntimeConfig } from '@app/config';
import { createMemoraLogger } from '@app/logger';
import { join } from 'node:path';
import { ExperienceServiceModule } from './experience-service.module';
import { startHealthHttpServer } from './health/http-health.server';
import { ExperienceReadinessService } from './health/readiness.service';

async function bootstrap() {
  const experience = loadExperienceRuntimeConfig();
  const grpcUrl = `${experience.EXPERIENCE_GRPC_HOST}:${experience.EXPERIENCE_GRPC_PORT}`;
  const logger = createMemoraLogger({
    service: 'experience-service',
    domain: 'experience',
    nodeEnv: experience.NODE_ENV,
  });
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ExperienceServiceModule,
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
    experience.EXPERIENCE_HEALTH_HOST,
    experience.EXPERIENCE_HEALTH_PORT,
    app.get(ExperienceReadinessService),
  );
  const closeHealthServer = () => {
    healthServer.close();
  };
  process.once('SIGTERM', closeHealthServer);
  process.once('SIGINT', closeHealthServer);
  Logger.log(`Experience gRPC listening on ${grpcUrl}`, 'Bootstrap');
  Logger.log(
    `Experience health listening on ${experience.EXPERIENCE_HEALTH_HOST}:${experience.EXPERIENCE_HEALTH_PORT}`,
    'Bootstrap',
  );
}

void bootstrap();
