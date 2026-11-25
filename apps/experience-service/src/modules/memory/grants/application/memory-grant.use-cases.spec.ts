import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  MEMORY_CARD_REPOSITORY,
  type MemoryCardWithGrantsRecord,
} from '../../cards/application/memory-card.repository';
import { PinHasher } from '../../cards/application/pin-hasher';
import {
  MEMORY_CONTENT_REPOSITORY,
  type MemoryContentRecord,
} from '../../contents/application/memory-content.repository';
import { MEMORY_STORAGE_PORT } from '../../contents/application/memory-storage.port';
import {
  MEMORY_GRANT_REPOSITORY,
  type MemoryAccessGrantWithCardRecord,
} from './memory-grant.repository';
import {
  CreateAccessGrantUseCase,
  GetMemoryBySessionUseCase,
  RedeemInvitationUseCase,
} from './memory-grant.use-cases';

describe('MemoryGrant UseCases', () => {
  let createAccessGrantUseCase: CreateAccessGrantUseCase;
  let redeemInvitationUseCase: RedeemInvitationUseCase;
  let getMemoryBySessionUseCase: GetMemoryBySessionUseCase;

  const mockGrantRepository = {
    createGrant: jest.fn(),
    listGrantsByCardId: jest.fn(),
    findGrantById: jest.fn(),
    findByTokenHash: jest.fn(),
    revokeGrant: jest.fn(),
    markAccepted: jest.fn(),
    updateLastAccessed: jest.fn(),
  };

  const mockCardRepository = {
    findById: jest.fn(),
    recordFailedPinAttempt: jest.fn(),
  };

  const mockContentRepository = {
    listContentsByCardId: jest.fn(),
  };

  const mockStoragePort = {
    presignGetUrl: jest
      .fn()
      .mockResolvedValue('https://storage.memora.vn/sample.jpg'),
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

  const sampleGrant: MemoryAccessGrantWithCardRecord = {
    id: '55555555-5555-4555-8555-555555555555',
    memoryCardId: sampleCard.id,
    granteeEmail: 'friend@memora.vn',
    status: 'PENDING',
    inviteExpiresAt: new Date(Date.now() + 7 * 86400 * 1000),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    card: sampleCard,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAccessGrantUseCase,
        RedeemInvitationUseCase,
        GetMemoryBySessionUseCase,
        { provide: MEMORY_GRANT_REPOSITORY, useValue: mockGrantRepository },
        { provide: MEMORY_CARD_REPOSITORY, useValue: mockCardRepository },
        { provide: MEMORY_CONTENT_REPOSITORY, useValue: mockContentRepository },
        { provide: MEMORY_STORAGE_PORT, useValue: mockStoragePort },
        { provide: PinHasher, useValue: mockPinHasher },
      ],
    }).compile();

    createAccessGrantUseCase = module.get<CreateAccessGrantUseCase>(
      CreateAccessGrantUseCase,
    );
    redeemInvitationUseCase = module.get<RedeemInvitationUseCase>(
      RedeemInvitationUseCase,
    );
    getMemoryBySessionUseCase = module.get<GetMemoryBySessionUseCase>(
      GetMemoryBySessionUseCase,
    );
  });

  describe('CreateAccessGrantUseCase', () => {
    it('should create an access grant and return secure invitation token', async () => {
      mockCardRepository.findById.mockResolvedValue(sampleCard);
      mockGrantRepository.createGrant.mockResolvedValue(sampleGrant);

      const res = await createAccessGrantUseCase.execute({
        actor: sampleActor,
        cardId: sampleCard.id,
        granteeEmail: 'friend@memora.vn',
        ttlDays: 7,
      });

      expect(res.grantId).toBe(sampleGrant.id);
      expect(res.invitationToken).toBeDefined();
      expect(res.inviteUrl).toContain('/memory/redeem?token=');
      expect(mockGrantRepository.createGrant).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if actor is not the card owner', async () => {
      mockCardRepository.findById.mockResolvedValue({
        ...sampleCard,
        ownerCustomerIdentityId: 'other-identity-id',
      });

      await expect(
        createAccessGrantUseCase.execute({
          actor: sampleActor,
          cardId: sampleCard.id,
          granteeEmail: 'friend@memora.vn',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('RedeemInvitationUseCase', () => {
    it('should activate grant and return accessSessionId', async () => {
      mockGrantRepository.findByTokenHash.mockResolvedValue(sampleGrant);
      mockGrantRepository.markAccepted.mockResolvedValue({
        ...sampleGrant,
        status: 'ACTIVE',
        acceptedAt: new Date(),
      });

      const res = await redeemInvitationUseCase.execute({
        invitationToken: 'test-token',
        actor: sampleActor,
      });

      expect(res.accessSessionId).toBe(sampleGrant.id);
      expect(res.requiresPin).toBe(false);
      expect(mockGrantRepository.markAccepted).toHaveBeenCalledWith(
        sampleGrant.id,
        sampleActor.userId,
      );
    });
  });

  describe('GetMemoryBySessionUseCase', () => {
    it('should return memory contents for active session', async () => {
      mockGrantRepository.findGrantById.mockResolvedValue({
        ...sampleGrant,
        status: 'ACTIVE',
      });
      mockGrantRepository.updateLastAccessed.mockResolvedValue(sampleGrant);

      const contentRecord: MemoryContentRecord = {
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
      mockContentRepository.listContentsByCardId.mockResolvedValue([
        contentRecord,
      ]);

      const res = await getMemoryBySessionUseCase.execute({
        accessSessionId: sampleGrant.id,
      });

      expect(res.cardId).toBe(sampleCard.id);
      expect(res.items.length).toBe(1);
      expect(res.items[0].assetUrl).toBe(
        'https://storage.memora.vn/sample.jpg',
      );
      expect(mockGrantRepository.updateLastAccessed).toHaveBeenCalledWith(
        sampleGrant.id,
      );
    });
  });
});
