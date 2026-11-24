import { MemoryStorageAdapter } from './memory-storage.adapter';

describe('Garage Storage Live Integration Test', () => {
  let adapter: MemoryStorageAdapter;

  beforeAll(() => {
    adapter = new MemoryStorageAdapter();
  });

  it('should perform a complete roundtrip: presign PUT -> upload -> verify exists -> presign GET -> download -> delete', async () => {
    const testKey = `test-memories/live-test-${Date.now()}.txt`;
    const testContent = `Hello Memora S3 Garage! Timestamp: ${new Date().toISOString()}`;

    // 1. Generate presigned upload URL
    const { uploadUrl, expiresAt } = await adapter.presignUploadUrl(
      testKey,
      'text/plain',
      300,
    );
    expect(uploadUrl).toBeDefined();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    // 2. Upload file directly via HTTP PUT
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: testContent,
    });
    expect(putRes.ok).toBe(true);

    // 3. Verify object exists via S3 HeadObject
    const exists = await adapter.checkObjectExists(testKey);
    expect(exists).toBe(true);

    // 4. Generate presigned GET URL & Download file
    const downloadUrl = await adapter.presignGetUrl(testKey, 300);
    expect(downloadUrl).toBeDefined();

    const getRes = await fetch(downloadUrl);
    expect(getRes.ok).toBe(true);
    const downloadedText = await getRes.text();
    expect(downloadedText).toBe(testContent);

    // 5. Delete test object and verify it no longer exists
    await adapter.deleteObject(testKey);
    const existsAfterDelete = await adapter.checkObjectExists(testKey);
    expect(existsAfterDelete).toBe(false);
  });
});
