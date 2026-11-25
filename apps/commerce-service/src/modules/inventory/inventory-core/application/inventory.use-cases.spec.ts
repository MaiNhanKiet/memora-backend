import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AllocationUseCases } from './allocation.use-cases';
import { CertifiedGemstoneUseCases } from './certified-gemstone.use-cases';
import { INVENTORY_REPOSITORY } from './inventory.repository';
import { StockLotUseCases } from './stock-lot.use-cases';

describe('Inventory Use Cases', () => {
  let stockLotUseCases: StockLotUseCases;
  let certifiedUseCases: CertifiedGemstoneUseCases;
  let allocationUseCases: AllocationUseCases;

  const mockRepository = {
    findRingBlankStocks: jest.fn(),
    receiveRingBlankStock: jest.fn(),
    findGemstoneBatches: jest.fn(),
    receiveGemstoneBatch: jest.fn(),
    findCertifiedGemstoneAvailability: jest.fn(),
    findCertifiedGemstoneByCode: jest.fn(),
    createCertifiedGemstone: jest.fn(),
    findInventoryMovements: jest.fn(),
    adjustInventory: jest.fn(),
    holdInventory: jest.fn(),
    reserveInventory: jest.fn(),
    allocateInventory: jest.fn(),
    consumeInventory: jest.fn(),
    releaseInventory: jest.fn(),
  };

  const validUserId = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockLotUseCases,
        CertifiedGemstoneUseCases,
        AllocationUseCases,
        { provide: INVENTORY_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    stockLotUseCases = module.get<StockLotUseCases>(StockLotUseCases);
    certifiedUseCases = module.get<CertifiedGemstoneUseCases>(
      CertifiedGemstoneUseCases,
    );
    allocationUseCases = module.get<AllocationUseCases>(AllocationUseCases);
    jest.clearAllMocks();
  });

  describe('StockLotUseCases', () => {
    it('should return paginated ring blank stock lots', async () => {
      mockRepository.findRingBlankStocks.mockResolvedValue({
        items: [
          {
            id: 'lot-1',
            stockCode: 'RB-1',
            stockType: 'RING_BLANK',
            quantityOnHand: 10,
            quantityReserved: 2,
            status: 'ACTIVE',
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      const res = await stockLotUseCases.listRingBlankStocks({});
      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    it('should validate quantity > 0 when receiving ring blank or gemstone batch', async () => {
      await expect(
        stockLotUseCases.receiveRingBlankStock({
          templateVariantId: 'v-1',
          quantity: 0,
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      await expect(
        stockLotUseCases.receiveGemstoneBatch({
          gemstoneOptionId: 'g-1',
          quantity: -1,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should adjust inventory and map repository errors', async () => {
      await expect(
        stockLotUseCases.adjustInventory({
          stockLotId: 'lot-1',
          adjustedQuantity: 0,
          reason: 'audit',
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      mockRepository.adjustInventory.mockRejectedValue(
        new Error('STOCK_LOT_NOT_FOUND'),
      );
      await expect(
        stockLotUseCases.adjustInventory({
          stockLotId: 'lot-1',
          adjustedQuantity: 5,
          reason: 'audit',
        }),
      ).rejects.toThrow(NotFoundException);

      mockRepository.adjustInventory.mockRejectedValue(
        new Error('STOCK_INSUFFICIENT'),
      );
      await expect(
        stockLotUseCases.adjustInventory({
          stockLotId: 'lot-1',
          adjustedQuantity: -100,
          reason: 'audit',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('CertifiedGemstoneUseCases', () => {
    it('should throw ConflictException if internal code exists', async () => {
      mockRepository.findCertifiedGemstoneByCode.mockResolvedValue({
        id: 'cg-1',
      });

      await expect(
        certifiedUseCases.createCertifiedGemstone({
          internalCode: 'GIA-001',
          gemstoneOptionId: 'g-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create certified gemstone successfully', async () => {
      mockRepository.findCertifiedGemstoneByCode.mockResolvedValue(null);
      mockRepository.createCertifiedGemstone.mockResolvedValue({
        id: 'cg-1',
        internalCode: 'GIA-001',
        gemstoneOptionId: 'g-1',
        status: 'AVAILABLE',
        updatedAt: new Date(),
      });

      const res = await certifiedUseCases.createCertifiedGemstone({
        internalCode: 'GIA-001',
        gemstoneOptionId: 'g-1',
      });

      expect(res.internalCode).toBe('GIA-001');
      expect(res.status).toBe('AVAILABLE');
    });
  });

  describe('AllocationUseCases', () => {
    it('should hold, reserve, allocate, consume, and release inventory', async () => {
      const baseAlloc = {
        id: 'alloc-1',
        ringItemId: 'ri-1',
        stockLotId: 'lot-1',
        quantity: 1,
        status: 'HOLD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.holdInventory.mockResolvedValue(baseAlloc);
      const held = await allocationUseCases.holdInventory({
        actor: { userId: validUserId },
        ringItemId: 'ri-1',
        stockLotId: 'lot-1',
        quantity: 1,
      });
      expect(held.status).toBe('HOLD');

      mockRepository.reserveInventory.mockResolvedValue({
        ...baseAlloc,
        status: 'RESERVED',
      });
      const reserved = await allocationUseCases.reserveInventory({
        actor: { userId: validUserId },
        allocationId: 'alloc-1',
      });
      expect(reserved.status).toBe('RESERVED');

      mockRepository.allocateInventory.mockResolvedValue({
        ...baseAlloc,
        status: 'ALLOCATED',
      });
      const allocated = await allocationUseCases.allocateInventory({
        actor: { userId: validUserId },
        allocationId: 'alloc-1',
        productionAttemptId: 'pa-1',
      });
      expect(allocated.status).toBe('ALLOCATED');

      mockRepository.consumeInventory.mockResolvedValue({
        ...baseAlloc,
        status: 'CONSUMED',
      });
      const consumed = await allocationUseCases.consumeInventory({
        actor: { userId: validUserId },
        allocationId: 'alloc-1',
      });
      expect(consumed.status).toBe('CONSUMED');

      mockRepository.releaseInventory.mockResolvedValue({
        ...baseAlloc,
        status: 'RELEASED',
      });
      const released = await allocationUseCases.releaseInventory({
        actor: { userId: validUserId },
        allocationId: 'alloc-1',
        reason: 'cancelled',
      });
      expect(released.status).toBe('RELEASED');
    });
  });
});
