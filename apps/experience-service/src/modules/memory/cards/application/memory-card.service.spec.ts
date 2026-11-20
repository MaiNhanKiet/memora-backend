import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MemoryCardService } from './memory-card.service';
import { MemoryCardRepository } from '../infrastructure/memory-card.repository';
import { PinHasher } from './pin-hasher';

describe('MemoryCardService', () => {
  let service: MemoryCardService;

  const mockCardRepository = {
    listCardsByOwner: jest.fn(),
    findById: jest.fn(),
    findByRingItemId: jest.fn(),
    activateCard: jest.fn(),
    updatePin: jest.fn(),
    recordFailedPinAttempt: jest.fn(),
    resetFailedPinAttempts: jest.fn(),
  };

  const mockPinHasher = {
    hash: jest.fn().mockImplementation((pin: string) => Promise.resolve(`hash_${pin}`)),
    verify: jest.fn().mockImplementation((hash: string, pin: string) => Promise.resolve(hash === `hash_${pin}`)),
  };

  const sampleActor = {
    userId: '11111111-1111-4111-8111-111111111111',
    customerIdentityId: '22222222-2222-4222-8222-222222222222',
  };

  const sampleCard = {
    id: '33333333-3333-4333-8333-333333333333',
    ring_item_id: '44444444-4444-4444-8444-444444444444',
    owner_customer_identity_id: '22222222-2222-4222-8222-222222222222',
    owner_email: 'customer@memora.vn',
    status: 'PENDING',
    activated_at: null,
    pin_hash: null,
    pin_failed_attempts: 0,
    pin_locked_until: null,
    pin_updated_at: null,
    ar_target_asset_key: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    deleted_at: null,
    access_grants: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryCardService,
        {
          provide: MemoryCardRepository,
          useValue: mockCardRepository,
        },
        {
          provide: PinHasher,
          useValue: mockPinHasher,
        },
      ],
    }).compile();

    service = module.get<MemoryCardService>(MemoryCardService);
  });

  describe('listMyCards', () => {
    it('should return paginated cards for customer', async () => {
      mockCardRepository.listCardsByOwner.mockResolvedValue({
        items: [sampleCard],
        total: 1,
      });

      const res = await service.listMyCards({
        actor: sampleActor,
        page: 1,
        limit: 10,
      });

      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
      expect(res.items[0].id).toBe(sampleCard.id);
      expect(mockCardRepository.listCardsByOwner).toHaveBeenCalledWith(
        sampleActor.customerIdentityId,
        0,
        10,
      );
    });
  });

  describe('getCardDetail', () => {
    it('should return card detail when owner requests', async () => {
      mockCardRepository.findById.mockResolvedValue(sampleCard);

      const res = await service.getCardDetail({
        actor: sampleActor,
        cardId: sampleCard.id,
      });

      expect(res.id).toBe(sampleCard.id);
      expect(res.isOwner).toBe(true);
    });

    it('should throw NotFoundException if card does not exist', async () => {
      mockCardRepository.findById.mockResolvedValue(null);

      await expect(
        service.getCardDetail({
          actor: sampleActor,
          cardId: 'missing-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateCard', () => {
    it('should activate card and hash initial pin when provided', async () => {
      mockCardRepository.findById.mockResolvedValue(sampleCard);
      mockCardRepository.activateCard.mockResolvedValue({
        ...sampleCard,
        status: 'ACTIVE',
        activated_at: new Date(),
        pin_hash: 'hash_1234',
      });

      const res = await service.activateCard({
        actor: sampleActor,
        cardId: sampleCard.id,
        initialPin: '1234',
      });

      expect(res.status).toBe('ACTIVE');
      expect(res.hasPin).toBe(true);
      expect(mockPinHasher.hash).toHaveBeenCalledWith('1234');
      expect(mockCardRepository.activateCard).toHaveBeenCalledWith(
        sampleCard.id,
        'hash_1234',
      );
    });
  });

  describe('setupPin', () => {
    it('should set pin when card has no pin yet', async () => {
      mockCardRepository.findById.mockResolvedValue({
        ...sampleCard,
        status: 'ACTIVE',
      });
      mockCardRepository.updatePin.mockResolvedValue({
        ...sampleCard,
        pin_hash: 'hash_9999',
        pin_updated_at: new Date(),
      });

      const res = await service.setupPin({
        actor: sampleActor,
        cardId: sampleCard.id,
        pin: '9999',
      });

      expect(res.success).toBe(true);
      expect(mockCardRepository.updatePin).toHaveBeenCalledWith(
        sampleCard.id,
        'hash_9999',
      );
    });

    it('should throw BadRequestException if pin is already configured', async () => {
      mockCardRepository.findById.mockResolvedValue({
        ...sampleCard,
        pin_hash: 'existing_hash',
      });

      await expect(
        service.setupPin({
          actor: sampleActor,
          cardId: sampleCard.id,
          pin: '9999',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePin', () => {
    it('should update pin if current pin matches', async () => {
      mockCardRepository.findById.mockResolvedValue({
        ...sampleCard,
        pin_hash: 'hash_1234',
      });
      mockCardRepository.updatePin.mockResolvedValue({
        ...sampleCard,
        pin_hash: 'hash_5678',
        pin_updated_at: new Date(),
      });

      const res = await service.changePin({
        actor: sampleActor,
        cardId: sampleCard.id,
        currentPin: '1234',
        newPin: '5678',
      });

      expect(res.success).toBe(true);
      expect(mockCardRepository.updatePin).toHaveBeenCalledWith(
        sampleCard.id,
        'hash_5678',
      );
    });

    it('should increment failed attempts when current pin is wrong', async () => {
      mockCardRepository.findById.mockResolvedValue({
        ...sampleCard,
        pin_hash: 'hash_1234',
        pin_failed_attempts: 0,
      });

      await expect(
        service.changePin({
          actor: sampleActor,
          cardId: sampleCard.id,
          currentPin: '0000',
          newPin: '5678',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockCardRepository.recordFailedPinAttempt).toHaveBeenCalledWith(
        sampleCard.id,
        1,
        null,
      );
    });
  });
});
