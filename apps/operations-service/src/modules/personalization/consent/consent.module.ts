import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderContextModule } from '../shared/order-context/order-context.module';
import { AcceptConsentUseCase } from './application/accept-consent.use-case';
import {
  CONSENT_POLICY_VERSION,
  CONSENT_REPOSITORY,
} from './application/consent.repository';
import { ListConsentsUseCase } from './application/list-consents.use-case';
import { RevokeConsentUseCase } from './application/revoke-consent.use-case';
import { PrismaConsentRepository } from './infrastructure/prisma-consent.repository';
import { ConsentGrpcController } from './presentation/consent.grpc.controller';

@Module({
  imports: [OrderContextModule],
  controllers: [ConsentGrpcController],
  providers: [
    AcceptConsentUseCase,
    ListConsentsUseCase,
    RevokeConsentUseCase,
    { provide: CONSENT_REPOSITORY, useClass: PrismaConsentRepository },
    {
      provide: CONSENT_POLICY_VERSION,
      inject: [ConfigService],
      useFactory: (config: ConfigService): string =>
        config.getOrThrow<string>('operations.consentPolicyVersion'),
    },
  ],
})
export class ConsentModule {}
