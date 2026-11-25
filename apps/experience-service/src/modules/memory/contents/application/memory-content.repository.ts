export const MEMORY_CONTENT_REPOSITORY = Symbol('MEMORY_CONTENT_REPOSITORY');

export interface MemoryContentRecord {
  readonly id: string;
  readonly memoryCardId: string;
  readonly contentType: string;
  readonly title?: string;
  readonly textContent?: string;
  readonly assetKey?: string;
  readonly sortOrder: number;
  readonly status: string;
  readonly layoutJson?: unknown;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ReplaceMemoryContentItemInput {
  readonly id?: string;
  readonly contentType: string;
  readonly title?: string;
  readonly textContent?: string;
  readonly assetKey?: string;
  readonly sortOrder: number;
  readonly layoutJson?: string;
}

export interface MemoryContentRepository {
  listContentsByCardId(cardId: string): Promise<readonly MemoryContentRecord[]>;
  replaceContents(
    cardId: string,
    customerIdentityId: string,
    items: readonly ReplaceMemoryContentItemInput[],
  ): Promise<readonly MemoryContentRecord[]>;
}
