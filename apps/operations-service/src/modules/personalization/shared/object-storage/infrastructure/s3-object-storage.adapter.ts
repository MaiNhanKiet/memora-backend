import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  ObjectStoragePort,
  PresignedUrl,
  PresignGetOptions,
} from '../object-storage.port';

export interface S3ObjectStorageConfig {
  readonly endpoint: string;
  /** Browser-reachable host used only for presigning; defaults to `endpoint`. */
  readonly publicEndpoint?: string;
  readonly region: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

/**
 * Garage-compatible adapter. Path-style addressing is required by Garage. The SHA-256
 * is stored as user metadata (`sha256`): it works on every S3-compatible server, while
 * `x-amz-checksum-*` support differs between servers. Flexible SDK checksums are limited
 * to "when required" for the same compatibility reason.
 */
export class S3ObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: S3Client;
  private readonly signer: S3Client;

  constructor(private readonly config: S3ObjectStorageConfig) {
    this.client = this.createClient(config.endpoint);
    this.signer =
      config.publicEndpoint === undefined
        ? this.client
        : this.createClient(config.publicEndpoint);
  }

  private createClient(endpoint: string): S3Client {
    return new S3Client({
      endpoint,
      region: this.config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async putObject(
    key: string,
    bytes: Uint8Array,
    sha256Hex: string,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: bytes,
        ContentLength: bytes.byteLength,
        ContentType: contentType,
        Metadata: { sha256: sha256Hex },
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }

  async presignGet(
    key: string,
    options: PresignGetOptions,
  ): Promise<PresignedUrl> {
    const expiresAt = new Date(Date.now() + options.expiresInSeconds * 1000);
    const url = await getSignedUrl(
      this.signer,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ResponseContentType: options.contentType,
      }),
      { expiresIn: options.expiresInSeconds },
    );
    return { url, expiresAt };
  }
}
