import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  MEMORY_CARD_REPOSITORY,
  type MemoryCardWithGrantsRecord,
} from '../../cards/application/memory-card.repository';
import { PinHasher } from '../../cards/application/pin-hasher';
import {
  MEMORY_CONTENT_REPOSITORY,
  type MemoryContentRecord,
} from './memory-content.repository';
import {
  InitiateMediaUploadUseCase,
  ListCardContentsUseCase,
  UpdateCardContentsUseCase,
} from './memory-content.use-cases';
import { MEMORY_STORAGE_PORT } from './memory-storage.port';

describe('MemoryContent UseCases', () => {
  let listCardContentsUseCase: ListCardContentsUseCase;
  let updateCardContentsUseCase: UpdateCardContentsUseCase;
  let initiateMediaUploadUseCase: InitiateMediaUploadUseCase;

  const mockContentRepository = {
    listContentsByCardId: jest.fn(),
    replaceContents: jest.fn(),
  };

  const mockCardRepository = {
    findById: jest.fn(),
    applyPinVerification: jest.fn(),
  };

  const mockStoragePort = {
    presignUploadUrl: jest.fn().mockResolvedValue({
      uploadUrl: 'https://storage.memora.vn/upload/signed',
      expiresAt: new Date('2026-01-01T01:00:00Z'),
    }),
    presignGetUrl: jest
      .fn()
      .mockResolvedValue('https://storage.memora.vn/get/signed'),
    checkObjectExists: jest.fn(),
    deleteObject: jest.fn(),
    getBucketName: jest.fn().mockReturnValue('memora-memory'),
  };

  const mockPinHasher = {
    verify: jest.fn(),
  };

  const sampleActor = {
    userId: '11111111-1111-4111-8111-111111111111',
    customerIdentityId: '22222222-2222-4222-8222-222222222222',
  };

  const sampleCard: MemoryCardWithGrantsRecord = {
    id: '33333333-3333-4333-8333-333333333333',
    ringItemId: '44444444-4444-4444-8444-444444444444',
    ownerCustomerIdentityId: '22222222-2222-4222-8222-222222222222',
    ownerEmail: 'owner@memora.vn',
    status: 'ACTIVE',
    pinFailedAttempts: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    accessGrants: [],
  };

  const sampleContent: MemoryContentRecord = {
    id: '66666666-6666-4666-8666-666666666666',
    memoryCardId: sampleCard.id,
    contentType: 'IMAGE',
    title: 'Our Trip',
    assetKey: 'memories/sample.jpg',
    sortOrder: 0,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListCardContentsUseCase,
        UpdateCardContentsUseCase,
        InitiateMediaUploadUseCase,
        {
          provide: MEMORY_CONTENT_REPOSITORY,
          useValue: mockContentRepository,
        },
        { provide: MEMORY_CARD_REPOSITORY, useValue: mockCardRepository },
        { provide: MEMORY_STORAGE_PORT, useValue: mockStoragePort },
        { provide: PinHasher, useValue: mockPinHasher },
      ],
    }).compile();

    listCardContentsUseCase = module.get<ListCardContentsUseCase>(
      ListCardContentsUseCase,
    );
    updateCardContentsUseCase = module.get<UpdateCardContentsUseCase>(
      UpdateCardContentsUseCase,
    );
    initiateMediaUploadUseCase = module.get<InitiateMediaUploadUseCase>(
      InitiateMediaUploadUseCase,
    );
  });

  describe('ListCardContentsUseCase', () => {
    it('should list contents with presigned URLs for card owner', async () => {
      mockCardRepository.findById.mockResolvedValue(sampleCard);
      mockContentRepository.listContentsByCardId.mockResolvedValue([
        sampleContent,
      ]);

      const res = await listCardContentsUseCase.execute({
        actor: sampleActor,
        cardId: sampleCard.id,
      });

      expect(res.cardId).toBe(sampleCard.id);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].assetUrl).toBe(
        'https://storage.memora.vn/get/signed',
      );
    });

    it('should require PIN when card is PIN protected', async () => {
      mockCardRepository.findById.mockResolvedValue({
        ...sampleCard,
        pinHash: 'hash_1234',
      });

      await expect(
        listCardContentsUseCase.execute({
          actor: sampleActor,
          cardId: sampleCard.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('UpdateCardContentsUseCase', () => {
    it('should replace contents when owner submits valid items', async () => {
      mockCardRepository.findById.mockResolvedValue(sampleCard);
      mockContentRepository.replaceContents.mockResolvedValue([sampleContent]);

      const res = await updateCardContentsUseCase.execute({
        actor: sampleActor,
        cardId: sampleCard.id,
        items: [
          {
            contentType: 'IMAGE',
            title: 'Our Trip',
            assetKey: 'memories/sample.jpg',
            sortOrder: 0,
          },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.items).toHaveLength(1);
    });

    it('should throw ForbiddenException if caller is not card owner', async () => {
      mockCardRepository.findById.mockResolvedValue({
        ...sampleCard,
        ownerCustomerIdentityId: 'other-owner',
      });

      await expect(
        updateCardContentsUseCase.execute({
          actor: sampleActor,
          cardId: sampleCard.id,
          items: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('InitiateMediaUploadUseCase', () => {
    it('should return presigned upload URL and sanitized asset key', async () => {
      mockCardRepository.findById.mockResolvedValue(sampleCard);

      const res = await initiateMediaUploadUseCase.execute({
        actor: sampleActor,
        cardId: sampleCard.id,
        fileName: 'my photo!.jpg',
        contentType: 'image/jpeg',
        fileSize: 1024,
      });

      expect(res.uploadUrl).toBe('https://storage.memora.vn/upload/signed');
      expect(res.assetKey).toContain(`memories/${sampleCard.id}/`);
      expect(res.assetKey).toContain('my_photo_.jpg');
    });
  });
});
