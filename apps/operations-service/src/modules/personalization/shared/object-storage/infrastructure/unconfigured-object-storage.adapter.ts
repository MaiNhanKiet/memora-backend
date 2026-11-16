import type { ObjectStoragePort, PresignedUrl } from '../object-storage.port';

/**
 * Used in development when OPERATIONS_OBJECT_STORAGE_* is not set. Every call fails, so
 * an accepted capture answers INTERNAL_ERROR instead of silently dropping the image.
 */
export class UnconfiguredObjectStorageAdapter implements ObjectStoragePort {
  putObject(): Promise<void> {
    return Promise.reject(new Error('Object storage is not configured'));
  }

  presignGet(): Promise<PresignedUrl> {
    return Promise.reject(new Error('Object storage is not configured'));
  }

  deleteObject(): Promise<void> {
    return Promise.reject(new Error('Object storage is not configured'));
  }
}
