import { Logger } from '@nestjs/common';
import type { MemoryContentItem, MemoryContentType } from '@app/contracts';
import type { MemoryContentRecord } from './memory-content.repository';
import type { MemoryStoragePort } from './memory-storage.port';

const logger = new Logger('MemoryContentMapper');

export function toMemoryContentItem(
  content: MemoryContentRecord,
  assetUrl?: string,
): MemoryContentItem {
  return {
    id: content.id,
    memoryCardId: content.memoryCardId,
    contentType: content.contentType as MemoryContentType,
    title: content.title,
    textContent: content.textContent,
    assetKey: content.assetKey,
    assetUrl,
    sortOrder: content.sortOrder,
    status: content.status,
    layoutJson: content.layoutJson
      ? JSON.stringify(content.layoutJson)
      : undefined,
    createdAt: content.createdAt.toISOString(),
    updatedAt: content.updatedAt.toISOString(),
  };
}

export async function mapContentsWithPresignedUrls(
  contents: readonly MemoryContentRecord[],
  storagePort: MemoryStoragePort,
): Promise<MemoryContentItem[]> {
  return Promise.all(
    contents.map(async (content) => {
      let assetUrl: string | undefined;
      if (content.assetKey) {
        try {
          assetUrl = await storagePort.presignGetUrl(content.assetKey, 3600);
        } catch (err: unknown) {
          logger.warn(
            `Failed to presign memory content assetKey=${content.assetKey}`,
            err,
          );
          assetUrl = undefined;
        }
      }
      return toMemoryContentItem(content, assetUrl);
    }),
  );
}
