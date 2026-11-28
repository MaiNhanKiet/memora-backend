import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  memory_contents,
} from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  MemoryContentRecord,
  MemoryContentRepository,
  ReplaceMemoryContentItemInput,
} from '../application/memory-content.repository';

function toMemoryContentRecord(row: memory_contents): MemoryContentRecord {
  return {
    id: row.id,
    memoryCardId: row.memory_card_id,
    contentType: row.content_type,
    title: row.title ?? undefined,
    textContent: row.text_content ?? undefined,
    assetKey: row.asset_key ?? undefined,
    sortOrder: row.sort_order,
    status: row.status,
    layoutJson: row.layout_json ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class PrismaMemoryContentRepository implements MemoryContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listContentsByCardId(
    cardId: string,
  ): Promise<readonly MemoryContentRecord[]> {
    const rows = await this.prisma.memory_contents.findMany({
      where: {
        memory_card_id: cardId,
        status: { in: ['ACTIVE', 'HIDDEN'] },
        deleted_at: null,
      },
      orderBy: { sort_order: 'asc' },
    });
    return rows.map(toMemoryContentRecord);
  }

  async replaceContents(
    cardId: string,
    customerIdentityId: string,
    items: readonly ReplaceMemoryContentItemInput[],
  ): Promise<readonly MemoryContentRecord[]> {
    const createdRows = await this.prisma.$transaction(async (tx) => {
      await tx.memory_contents.updateMany({
        where: {
          memory_card_id: cardId,
          deleted_at: null,
        },
        data: {
          status: 'DELETED',
          deleted_at: new Date(),
        },
      });

      const createdItems: memory_contents[] = [];
      for (const item of items) {
        const created = await tx.memory_contents.create({
          data: {
            memory_card_id: cardId,
            content_type: item.contentType,
            title: item.title ?? null,
            text_content: item.textContent ?? null,
            asset_key: item.assetKey ?? null,
            sort_order: item.sortOrder,
            status: 'ACTIVE',
            created_by_customer_identity_id: customerIdentityId,
            layout_json: item.layoutJson
              ? (JSON.parse(item.layoutJson) as Prisma.InputJsonValue)
              : undefined,
          },
        });
        createdItems.push(created);
      }

      return createdItems;
    });

    return createdRows.map(toMemoryContentRecord);
  }
}
