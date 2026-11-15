/**
 * Private S3-compatible object storage (Garage, D-P-08). Callers pass object keys
 * only; URLs exist only through `presignGet`. No SDK types in this port.
 */
export interface PresignGetOptions {
  readonly expiresInSeconds: number;
  readonly contentType: string;
}

export interface PresignedUrl {
  readonly url: string;
  readonly expiresAt: Date;
}

export interface ObjectStoragePort {
  /** Stores the bytes with `contentType` and records `sha256Hex` as object metadata (`sha256`). */
  putObject(
    key: string,
    bytes: Uint8Array,
    sha256Hex: string,
    contentType: string,
  ): Promise<void>;
  /** Short-lived presigned GET URL. Callers must never log it. */
  presignGet(key: string, options: PresignGetOptions): Promise<PresignedUrl>;
  /** Idempotent: deleting a missing key is not an error. */
  deleteObject(key: string): Promise<void>;
}

export const OBJECT_STORAGE_PORT = Symbol('OBJECT_STORAGE_PORT');
