import { MemoryStorageAdapter } from './memory-storage.adapter';

describe('MemoryStorageAdapter', () => {
  let adapter: MemoryStorageAdapter;

  beforeEach(() => {
    adapter = new MemoryStorageAdapter();
  });

  it('should initialize with default or configured bucket name', () => {
    expect(adapter.getBucketName()).toBe('memora-memory');
  });

  it('should generate a valid presigned upload URL', async () => {
    const key = 'test-cards/card-123/image.png';
    const result = await adapter.presignUploadUrl(key, 'image/png', 900);

    expect(result.uploadUrl).toBeDefined();
    expect(typeof result.uploadUrl).toBe('string');
    expect(result.uploadUrl).toContain('image.png');
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('should generate a valid presigned get URL', async () => {
    const key = 'test-cards/card-123/image.png';
    const getUrl = await adapter.presignGetUrl(key, 3600);

    expect(getUrl).toBeDefined();
    expect(typeof getUrl).toBe('string');
    expect(getUrl).toContain('image.png');
  });

  it('should check object existence safely without throwing on not found', async () => {
    const exists = await adapter.checkObjectExists(
      'non-existent-key-123456789.png',
    );
    expect(typeof exists).toBe('boolean');
  });
});
