import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectStorageModule } from '../shared/object-storage/object-storage.module';
import { OrderContextModule } from '../shared/order-context/order-context.module';
import { SourceProcessingModule } from '../shared/source-processing/source-processing.module';
import { CompleteSoundwaveUploadUseCase } from './application/complete-soundwave-upload.use-case';
import { InitiateSoundwaveUploadUseCase } from './application/initiate-soundwave-upload.use-case';
import {
  SOUNDWAVE_UPLOAD_CONFIG,
  type SoundwaveUploadConfig,
} from './application/soundwave-upload.config';
import { SOUNDWAVE_UPLOAD_REPOSITORY } from './application/soundwave-upload.repository';
import { PrismaSoundwaveUploadRepository } from './infrastructure/prisma-soundwave-upload.repository';
import { SoundwaveUploadGrpcController } from './presentation/soundwave-upload.grpc.controller';

@Module({
  imports: [OrderContextModule, ObjectStorageModule, SourceProcessingModule],
  controllers: [SoundwaveUploadGrpcController],
  providers: [
    InitiateSoundwaveUploadUseCase,
    CompleteSoundwaveUploadUseCase,
    {
      provide: SOUNDWAVE_UPLOAD_REPOSITORY,
      useClass: PrismaSoundwaveUploadRepository,
    },
    {
      provide: SOUNDWAVE_UPLOAD_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SoundwaveUploadConfig => ({
        uploadUrlTtlSeconds: config.getOrThrow<number>(
          'operations.soundwaveUploadTtlSeconds',
        ),
      }),
    },
  ],
})
export class SoundwaveUploadModule {}
