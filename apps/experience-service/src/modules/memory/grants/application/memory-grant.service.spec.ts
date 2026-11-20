import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MemoryGrantService } from './memory-grant.service';
import { MemoryGrantRepository } from '../infrastructure/memory-grant.repository';
import { MemoryCardRepository } from '../../cards/infrastructure/memory-card.repository';
import { MemoryContentRepository } from '../../contents/infrastructure/memory-content.repository';
import { MemoryStorageAdapter } from '../../contents/infrastructure/memory-storage.adapter';
import { PinHasher } from '../../cards/application/pin-hasher';

describe('MemoryGrantService', () => {
  let service: MemoryGrantService;

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

  const mockStorageAdapter = {
    presignGetUrl: jest.fn().mockResolvedValue('https://storage.memora.vn/sample.jpg'),
  };

  const mockPinHasher = {
    verify: jest.fn(),
  };

  const sampleActor = {
    userId: '11111111-1111-4111-8111-111111111111',
    customerIdentityId: '22222222-2222-4222-8222-222222222222',
  };

  const sampleCard = {
    id: '33333333-3333-4333-8333-333333333333',
    ring_item_id: '44444444-4444-4444-8444-444444444444',
    owner_customer_identity_id: '22222222-2222-4222-8222-222222222222',
    owner_email: 'owner@memora.vn',
    status: 'ACTIVE',
    pin_hash: null,
    pin_failed_attempts: 0,
    pin_locked_until: null,
    deleted_at: null,
  };

  const sampleGrant = {
    id: '55555555-5555-4555-8555-555555555555',
    memory_card_id: sampleCard.id,
    grantee_email: 'friend@memora.vn',
    status: 'PENDING',
    invitation_token_hash: 'token_hash_sample',
    invite_expires_at: new Date(Date.now() + 7 * 86400 * 1000),
    created_at: new Date('2026-01-01T00:00:00Z'),
    memory_cards: sampleCard,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryGrantService,
        { provide: MemoryGrantRepository, useValue: mockGrantRepository },
        { provide: MemoryCardRepository, useValue: mockCardRepository },
        { provide: MemoryContentRepository, useValue: mockContentRepository },
        { provide: MemoryStorageAdapter, useValue: mockStorageAdapter },
        { provide: PinHasher, useValue: mockPinHasher },
      ],
    }).compile();

    service = module.get<MemoryGrantService>(MemoryGrantService);
  });

  describe('createAccessGrant', () => {
    it('should create an access grant and return secure invitation token', async () => {
      mockCardRepository.findById.mockResolvedValue(sampleCard);
      mockGrantRepository.createGrant.mockResolvedValue(sampleGrant);

      const res = await service.createAccessGrant({
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
        owner_customer_identity_id: 'other-identity-id',
      });

      await expect(
        service.createAccessGrant({
          actor: sampleActor,
          cardId: sampleCard.id,
          granteeEmail: 'friend@memora.vn',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('redeemInvitation', () => {
    it('should activate grant and return accessSessionId', async () => {
      mockGrantRepository.findByTokenHash.mockResolvedValue(sampleGrant);
      mockGrantRepository.markAccepted.mockResolvedValue({
        ...sampleGrant,
        status: 'ACTIVE',
        accepted_at: new Date(),
      });

      const res = await service.redeemInvitation({
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

  describe('getMemoryBySession', () => {
    it('should return memory contents for active session', async () => {
      mockGrantRepository.findGrantById.mockResolvedValue({
        ...sampleGrant,
        status: 'ACTIVE',
      });
      mockGrantRepository.updateLastAccessed.mockResolvedValue({});
      mockContentRepository.listContentsByCardId.mockResolvedValue([
        {
          id: '66666666-6666-4666-8666-666666666666',
          memory_card_id: sampleCard.id,
          content_type: 'IMAGE',
          title: 'Our Trip',
          asset_key: 'memories/sample.jpg',
          sort_order: 0,
          status: 'ACTIVE',
          created_at: new Date('2026-01-01T00:00:00Z'),
          updated_at: new Date('2026-01-01T00:00:00Z'),
        },
      ]);

      const res = await service.getMemoryBySession({
        accessSessionId: sampleGrant.id,
      });

      expect(res.cardId).toBe(sampleCard.id);
      expect(res.items.length).toBe(1);
      expect(res.items[0].assetUrl).toBe('https://storage.memora.vn/sample.jpg');
      expect(mockGrantRepository.updateLastAccessed).toHaveBeenCalledWith(
        sampleGrant.id,
      );
    });
  });
});
