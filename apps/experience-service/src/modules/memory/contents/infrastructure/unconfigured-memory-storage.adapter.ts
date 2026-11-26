import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  MemoryStoragePort,
  PresignedUploadResult,
} from '../application/memory-storage.port';

@Injectable()
export class UnconfiguredMemoryStorageAdapter implements MemoryStoragePort {
  presignUploadUrl(): Promise<PresignedUploadResult> {
    return Promise.reject(
      new ServiceUnavailableException(
        'Memory object storage is not configured',
      ),
    );
  }

  presignGetUrl(): Promise<string> {
    return Promise.reject(
      new ServiceUnavailableException(
        'Memory object storage is not configured',
      ),
    );
  }

  checkObjectExists(): Promise<boolean> {
    return Promise.reject(
      new ServiceUnavailableException(
        'Memory object storage is not configured',
      ),
    );
  }

  deleteObject(): Promise<void> {
    return Promise.reject(
      new ServiceUnavailableException(
        'Memory object storage is not configured',
      ),
    );
  }

  getBucketName(): string {
    throw new ServiceUnavailableException(
      'Memory object storage is not configured',
    );
  }
}
