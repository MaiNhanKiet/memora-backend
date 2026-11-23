import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectStorageModule } from '../shared/object-storage/object-storage.module';
import { SourceProcessingModule } from '../shared/source-processing/source-processing.module';
import { OrderContextModule } from '../shared/order-context/order-context.module';
import {
  CAPTURE_DEVICE_GATEWAY,
  CAPTURE_MESSAGE_SOURCE,
} from './application/capture-device.gateway';
import {
  CAPTURE_CONFIG,
  type CaptureConfig,
} from './application/capture.config';
import { CAPTURE_REPOSITORY } from './application/capture.repository';
import { CloseCaptureSessionUseCase } from './application/close-capture-session.use-case';
import { CompleteCaptureSessionUseCase } from './application/complete-capture-session.use-case';
import { CreateCaptureSessionUseCase } from './application/create-capture-session.use-case';
import { GetCaptureAttemptImageUseCase } from './application/get-capture-attempt-image.use-case';
import { GetCaptureSessionUseCase } from './application/get-capture-session.use-case';
import { HandleDeviceHelloUseCase } from './application/handle-device-hello.use-case';
import { NextCaptureAttemptUseCase } from './application/next-capture-attempt.use-case';
import { RejectCaptureAttemptUseCase } from './application/reject-capture-attempt.use-case';
import { RecordCaptureAttemptUseCase } from './application/record-capture-attempt.use-case';
import {
  MqttCaptureDeviceGateway,
  type MqttSettings,
} from './infrastructure/mqtt-capture-device.gateway';
import { PrismaCaptureRepository } from './infrastructure/prisma-capture.repository';
import { CaptureGrpcController } from './presentation/grpc/capture.grpc.controller';
import { CaptureMqttListener } from './presentation/mqtt/capture-mqtt.listener';

@Module({
  imports: [OrderContextModule, ObjectStorageModule, SourceProcessingModule],
  controllers: [CaptureGrpcController],
  providers: [
    CreateCaptureSessionUseCase,
    GetCaptureSessionUseCase,
    CompleteCaptureSessionUseCase,
    GetCaptureAttemptImageUseCase,
    RejectCaptureAttemptUseCase,
    NextCaptureAttemptUseCase,
    CloseCaptureSessionUseCase,
    RecordCaptureAttemptUseCase,
    HandleDeviceHelloUseCase,
    CaptureMqttListener,
    { provide: CAPTURE_REPOSITORY, useClass: PrismaCaptureRepository },
    {
      provide: MqttCaptureDeviceGateway,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MqttCaptureDeviceGateway => {
        const url = config.get<string>('operations.mqttUrl');
        const username = config.get<string>('operations.mqttUsername');
        const password = config.get<string>('operations.mqttPassword');
        const settings: MqttSettings | undefined =
          url === undefined || username === undefined || password === undefined
            ? undefined
            : { url, username, password };
        return new MqttCaptureDeviceGateway(settings);
      },
    },
    { provide: CAPTURE_DEVICE_GATEWAY, useExisting: MqttCaptureDeviceGateway },
    { provide: CAPTURE_MESSAGE_SOURCE, useExisting: MqttCaptureDeviceGateway },
    {
      provide: CAPTURE_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService): CaptureConfig => ({
        sessionTtlSeconds: config.getOrThrow<number>(
          'operations.captureSessionTtlSeconds',
        ),
        qualityThreshold: config.getOrThrow<number>(
          'operations.captureQualityThreshold',
        ),
        allowedDeviceCodes: new Set(
          config.getOrThrow<string[]>('operations.captureDeviceCodes'),
        ),
      }),
    },
  ],
})
export class FingerprintCaptureModule {}
