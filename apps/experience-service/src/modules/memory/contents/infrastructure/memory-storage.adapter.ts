import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MemoryStorageAdapter {
  private readonly client: S3Client;
  private readonly signingClient: S3Client;
  private readonly bucket: string;

  constructor(@Optional() private readonly configService?: ConfigService) {
    const endpoint =
      this.configService?.get<string>('experience.storage.endpoint') ??
      this.configService?.get<string>('EXPERIENCE_OBJECT_STORAGE_ENDPOINT') ??
      process.env.EXPERIENCE_OBJECT_STORAGE_ENDPOINT ??
      process.env.OPERATIONS_OBJECT_STORAGE_ENDPOINT ??
      'http://100.78.222.34:3900';

    const publicEndpoint =
      this.configService?.get<string>('experience.storage.publicEndpoint') ??
      this.configService?.get<string>(
        'EXPERIENCE_OBJECT_STORAGE_PUBLIC_ENDPOINT',
      ) ??
      process.env.EXPERIENCE_OBJECT_STORAGE_PUBLIC_ENDPOINT ??
      endpoint;

    const region =
      this.configService?.get<string>('experience.storage.region') ??
      this.configService?.get<string>('EXPERIENCE_OBJECT_STORAGE_REGION') ??
      process.env.EXPERIENCE_OBJECT_STORAGE_REGION ??
      process.env.OPERATIONS_OBJECT_STORAGE_REGION ??
      'garage';

    const accessKeyId =
      this.configService?.get<string>('experience.storage.accessKeyId') ??
      this.configService?.get<string>(
        'EXPERIENCE_OBJECT_STORAGE_ACCESS_KEY_ID',
      ) ??
      process.env.EXPERIENCE_OBJECT_STORAGE_ACCESS_KEY_ID ??
      process.env.OPERATIONS_OBJECT_STORAGE_ACCESS_KEY_ID ??
      process.env.GARAGE_ACCESS_KEY_ID ??
      'GKbae7b9cc0ee77b9a1db6b2df';

    const secretAccessKey =
      this.configService?.get<string>('experience.storage.secretAccessKey') ??
      this.configService?.get<string>(
        'EXPERIENCE_OBJECT_STORAGE_SECRET_ACCESS_KEY',
      ) ??
      process.env.EXPERIENCE_OBJECT_STORAGE_SECRET_ACCESS_KEY ??
      process.env.OPERATIONS_OBJECT_STORAGE_SECRET_ACCESS_KEY ??
      process.env.GARAGE_SECRET_ACCESS_KEY ??
      '7f6c9b3a6ecbb7ea54ade3454b311dae860039bfc7bcd9177a247484cf80e21d';

    this.bucket =
      this.configService?.get<string>('experience.storage.bucket') ??
      this.configService?.get<string>('EXPERIENCE_OBJECT_STORAGE_BUCKET') ??
      process.env.EXPERIENCE_OBJECT_STORAGE_BUCKET ??
      'memora-memory';

    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });

    this.signingClient =
      publicEndpoint !== endpoint
        ? new S3Client({
            endpoint: publicEndpoint,
            region,
            forcePathStyle: true,
            credentials: {
              accessKeyId,
              secretAccessKey,
            },
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED',
          })
        : this.client;
  }

  async presignUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number = 900,
  ): Promise<{ uploadUrl: string; expiresAt: Date }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.signingClient, command, {
      expiresIn: expiresInSeconds,
    });
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return { uploadUrl, expiresAt };
  }

  async presignGetUrl(
    key: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.signingClient, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async checkObjectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        (err.name === 'NotFound' ||
          err.name === 'NoSuchKey' ||
          (err as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode === 404)
      ) {
        return false;
      }
      return false;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  getBucketName(): string {
    return this.bucket;
  }
}
