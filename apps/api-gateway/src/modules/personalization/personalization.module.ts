import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { PERSONALIZATION_PACKAGE } from '@app/contracts';
import { domainGrpcClientOptions } from '../../common/grpc/domain-grpc';
import {
  OPERATIONS_PERSONALIZATION_GRPC_CLIENT,
  PersonalizationGrpcClient,
} from './clients/personalization-grpc.client';
import { ConsentController } from './consent/controllers/consent.controller';
import { FingerprintCaptureController } from './fingerprint-capture/controllers/fingerprint-capture.controller';
import { SoundwaveUploadController } from './sources/controllers/soundwave-upload.controller';
import { SourcesController } from './sources/controllers/sources.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      domainGrpcClientOptions({
        name: OPERATIONS_PERSONALIZATION_GRPC_CLIENT,
        urlConfigKey: 'apiGateway.operationsGrpcUrl',
        protoPackage: PERSONALIZATION_PACKAGE,
        protoFile: 'personalization/v1/personalization.proto',
        optional: true,
      }),
    ]),
  ],
  controllers: [
    ConsentController,
    FingerprintCaptureController,
    SourcesController,
    SoundwaveUploadController,
  ],
  providers: [PersonalizationGrpcClient],
  exports: [PersonalizationGrpcClient],
})
export class PersonalizationModule {}
