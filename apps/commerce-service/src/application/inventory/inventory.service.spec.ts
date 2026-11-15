import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from '../../repositories/inventory.repository';
import { InventoryMapper } from './inventory.mapper';

describe('InventoryService', () => {
  let service: InventoryService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        InventoryMapper,
        {
          provide: InventoryRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  describe('listRingBlankStocks (INVEN-001)', () => {
    it('should return paginated ring blank stock lots', async () => {
      const now = new Date();
      mockRepository.findRingBlankStocks.mockResolvedValue({
        items: [
          {
            id: 'lot-1',
            stock_code: 'RB-001',
            stock_type: 'RING_BLANK',
            template_variant_id: 'v-1',
            quantity_on_hand: 10,
            quantity_reserved: 2,
            unit_cost: '2500000',
            status: 'AVAILABLE',
            updated_at: now,
          },
        ],
        total: 1,
      });

      const res = await service.listRingBlankStocks({ limit: 10, offset: 0 });
      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].stockCode).toBe('RB-001');
      expect(res.items[0].quantityOnHand).toBe(10);
      expect(res.items[0].quantityReserved).toBe(2);
      expect(res.items[0].unitCost).toBe(2500000);
    });
  });

  describe('receiveRingBlankStock (INVEN-002)', () => {
    it('should throw UnprocessableEntityException if quantity <= 0', async () => {
      await expect(
        service.receiveRingBlankStock({
          templateVariantId: 'v-1',
          quantity: 0,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should receive ring blank stock successfully', async () => {
      const now = new Date();
      mockRepository.receiveRingBlankStock.mockResolvedValue({
        id: 'lot-1',
        stock_code: 'RB-001',
        stock_type: 'RING_BLANK',
        template_variant_id: 'v-1',
        quantity_on_hand: 20,
        quantity_reserved: 0,
        unit_cost: '2500000',
        status: 'AVAILABLE',
        updated_at: now,
      });

      const res = await service.receiveRingBlankStock({
        templateVariantId: 'v-1',
        quantity: 20,
        unitCost: 2500000,
      });

      expect(res.id).toBe('lot-1');
      expect(res.quantityOnHand).toBe(20);
    });
  });

  describe('listGemstoneBatches (INVEN-003)', () => {
    it('should return paginated gemstone batches', async () => {
      const now = new Date();
      mockRepository.findGemstoneBatches.mockResolvedValue({
        items: [
          {
            id: 'gem-lot-1',
            stock_code: 'GEM-001',
            stock_type: 'GEMSTONE',
            gemstone_option_id: 'opt-1',
            quantity_on_hand: 100,
            quantity_reserved: 10,
            status: 'AVAILABLE',
            updated_at: now,
          },
        ],
        total: 1,
      });

      const res = await service.listGemstoneBatches({});
      expect(res.total).toBe(1);
      expect(res.items[0].quantityOnHand).toBe(100);
    });
  });

  describe('receiveGemstoneBatch (INVEN-004)', () => {
    it('should throw UnprocessableEntityException if quantity <= 0', async () => {
      await expect(
        service.receiveGemstoneBatch({
          gemstoneOptionId: 'opt-1',
          quantity: -5,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should receive gemstone batch successfully', async () => {
      const now = new Date();
      mockRepository.receiveGemstoneBatch.mockResolvedValue({
        id: 'gem-lot-1',
        stock_code: 'GEM-001',
        stock_type: 'GEMSTONE',
        gemstone_option_id: 'opt-1',
        quantity_on_hand: 50,
        quantity_reserved: 0,
        status: 'AVAILABLE',
        updated_at: now,
      });

      const res = await service.receiveGemstoneBatch({
        gemstoneOptionId: 'opt-1',
        quantity: 50,
      });

      expect(res.id).toBe('gem-lot-1');
      expect(res.quantityOnHand).toBe(50);
    });
  });

  describe('listCertifiedGemstoneAvailability (INVEN-005)', () => {
    it('should return available certified gemstones', async () => {
      const now = new Date();
      mockRepository.findCertifiedGemstoneAvailability.mockResolvedValue({
        items: [
          {
            id: 'cert-1',
            internal_code: 'CERT-DIA-01',
            gemstone_option_id: 'opt-1',
            certificate_provider: 'GIA',
            certificate_number: '2219482910',
            status: 'AVAILABLE',
            updated_at: now,
          },
        ],
        total: 1,
      });

      const res = await service.listCertifiedGemstoneAvailability({});
      expect(res.total).toBe(1);
      expect(res.items[0].internalCode).toBe('CERT-DIA-01');
      expect(res.items[0].certificateProvider).toBe('GIA');
    });
  });

  describe('createCertifiedGemstone (INVEN-006)', () => {
    it('should throw ConflictException if internal code exists', async () => {
      mockRepository.findCertifiedGemstoneByCode.mockResolvedValue({
        id: 'cert-old',
      });

      await expect(
        service.createCertifiedGemstone({
          internalCode: 'CERT-EXISTING',
          gemstoneOptionId: 'opt-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create certified gemstone successfully', async () => {
      const now = new Date();
      mockRepository.findCertifiedGemstoneByCode.mockResolvedValue(null);
      mockRepository.createCertifiedGemstone.mockResolvedValue({
        id: 'cert-new',
        internal_code: 'CERT-NEW',
        gemstone_option_id: 'opt-1',
        certificate_provider: 'IGI',
        status: 'AVAILABLE',
        updated_at: now,
      });

      const res = await service.createCertifiedGemstone({
        internalCode: 'CERT-NEW',
        gemstoneOptionId: 'opt-1',
        certificateProvider: 'IGI',
      });

      expect(res.id).toBe('cert-new');
      expect(res.internalCode).toBe('CERT-NEW');
    });
  });

  describe('listInventoryMovements (INVEN-012)', () => {
    it('should return inventory movements ledger', async () => {
      const now = new Date();
      mockRepository.findInventoryMovements.mockResolvedValue({
        items: [
          {
            id: 'mov-1',
            movement_type: 'RECEIPT',
            stock_lot_id: 'lot-1',
            quantity: 20,
            occurred_at: now,
          },
        ],
        total: 1,
      });

      const res = await service.listInventoryMovements({});
      expect(res.total).toBe(1);
      expect(res.items[0].movementType).toBe('RECEIPT');
      expect(res.items[0].quantity).toBe(20);
    });
  });

  describe('adjustInventory (INVEN-013)', () => {
    it('should throw UnprocessableEntityException if adjustedQuantity is 0', async () => {
      await expect(
        service.adjustInventory({
          stockLotId: 'lot-1',
          adjustedQuantity: 0,
          reason: 'No change',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw NotFoundException if stock lot not found', async () => {
      mockRepository.adjustInventory.mockRejectedValue(
        new Error('STOCK_LOT_NOT_FOUND'),
      );

      await expect(
        service.adjustInventory({
          stockLotId: 'lot-unknown',
          adjustedQuantity: -2,
          reason: 'Damaged item',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException if stock insufficient', async () => {
      mockRepository.adjustInventory.mockRejectedValue(
        new Error('STOCK_INSUFFICIENT'),
      );

      await expect(
        service.adjustInventory({
          stockLotId: 'lot-1',
          adjustedQuantity: -100,
          reason: 'Excess deduction',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should adjust inventory successfully', async () => {
      const now = new Date();
      mockRepository.adjustInventory.mockResolvedValue({
        id: 'lot-1',
        stock_code: 'RB-001',
        stock_type: 'RING_BLANK',
        quantity_on_hand: 8,
        quantity_reserved: 0,
        status: 'AVAILABLE',
        updated_at: now,
      });

      const res = await service.adjustInventory({
        stockLotId: 'lot-1',
        adjustedQuantity: -2,
        reason: 'Damaged item',
      });

      expect(res.id).toBe('lot-1');
      expect(res.quantityOnHand).toBe(8);
    });
  });

  describe('Inventory Allocations (INVEN-007..011)', () => {
    const validUserId = '11111111-1111-4111-8111-111111111111';
    const actor = { userId: validUserId };
    const now = new Date();

    it('should hold inventory successfully (INVEN-007)', async () => {
      mockRepository.holdInventory.mockResolvedValue({
        id: 'alloc-1',
        ring_item_id: 'ring-1',
        stock_lot_id: 'lot-1',
        quantity: 1,
        status: 'HOLD',
        expires_at: now,
        allocated_by_user_id: validUserId,
        created_at: now,
        updated_at: now,
      });

      const res = await service.holdInventory({
        actor,
        ringItemId: 'ring-1',
        stockLotId: 'lot-1',
        quantity: 1,
      });

      expect(res.id).toBe('alloc-1');
      expect(res.status).toBe('HOLD');
    });

    it('should reserve inventory successfully (INVEN-008)', async () => {
      mockRepository.reserveInventory.mockResolvedValue({
        id: 'alloc-1',
        ring_item_id: 'ring-1',
        quantity: 1,
        status: 'RESERVED',
        allocated_by_user_id: validUserId,
        created_at: now,
        updated_at: now,
      });

      const res = await service.reserveInventory({
        actor,
        allocationId: 'alloc-1',
      });

      expect(res.status).toBe('RESERVED');
    });

    it('should allocate inventory to production attempt (INVEN-009)', async () => {
      mockRepository.allocateInventory.mockResolvedValue({
        id: 'alloc-1',
        ring_item_id: 'ring-1',
        production_attempt_id: 'prod-att-1',
        quantity: 1,
        status: 'ALLOCATED',
        allocated_by_user_id: validUserId,
        created_at: now,
        updated_at: now,
      });

      const res = await service.allocateInventory({
        actor,
        allocationId: 'alloc-1',
        productionAttemptId: 'prod-att-1',
      });

      expect(res.status).toBe('ALLOCATED');
      expect(res.productionAttemptId).toBe('prod-att-1');
    });

    it('should consume inventory successfully (INVEN-010)', async () => {
      mockRepository.consumeInventory.mockResolvedValue({
        id: 'alloc-1',
        ring_item_id: 'ring-1',
        quantity: 1,
        status: 'CONSUMED',
        allocated_by_user_id: validUserId,
        created_at: now,
        updated_at: now,
      });

      const res = await service.consumeInventory({
        actor,
        allocationId: 'alloc-1',
      });

      expect(res.status).toBe('CONSUMED');
    });

    it('should release inventory successfully (INVEN-011)', async () => {
      mockRepository.releaseInventory.mockResolvedValue({
        id: 'alloc-1',
        ring_item_id: 'ring-1',
        quantity: 1,
        status: 'RELEASED',
        allocated_by_user_id: validUserId,
        created_at: now,
        updated_at: now,
      });

      const res = await service.releaseInventory({
        actor,
        allocationId: 'alloc-1',
        reason: 'Customer cancelled',
      });

      expect(res.status).toBe('RELEASED');
    });
  });
});
