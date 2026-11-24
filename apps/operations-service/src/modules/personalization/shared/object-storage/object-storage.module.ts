import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3ObjectStorageAdapter } from './infrastructure/s3-object-storage.adapter';
import { UnconfiguredObjectStorageAdapter } from './infrastructure/unconfigured-object-storage.adapter';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
} from './object-storage.port';

/** Binds the object-storage port to Garage (S3), or to a failing stub when unconfigured. */
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ObjectStoragePort => {
        const endpoint = config.get<string>('operations.objectStorageEndpoint');
        const publicEndpoint = config.get<string>(
          'operations.objectStoragePublicEndpoint',
        );
        const region = config.get<string>('operations.objectStorageRegion');
        const bucket = config.get<string>('operations.objectStorageBucket');
        const accessKeyId = config.get<string>(
          'operations.objectStorageAccessKeyId',
        );
        const secretAccessKey = config.get<string>(
          'operations.objectStorageSecretAccessKey',
        );
        if (
          endpoint === undefined ||
          region === undefined ||
          bucket === undefined ||
          accessKeyId === undefined ||
          secretAccessKey === undefined
        ) {
          new Logger('ObjectStorage').warn(
            'OPERATIONS_OBJECT_STORAGE_* is not fully set: accepted fingerprint captures will fail with INTERNAL_ERROR',
          );
          return new UnconfiguredObjectStorageAdapter();
        }
        return new S3ObjectStorageAdapter({
          endpoint,
          ...(publicEndpoint === undefined ? {} : { publicEndpoint }),
          region,
          bucket,
          accessKeyId,
          secretAccessKey,
        });
      },
    },
  ],
  exports: [OBJECT_STORAGE_PORT],
})
export class ObjectStorageModule {}
