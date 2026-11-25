import {
  BadRequestException,
  ForbiddenException,
  Inject,
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
  UpdateCardContentsRequest,
  UpdateCardContentsResponse,
} from '@app/contracts';
import { hasCardOwnerOrGrantAccess } from '../../cards/application/memory-card.mapper';
import {
  MEMORY_CARD_REPOSITORY,
  type MemoryCardRepository,
} from '../../cards/application/memory-card.repository';
import { PinHasher } from '../../cards/application/pin-hasher';
import { verifyCardPinWithLockout } from '../../cards/application/pin-policy';
import {
  mapContentsWithPresignedUrls,
  toMemoryContentItem,
} from './memory-content.mapper';
import {
  MEMORY_CONTENT_REPOSITORY,
  type MemoryContentRepository,
} from './memory-content.repository';
import {
  MEMORY_STORAGE_PORT,
  type MemoryStoragePort,
} from './memory-storage.port';

const ALLOWED_CONTENT_TYPES = new Set(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO']);
const MAX_UPLOAD_FILE_SIZE = 100 * 1024 * 1024; // 100MB

@Injectable()
export class ListCardContentsUseCase {
  constructor(
    @Inject(MEMORY_CONTENT_REPOSITORY)
    private readonly contentRepository: MemoryContentRepository,
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
    @Inject(MEMORY_STORAGE_PORT)
    private readonly storagePort: MemoryStoragePort,
    private readonly pinHasher: PinHasher,
  ) {}

  async execute(
    request: ListCardContentsRequest,
  ): Promise<ListCardContentsResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }

    if (!hasCardOwnerOrGrantAccess(card, actor, customerIdentityId)) {
      throw new ForbiddenException('Access denied to this memory card');
    }

    if (card.pinHash) {
      await verifyCardPinWithLockout({
        cardId: card.id,
        pinHash: card.pinHash,
        pinFailedAttempts: card.pinFailedAttempts,
        pinLockedUntil: card.pinLockedUntil,
        inputPin: request.pin,
        missingPinMessage: 'Mã PIN là bắt buộc để mở khóa nội dung thẻ',
        lockedMessage: (waitMinutes) =>
          `Thẻ đang bị tạm khóa. Vui lòng thử lại sau ${waitMinutes} phút.`,
        wrongPinMessages: {
          locked:
            'Mã PIN không chính xác. Thẻ đã bị khóa 15 phút do nhập sai 5 lần.',
          remaining: (left) =>
            `Mã PIN không chính xác. Bạn còn ${left} lần thử.`,
        },
        pinHasher: this.pinHasher,
        cardRepository: this.cardRepository,
      });
    }

    const rawContents = await this.contentRepository.listContentsByCardId(
      card.id,
    );
    const items = await mapContentsWithPresignedUrls(
      rawContents,
      this.storagePort,
    );

    return {
      cardId: card.id,
      items,
    };
  }
}

@Injectable()
export class UpdateCardContentsUseCase {
  constructor(
    @Inject(MEMORY_CONTENT_REPOSITORY)
    private readonly contentRepository: MemoryContentRepository,
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
  ) {}

  async execute(
    request: UpdateCardContentsRequest,
  ): Promise<UpdateCardContentsResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }
    if (card.ownerCustomerIdentityId !== customerIdentityId) {
      throw new ForbiddenException(
        'Only the card owner can edit memory contents',
      );
    }

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
      } else if (!item.assetKey || item.assetKey.trim().length === 0) {
        throw new BadRequestException(
          `Asset key is required for ${item.contentType} item`,
        );
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

    return {
      success: true,
      items: saved.map((content) => toMemoryContentItem(content)),
    };
  }
}

@Injectable()
export class InitiateMediaUploadUseCase {
  constructor(
    @Inject(MEMORY_CARD_REPOSITORY)
    private readonly cardRepository: MemoryCardRepository,
    @Inject(MEMORY_STORAGE_PORT)
    private readonly storagePort: MemoryStoragePort,
  ) {}

  async execute(
    request: InitiateMediaUploadRequest,
  ): Promise<InitiateMediaUploadResponse> {
    const actor = parseVerifiedActor(request.actor);
    const customerIdentityId = requireCustomerIdentity(actor);

    const card = await this.cardRepository.findById(request.cardId);
    if (!card) {
      throw new NotFoundException('Memory card not found');
    }
    if (card.ownerCustomerIdentityId !== customerIdentityId) {
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

    const { uploadUrl, expiresAt } = await this.storagePort.presignUploadUrl(
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
