import { Module } from '@nestjs/common';
import { ObjectStorageModule } from '../shared/object-storage/object-storage.module';
import { OrderContextModule } from '../shared/order-context/order-context.module';
import { SourceProcessingModule } from '../shared/source-processing/source-processing.module';
import { GetSourceProcessingUseCase } from './application/get-source-processing.use-case';
import { ListOrderSourcesUseCase } from './application/list-order-sources.use-case';
import { ORDER_SOURCES_REPOSITORY } from './application/order-sources.repository';
import {
  AcceptWavecodeStyleUseCase,
  GetSoundwaveWavecodeUseCase,
  SelectWavecodeStyleUseCase,
} from './application/wavecode-style.use-cases';
import { ResegmentSoundwaveSourceUseCase } from './application/resegment-soundwave-source.use-case';
import { WavecodeSupport } from './application/wavecode-support';
import { WAVECODE_REPOSITORY } from './application/wavecode.repository';
import { PrismaWavecodeRepository } from './infrastructure/prisma-wavecode.repository';
import { PrismaOrderSourcesRepository } from './infrastructure/prisma-order-sources.repository';
import { SourcesGrpcController } from './presentation/sources.grpc.controller';

@Module({
  imports: [OrderContextModule, ObjectStorageModule, SourceProcessingModule],
  controllers: [SourcesGrpcController],
  providers: [
    ListOrderSourcesUseCase,
    GetSourceProcessingUseCase,
    GetSoundwaveWavecodeUseCase,
    SelectWavecodeStyleUseCase,
    AcceptWavecodeStyleUseCase,
    ResegmentSoundwaveSourceUseCase,
    WavecodeSupport,
    {
      provide: WAVECODE_REPOSITORY,
      useClass: PrismaWavecodeRepository,
    },
    {
      provide: ORDER_SOURCES_REPOSITORY,
      useClass: PrismaOrderSourcesRepository,
    },
  ],
})
export class SourcesModule {}
