import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(
  app: INestApplication,
  configService: ConfigService,
): void {
  if (!configService.getOrThrow<boolean>('apiGateway.swaggerEnabled')) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('MEMORA API')
    .setDescription('MEMORA - 3D Personalized Ring Design System')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Guest-Session',
        description:
          'Anonymous guest session token from POST /api/v1/identities/guest/sessions. Only on routes marked @AllowGuest({ session: true }).',
      },
      'guest-session',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Guest-Access',
        description:
          'Verified guest access token (guestAccessToken from guest/verify/confirm). Only on routes marked @AllowGuest({ verified: true }).',
      },
      'guest-access',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  Logger.log('Swagger UI available at /api/docs', 'Bootstrap');
}
