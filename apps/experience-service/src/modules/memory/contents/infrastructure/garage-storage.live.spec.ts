import { MemoryStorageAdapter } from './memory-storage.adapter';

const hasLiveEnv =
  process.env.MEMORA_GARAGE_TEST === '1' &&
  Boolean(process.env.EXPERIENCE_OBJECT_STORAGE_ENDPOINT) &&
  Boolean(process.env.EXPERIENCE_OBJECT_STORAGE_BUCKET) &&
  Boolean(process.env.EXPERIENCE_OBJECT_STORAGE_ACCESS_KEY_ID) &&
  Boolean(process.env.EXPERIENCE_OBJECT_STORAGE_SECRET_ACCESS_KEY);

const describeLive = hasLiveEnv ? describe : describe.skip;

describeLive('Garage S3 Live Upload & Verify Integration', () => {
  it('should presign, PUT real payload to Garage S3, confirm via HeadObject, GET, and DELETE', async () => {
    const endpoint = process.env.EXPERIENCE_OBJECT_STORAGE_ENDPOINT ?? '';
    const adapter = new MemoryStorageAdapter({
      endpoint,
      publicEndpoint:
        process.env.EXPERIENCE_OBJECT_STORAGE_PUBLIC_ENDPOINT ?? endpoint,
      region: process.env.EXPERIENCE_OBJECT_STORAGE_REGION ?? 'garage',
      bucket: process.env.EXPERIENCE_OBJECT_STORAGE_BUCKET ?? '',
      accessKeyId: process.env.EXPERIENCE_OBJECT_STORAGE_ACCESS_KEY_ID ?? '',
      secretAccessKey:
        process.env.EXPERIENCE_OBJECT_STORAGE_SECRET_ACCESS_KEY ?? '',
    });

    const testKey = `memory/test-suite/live-test-${Date.now()}.txt`;
    const bodyContent = 'MEMORA live Garage S3 verification payload';

    const { uploadUrl } = await adapter.presignUploadUrl(
      testKey,
      'text/plain',
      300,
    );
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: bodyContent,
    });
    expect(putRes.ok).toBe(true);

    await expect(adapter.checkObjectExists(testKey)).resolves.toBe(true);

    const getUrl = await adapter.presignGetUrl(testKey, 300);
    const getRes = await fetch(getUrl);
    expect(getRes.ok).toBe(true);
    await expect(getRes.text()).resolves.toBe(bodyContent);

    await adapter.deleteObject(testKey);
    await expect(adapter.checkObjectExists(testKey)).resolves.toBe(false);
  });
});
