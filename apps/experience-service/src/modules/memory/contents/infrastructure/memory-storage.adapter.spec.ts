import { S3Client } from '@aws-sdk/client-s3';
import { MemoryStorageAdapter } from './memory-storage.adapter';

describe('MemoryStorageAdapter', () => {
  const originalSend = Object.getOwnPropertyDescriptor(
    S3Client.prototype,
    'send',
  );
  const adapter = new MemoryStorageAdapter({
    endpoint: 'http://127.0.0.1:3900',
    publicEndpoint: 'https://storage.memora.local',
    region: 'garage',
    bucket: 'memora-memory-test',
    accessKeyId: 'test-access-key-id',
    secretAccessKey: 'test-secret-access-key',
  });

  afterEach(() => {
    if (originalSend) {
      Object.defineProperty(S3Client.prototype, 'send', originalSend);
    }
    jest.restoreAllMocks();
  });

  it('should return configured bucket name', () => {
    expect(adapter.getBucketName()).toBe('memora-memory-test');
  });

  it('should generate offline presigned PUT and GET URLs targeting publicEndpoint', async () => {
    const upload = await adapter.presignUploadUrl(
      'memory/test-card/sample.jpg',
      'image/jpeg',
      300,
    );
    expect(upload.uploadUrl).toContain(
      'https://storage.memora.local/memora-memory-test/memory/test-card/sample.jpg',
    );
    expect(upload.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const downloadUrl = await adapter.presignGetUrl(
      'memory/test-card/sample.jpg',
      300,
    );
    expect(downloadUrl).toContain(
      'https://storage.memora.local/memora-memory-test/memory/test-card/sample.jpg',
    );
  });

  it('should return true when HeadObject succeeds and false when object is missing', async () => {
    const sendMock = jest
      .fn<Promise<unknown>, [unknown]>()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('NotFound'));
    Object.defineProperty(S3Client.prototype, 'send', {
      configurable: true,
      writable: true,
      value: sendMock,
    });

    await expect(
      adapter.checkObjectExists('memory/test-card/present.jpg'),
    ).resolves.toBe(true);
    await expect(
      adapter.checkObjectExists('memory/test-card/missing.jpg'),
    ).resolves.toBe(false);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('should send DeleteObjectCommand when deleteObject is called', async () => {
    const sendMock = jest
      .fn<Promise<unknown>, [unknown]>()
      .mockResolvedValueOnce({});
    Object.defineProperty(S3Client.prototype, 'send', {
      configurable: true,
      writable: true,
      value: sendMock,
    });

    await expect(
      adapter.deleteObject('memory/test-card/old.jpg'),
    ).resolves.toBeUndefined();
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
