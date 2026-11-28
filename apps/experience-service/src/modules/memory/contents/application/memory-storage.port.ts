export const MEMORY_STORAGE_PORT = Symbol('MEMORY_STORAGE_PORT');

export interface PresignedUploadResult {
  readonly uploadUrl: string;
  readonly expiresAt: Date;
}

export interface MemoryStoragePort {
  presignUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
  ): Promise<PresignedUploadResult>;
  presignGetUrl(key: string, expiresInSeconds?: number): Promise<string>;
  checkObjectExists(key: string): Promise<boolean>;
  deleteObject(key: string): Promise<void>;
  getBucketName(): string;
}
