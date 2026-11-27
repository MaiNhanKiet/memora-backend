import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ActivateCardUseCase,
  ProvisionMemoryCardUseCase,
} from './card-lifecycle.use-cases';
import {
  ChangePinUseCase,
  ResetPinUseCase,
  SetupPinUseCase,
} from './card-pin.use-cases';
import {
  GetCardByRingItemIdUseCase,
  GetCardDetailUseCase,
  ListMyCardsUseCase,
} from './card-query.use-cases';
import {
  MEMORY_CARD_REPOSITORY,
  type MemoryCardWithGrantsRecord,
} from './memory-card.repository';
import { PinHasher } from './pin-hasher';

describe('MemoryCard UseCases', () => {
  let listMyCardsUseCase: ListMyCardsUseCase;
  let getCardDetailUseCase: GetCardDetailUseCase;
  let activateCardUseCase: ActivateCardUseCase;
  let provisionMemoryCardUseCase: ProvisionMemoryCardUseCase;
  let getCardByRingItemIdUseCase: GetCardByRingItemIdUseCase;
  let setupPinUseCase: SetupPinUseCase;
  let changePinUseCase: ChangePinUseCase;
  let resetPinUseCase: ResetPinUseCase;

  const mockCardRepository = {
    listCardsByOwner: jest.fn(),
    findById: jest.fn(),
    findByRingItemId: jest.fn(),
    provisionCard: jest.fn(),
    activateCard: jest.fn(),
    updatePin: jest.fn(),
    changeVerifiedPin: jest.fn(),
    applyPinVerification: jest.fn(),
  };

  const mockPinHasher = {
    hash: jest
      .fn()
      .mockImplementation((pin: string) => Promise.resolve(`hash_${pin}`)),
    verify: jest
      .fn()
      .mockImplementation((hash: string, pin: string) =>
        Promise.resolve(hash === `hash_${pin}`),
      ),
  };

  const sampleActor = {
    userId: '11111111-1111-4111-8111-111111111111',
    customerIdentityId: '22222222-2222-4222-8222-222222222222',
  };

  const sampleCard: MemoryCardWithGrantsRecord = {
    id: '33333333-3333-4333-8333-333333333333',
    ringItemId: '44444444-4444-4444-8444-444444444444',
    ownerCustomerIdentityId: '22222222-2222-4222-8222-222222222222',
    ownerEmail: 'customer@memora.vn',
    status: 'PENDING',
    pinFailedAttempts: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    accessGrants: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListMyCardsUseCase,
        GetCardDetailUseCase,
        ActivateCardUseCase,
        ProvisionMemoryCardUseCase,
        GetCardByRingItemIdUseCase,
        SetupPinUseCase,
        ChangePinUseCase,
        ResetPinUseCase,
        { provide: MEMORY_CARD_REPOSITORY, useValue: mockCardRepository },
        { provide: PinHasher, useValue: mockPinHasher },
      ],
    }).compile();

    listMyCardsUseCase = module.get<ListMyCardsUseCase>(ListMyCardsUseCase);
    getCardDetailUseCase =
      module.get<GetCardDetailUseCase>(GetCardDetailUseCase);
    activateCardUseCase = module.get<ActivateCardUseCase>(ActivateCardUseCase);
    provisionMemoryCardUseCase = module.get<ProvisionMemoryCardUseCase>(
      ProvisionMemoryCardUseCase,
    );
    getCardByRingItemIdUseCase = module.get<GetCardByRingItemIdUseCase>(
      GetCardByRingItemIdUseCase,
    );
    setupPinUseCase = module.get<SetupPinUseCase>(SetupPinUseCase);
    changePinUseCase = module.get<ChangePinUseCase>(ChangePinUseCase);
    resetPinUseCase = module.get<ResetPinUseCase>(ResetPinUseCase);
  });

  describe('ResetPinUseCase', () => {
    it('resets PIN for the verified owner with only the new PIN', async () => {
      mockCardRepository.findById.mockResolvedValue(sampleCard);
      mockCardRepository.updatePin.mockResolvedValue(sampleCard);

      await expect(
        resetPinUseCase.execute({
          actor: sampleActor,
          cardId: sampleCard.id,
          newPin: '987654',
        }),
      ).resolves.toMatchObject({ success: true });

      expect(mockCardRepository.updatePin).toHaveBeenCalledWith(
        sampleCard.id,
        'hash_987654',
      );
    });

    it('does not let a different customer reset the PIN', async () => {
      mockCardRepository.findById.mockResolvedValue(sampleCard);

      await expect(
        resetPinUseCase.execute({
          actor: {
            ...sampleActor,
            customerIdentityId: '55555555-5555-4555-8555-555555555555',
          },
          cardId: sampleCard.id,
          newPin: '987654',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockCardRepository.updatePin).not.toHaveBeenCalled();
    });
  });

  describe('ListMyCardsUseCase', () => {
    it('should return paginated cards for customer', async () => {
      mockCardRepository.listCardsByOwner.mockResolvedValue({
        items: [sampleCard],
        total: 1,
      });

      const res = await listMyCardsUseCase.execute({
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

  describe('GetCardDetailUseCase', () => {
    it('should return card detail when owner requests', async () => {
      mockCardRepository.findById.mockResolvedValue(sampleCard);

      const res = await getCardDetailUseCase.execute({
        actor: sampleActor,
        cardId: sampleCard.id,
      });

      expect(res.id).toBe(sampleCard.id);
      expect(res.isOwner).toBe(true);
    });

    it('should throw NotFoundException if card does not exist', async () => {
      mockCardRepository.findById.mockResolvedValue(undefined);

      await expect(
        getCardDetailUseCase.execute({
          actor: sampleActor,
          cardId: 'missing-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('ActivateCardUseCase', () => {
    it('should activate card and hash initial pin when provided', async () => {
      mockCardRepository.findById.mockResolvedValue(sampleCard);
      mockCardRepository.activateCard.mockResolvedValue({
        ...sampleCard,
        status: 'ACTIVE',
        activatedAt: new Date(),
        pinHash: 'hash_1234',
      });

      const res = await activateCardUseCase.execute({
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

  describe('SetupPinUseCase', () => {
    it('should set pin when card has no pin yet', async () => {
      mockCardRepository.findById.mockResolvedValue({
        ...sampleCard,
        status: 'ACTIVE',
      });
      mockCardRepository.updatePin.mockResolvedValue({
        ...sampleCard,
        pinHash: 'hash_9999',
        pinUpdatedAt: new Date(),
      });

      const res = await setupPinUseCase.execute({
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
        pinHash: 'existing_hash',
      });

      await expect(
        setupPinUseCase.execute({
          actor: sampleActor,
          cardId: sampleCard.id,
          pin: '9999',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ChangePinUseCase', () => {
    it('should update pin if current pin matches', async () => {
      mockCardRepository.findById.mockResolvedValue({
        ...sampleCard,
        pinHash: 'hash_1234',
      });
      mockCardRepository.applyPinVerification.mockResolvedValue({
        kind: 'verified',
      });
      mockCardRepository.changeVerifiedPin.mockResolvedValue({
        ...sampleCard,
        pinHash: 'hash_5678',
        pinUpdatedAt: new Date(),
      });

      const res = await changePinUseCase.execute({
        actor: sampleActor,
        cardId: sampleCard.id,
        currentPin: '1234',
        newPin: '5678',
      });

      expect(res.success).toBe(true);
      expect(mockCardRepository.changeVerifiedPin).toHaveBeenCalledWith(
        sampleCard.id,
        'hash_1234',
        'hash_5678',
      );
    });

    it('should increment failed attempts when current pin is wrong', async () => {
      mockCardRepository.findById.mockResolvedValue({
        ...sampleCard,
        pinHash: 'hash_1234',
        pinFailedAttempts: 0,
      });
      mockCardRepository.applyPinVerification.mockResolvedValue({
        kind: 'invalid',
        failedAttempts: 4,
      });

      await expect(
        changePinUseCase.execute({
          actor: sampleActor,
          cardId: sampleCard.id,
          currentPin: '0000',
          newPin: '5678',
        }),
      ).rejects.toThrow('Bạn còn 1 lần thử');

      expect(mockCardRepository.applyPinVerification).toHaveBeenCalledWith({
        cardId: sampleCard.id,
        expectedPinHash: 'hash_1234',
        matches: false,
        maxFailedAttempts: 5,
        lockDurationMs: 15 * 60 * 1000,
      });
      expect(mockCardRepository.changeVerifiedPin).not.toHaveBeenCalled();
    });

    it('should reject changing the PIN after another request has changed it', async () => {
      mockCardRepository.findById.mockResolvedValue({
        ...sampleCard,
        pinHash: 'hash_1234',
      });
      mockCardRepository.applyPinVerification.mockResolvedValue({
        kind: 'verified',
      });
      mockCardRepository.changeVerifiedPin.mockResolvedValue(undefined);

      await expect(
        changePinUseCase.execute({
          actor: sampleActor,
          cardId: sampleCard.id,
          currentPin: '1234',
          newPin: '5678',
        }),
      ).rejects.toThrow('Trạng thái mã PIN đã thay đổi');
    });
  });

  describe('ProvisionMemoryCardUseCase', () => {
    it('should provision memory card idempotently', async () => {
      mockCardRepository.provisionCard.mockResolvedValue(sampleCard);

      const res = await provisionMemoryCardUseCase.execute({
        actor: sampleActor,
        ringItemId: sampleCard.ringItemId,
        ownerCustomerIdentityId: sampleCard.ownerCustomerIdentityId,
        ownerEmail: sampleCard.ownerEmail,
      });

      expect(res.id).toBe(sampleCard.id);
      expect(res.ringItemId).toBe(sampleCard.ringItemId);
      expect(mockCardRepository.provisionCard).toHaveBeenCalledWith({
        ringItemId: sampleCard.ringItemId,
        ownerCustomerIdentityId: sampleCard.ownerCustomerIdentityId,
        ownerEmail: sampleCard.ownerEmail,
      });
    });
  });

  describe('GetCardByRingItemIdUseCase', () => {
    it('should find card by ring item id', async () => {
      mockCardRepository.findByRingItemId.mockResolvedValue(sampleCard);

      const res = await getCardByRingItemIdUseCase.execute({
        actor: sampleActor,
        ringItemId: sampleCard.ringItemId,
      });

      expect(res.id).toBe(sampleCard.id);
      expect(res.isOwner).toBe(true);
      expect(mockCardRepository.findByRingItemId).toHaveBeenCalledWith(
        sampleCard.ringItemId,
      );
    });

    it('should throw NotFoundException when card does not exist', async () => {
      mockCardRepository.findByRingItemId.mockResolvedValue(undefined);

      await expect(
        getCardByRingItemIdUseCase.execute({
          actor: sampleActor,
          ringItemId: 'non-existent-ring-item',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
