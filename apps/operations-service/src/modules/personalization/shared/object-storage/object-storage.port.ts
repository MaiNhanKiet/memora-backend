/**
 * Private S3-compatible object storage (Garage, D-P-08). Callers pass object keys
 * only; URLs exist only through `presignGet`. No SDK types in this port.
 */
export interface PresignGetOptions {
  readonly expiresInSeconds: number;
  readonly contentType: string;
}

export interface PresignPutOptions {
  readonly expiresInSeconds: number;
  /** Signed: the upload must send exactly this Content-Type. */
  readonly contentType: string;
  /** Signed: the upload must send exactly this Content-Length. */
  readonly contentLength: number;
}

/** Thrown by `getObject` when the object is larger than the caller allows. */
export class ObjectTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super('Object is larger than the allowed size');
    this.name = 'ObjectTooLargeError';
  }
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
  /** Short-lived presigned PUT URL for a browser upload. Callers must never log it. */
  presignPut(key: string, options: PresignPutOptions): Promise<PresignedUrl>;
  /**
   * Reads the whole object. Returns undefined when the key is missing and rejects
   * with `ObjectTooLargeError` when the object is larger than `maxBytes`.
   */
  getObject(key: string, maxBytes: number): Promise<Uint8Array | undefined>;
  /** Idempotent: deleting a missing key is not an error. */
  deleteObject(key: string): Promise<void>;
}

export const OBJECT_STORAGE_PORT = Symbol('OBJECT_STORAGE_PORT');
