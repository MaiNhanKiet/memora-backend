import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type { memory_contents } from '../../../../../generated/prisma/client';

@Injectable()
export class MemoryContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listContentsByCardId(cardId: string): Promise<memory_contents[]> {
    return this.prisma.memory_contents.findMany({
      where: {
        memory_card_id: cardId,
        status: { in: ['ACTIVE', 'HIDDEN'] },
        deleted_at: null,
      },
      orderBy: { sort_order: 'asc' },
    });
  }

  async replaceContents(
    cardId: string,
    customerIdentityId: string,
    items: Array<{
      id?: string;
      contentType: string;
      title?: string;
      textContent?: string;
      assetKey?: string;
      sortOrder: number;
      layoutJson?: string;
    }>,
  ): Promise<memory_contents[]> {
    return this.prisma.$transaction(async (tx) => {
      // Soft-delete existing contents for this card
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

      // Insert new contents
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
            layout_json: item.layoutJson ? JSON.parse(item.layoutJson) : undefined,
          },
        });
        createdItems.push(created);
      }

      return createdItems;
    });
  }
}
