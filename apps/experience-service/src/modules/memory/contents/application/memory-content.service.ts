import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { parseVerifiedActor, requireCustomerIdentity } from '@app/common';
import type {
  InitiateMediaUploadRequest,
  InitiateMediaUploadResponse,
  ListCardContentsRequest,
  ListCardContentsResponse,
  MemoryContentItem,
  MemoryContentType,
  UpdateCardContentsRequest,
  UpdateCardContentsResponse,
} from '@app/contracts';
import { MemoryCardRepository } from '../../cards/infrastructure/memory-card.repository';
import { PinHasher } from '../../cards/application/pin-hasher';
import { MemoryContentRepository } from '../infrastructure/memory-content.repository';
import { MemoryStorageAdapter } from '../infrastructure/memory-storage.adapter';

const ALLOWED_CONTENT_TYPES = new Set(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO']);
const MAX_UPLOAD_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_PIN_FAILED_ATTEMPTS = 5;
const PIN_LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class MemoryContentService {
  constructor(
    private readonly contentRepository: MemoryContentRepository,
    private readonly cardRepository: MemoryCardRepository,
    private readonly storageAdapter: MemoryStorageAdapter,
    private readonly pinHasher: PinHasher,
  ) {}

  async listCardContents(
    request: ListCardContentsRequest,
  ): Promise<ListCardContentsResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }

    const isOwner = card.owner_customer_identity_id === customerIdentityId;
    if (!isOwner) {
      const grants = card.access_grants ?? [];
      const hasGrant = grants.some(
        (g) =>
          g.status === 'ACTIVE' &&
          actor.kind === 'USER' &&
          g.grantee_user_id === actor.userId,
      );
      if (!hasGrant) {
        throw new ForbiddenException('Access denied to this memory card');
      }
    }

    // PIN check if card is protected by PIN
    if (card.pin_hash) {
      const now = new Date();
      if (card.pin_locked_until && card.pin_locked_until > now) {
        const waitMinutes = Math.ceil(
          (card.pin_locked_until.getTime() - now.getTime()) / 60000,
        );
        throw new ForbiddenException(
          `Thẻ đang bị tạm khóa. Vui lòng thử lại sau ${waitMinutes} phút.`,
        );
      }

      if (!request.pin) {
        throw new BadRequestException(
          'Mã PIN là bắt buộc để mở khóa nội dung thẻ',
        );
      }

      const isMatch = await this.pinHasher.verify(card.pin_hash, request.pin);
      if (!isMatch) {
        const attempts = card.pin_failed_attempts + 1;
        let lockedUntil: Date | null = null;
        if (attempts >= MAX_PIN_FAILED_ATTEMPTS) {
          lockedUntil = new Date(now.getTime() + PIN_LOCK_DURATION_MS);
        }
        await this.cardRepository.recordFailedPinAttempt(
          card.id,
          attempts,
          lockedUntil,
        );
        throw new BadRequestException(
          attempts >= MAX_PIN_FAILED_ATTEMPTS
            ? 'Mã PIN không chính xác. Thẻ đã bị khóa 15 phút do nhập sai 5 lần.'
            : `Mã PIN không chính xác. Bạn còn ${MAX_PIN_FAILED_ATTEMPTS - attempts} lần thử.`,
        );
      }
    }

    const rawContents = await this.contentRepository.listContentsByCardId(
      card.id,
    );

    const items: MemoryContentItem[] = await Promise.all(
      rawContents.map(async (content) => {
        let assetUrl: string | undefined;
        if (content.asset_key) {
          try {
            assetUrl = await this.storageAdapter.presignGetUrl(
              content.asset_key,
              3600,
            );
          } catch {
            assetUrl = undefined;
          }
        }

        return {
          id: content.id,
          memoryCardId: content.memory_card_id,
          contentType: content.content_type as MemoryContentType,
          title: content.title ?? undefined,
          textContent: content.text_content ?? undefined,
          assetKey: content.asset_key ?? undefined,
          assetUrl,
          sortOrder: content.sort_order,
          status: content.status,
          layoutJson: content.layout_json
            ? JSON.stringify(content.layout_json)
            : undefined,
          createdAt: content.created_at.toISOString(),
          updatedAt: content.updated_at.toISOString(),
        };
      }),
    );

    return {
      cardId: card.id,
      items,
    };
  }

  async updateCardContents(
    request: UpdateCardContentsRequest,
  ): Promise<UpdateCardContentsResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }
    if (card.owner_customer_identity_id !== customerIdentityId) {
      throw new ForbiddenException(
        'Only the card owner can edit memory contents',
      );
    }

    // Validate inputs
    for (const item of request.items) {
      if (!ALLOWED_CONTENT_TYPES.has(item.contentType)) {
        throw new BadRequestException(
          `Invalid content type: ${item.contentType}`,
        );
      }
      if (item.contentType === 'TEXT') {
        if (!item.textContent || item.textContent.trim().length === 0) {
          throw new BadRequestException(
            'Text content cannot be empty for TEXT item',
          );
        }
      } else {
        if (!item.assetKey || item.assetKey.trim().length === 0) {
          throw new BadRequestException(
            `Asset key is required for ${item.contentType} item`,
          );
        }
      }
      if (item.sortOrder < 0) {
        throw new BadRequestException('Sort order must be non-negative');
      }
    }

    const saved = await this.contentRepository.replaceContents(
      card.id,
      customerIdentityId,
      request.items.map((i) => ({
        id: i.id,
        contentType: i.contentType,
        title: i.title,
        textContent: i.textContent,
        assetKey: i.assetKey,
        sortOrder: i.sortOrder,
        layoutJson: i.layoutJson,
      })),
    );

    const mappedItems: MemoryContentItem[] = saved.map((content) => ({
      id: content.id,
      memoryCardId: content.memory_card_id,
      contentType: content.content_type as MemoryContentType,
      title: content.title ?? undefined,
      textContent: content.text_content ?? undefined,
      assetKey: content.asset_key ?? undefined,
      sortOrder: content.sort_order,
      status: content.status,
      layoutJson: content.layout_json
        ? JSON.stringify(content.layout_json)
        : undefined,
      createdAt: content.created_at.toISOString(),
      updatedAt: content.updated_at.toISOString(),
    }));

    return {
      success: true,
      items: mappedItems,
    };
  }

  async initiateMediaUpload(
    request: InitiateMediaUploadRequest,
  ): Promise<InitiateMediaUploadResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }
    if (card.owner_customer_identity_id !== customerIdentityId) {
      throw new ForbiddenException(
        'Only the card owner can upload media assets',
      );
    }

    if (request.fileSize <= 0 || request.fileSize > MAX_UPLOAD_FILE_SIZE) {
      throw new BadRequestException(
        'File size must be between 1 byte and 100MB',
      );
    }

    const cleanFileName = request.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const randomHex = randomBytes(4).toString('hex');
    const key = `memories/${card.id}/${Date.now()}-${randomHex}/${cleanFileName}`;

    const { uploadUrl, expiresAt } = await this.storageAdapter.presignUploadUrl(
      key,
      request.contentType,
      900,
    );

    return {
      uploadUrl,
      assetKey: key,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
