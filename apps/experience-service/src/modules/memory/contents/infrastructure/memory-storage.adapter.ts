import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MemoryStorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const endpoint =
      process.env.OPERATIONS_OBJECT_STORAGE_ENDPOINT ||
      'http://100.78.222.34:3900';
    const region =
      process.env.OPERATIONS_OBJECT_STORAGE_REGION || 'garage';
    const accessKeyId =
      process.env.OPERATIONS_OBJECT_STORAGE_ACCESS_KEY_ID ||
      process.env.GARAGE_ACCESS_KEY_ID ||
      'GKbae7b9cc0ee77b9a1db6b2df';
    const secretAccessKey =
      process.env.OPERATIONS_OBJECT_STORAGE_SECRET_ACCESS_KEY ||
      process.env.GARAGE_SECRET_ACCESS_KEY ||
      '7f6c9b3a6ecbb7ea54ade3454b311dae860039bfc7bcd9177a247484cf80e21d';

    this.bucket =
      process.env.OPERATIONS_OBJECT_STORAGE_BUCKET || 'memora-catalog';

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

    const uploadUrl = await getSignedUrl(this.client, command, {
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

    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }
}
