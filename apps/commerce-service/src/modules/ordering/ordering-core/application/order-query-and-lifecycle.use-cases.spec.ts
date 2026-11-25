import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CancelOrderUseCase,
  UpdateOrderStatusUseCase,
} from './order-lifecycle.use-cases';
import {
  GetAdminOrderDetailsUseCase,
  GetOrderPersonalizationContextUseCase,
  GetOrderTimelineUseCase,
  ListAdminOrdersUseCase,
} from './order-query.use-cases';
import { ORDERING_REPOSITORY } from './ordering.repository';
import { UpdateCurrentRingItemVersionUseCase } from './ring-item.use-cases';

describe('Order Query, Ring Item & Lifecycle UseCases', () => {
  let getOrderTimelineUseCase: GetOrderTimelineUseCase;
  let listAdminOrdersUseCase: ListAdminOrdersUseCase;
  let getAdminOrderDetailsUseCase: GetAdminOrderDetailsUseCase;
  let getOrderPersonalizationContextUseCase: GetOrderPersonalizationContextUseCase;
  let updateOrderStatusUseCase: UpdateOrderStatusUseCase;
  let cancelOrderUseCase: CancelOrderUseCase;
  let updateCurrentRingItemVersionUseCase: UpdateCurrentRingItemVersionUseCase;

  const mockRepository = {
    findOrderById: jest.fn(),
    listAdminOrders: jest.fn(),
    findAdminOrderById: jest.fn(),
    updateOrderStatus: jest.fn(),
    cancelOrder: jest.fn(),
    listRingItemVersions: jest.fn(),
    findCurrentRingItemVersion: jest.fn(),
    updateCurrentRingItemVersion: jest.fn(),
    findOrderPersonalizationContext: jest.fn(),
  };

  const validUserId = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOrderTimelineUseCase,
        ListAdminOrdersUseCase,
        GetAdminOrderDetailsUseCase,
        GetOrderPersonalizationContextUseCase,
        UpdateOrderStatusUseCase,
        CancelOrderUseCase,
        UpdateCurrentRingItemVersionUseCase,
        { provide: ORDERING_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    getOrderTimelineUseCase = module.get<GetOrderTimelineUseCase>(
      GetOrderTimelineUseCase,
    );
    listAdminOrdersUseCase = module.get<ListAdminOrdersUseCase>(
      ListAdminOrdersUseCase,
    );
    getAdminOrderDetailsUseCase = module.get<GetAdminOrderDetailsUseCase>(
      GetAdminOrderDetailsUseCase,
    );
    getOrderPersonalizationContextUseCase =
      module.get<GetOrderPersonalizationContextUseCase>(
        GetOrderPersonalizationContextUseCase,
      );
    updateOrderStatusUseCase = module.get<UpdateOrderStatusUseCase>(
      UpdateOrderStatusUseCase,
    );
    cancelOrderUseCase = module.get<CancelOrderUseCase>(CancelOrderUseCase);
    updateCurrentRingItemVersionUseCase =
      module.get<UpdateCurrentRingItemVersionUseCase>(
        UpdateCurrentRingItemVersionUseCase,
      );
    jest.clearAllMocks();
  });

  describe('GetOrderTimelineUseCase', () => {
    it('should return timeline and stage gates for order', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'order-1',
        orderNo: 'ORD-001',
        status: 'AWAITING_P1',
        sourcePlanMode: 'N/A',
        ownerCustomerIdentityId: validUserId,
        privacyNoticeAcknowledgedAt: new Date('2026-11-25T10:01:00Z'),
        ringItems: [],
        createdAt: new Date('2026-11-25T10:00:00Z'),
        updatedAt: new Date('2026-11-25T10:00:00Z'),
      });

      const res = await getOrderTimelineUseCase.execute({
        actor: { userId: validUserId },
        orderId: 'order-1',
      });

      expect(res.orderNo).toBe('ORD-001');
      expect(res.events).toHaveLength(2);
      expect(res.stageGates).toHaveLength(6);
    });
  });

  describe('ListAdminOrdersUseCase & GetAdminOrderDetailsUseCase', () => {
    it('should return mapped admin order items and pagination', async () => {
      mockRepository.listAdminOrders.mockResolvedValue({
        items: [
          {
            id: 'order-1',
            orderNo: 'ORD-001',
            status: 'AWAITING_P1',
            sourcePlanMode: 'N/A',
            ownerCustomerIdentityId: validUserId,
            ringItemsCount: 1,
            currentQuote: {
              id: 'q-1',
              quoteNo: 'QUO-1',
              quoteType: 'PROVISIONAL',
              subtotalAmount: 1000000,
              deliveryAmount: 0,
              adjustmentAmount: 0,
              totalAmount: 1000000,
              currency: 'VND',
              status: 'ISSUED',
            },
            createdAt: new Date('2026-11-25T10:00:00Z'),
            updatedAt: new Date('2026-11-25T10:00:00Z'),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const res = await listAdminOrdersUseCase.execute({ page: 1, limit: 20 });
      expect(res.items).toHaveLength(1);
      expect(res.items[0].totalAmount).toBe(1000000);
    });

    it('should throw NotFoundException if admin order does not exist', async () => {
      mockRepository.findAdminOrderById.mockResolvedValue(null);

      await expect(
        getAdminOrderDetailsUseCase.execute({ orderId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('UpdateOrderStatusUseCase & CancelOrderUseCase', () => {
    it('should throw BadRequestException if status transition is invalid', async () => {
      mockRepository.findAdminOrderById.mockResolvedValue({
        id: 'order-1',
        status: 'DELIVERED',
      });

      await expect(
        updateOrderStatusUseCase.execute({
          orderId: 'order-1',
          targetStatus: 'CANCELLED',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transition status successfully', async () => {
      mockRepository.findAdminOrderById.mockResolvedValue({
        id: 'order-1',
        status: 'AWAITING_P1',
      });
      mockRepository.updateOrderStatus.mockResolvedValue({
        id: 'order-1',
        orderNo: 'ORD-001',
        status: 'PENDING_FINAL_QUOTE',
        updatedAt: new Date('2026-11-25T10:00:00Z'),
      });

      const res = await updateOrderStatusUseCase.execute({
        orderId: 'order-1',
        targetStatus: 'PENDING_FINAL_QUOTE',
      });
      expect(res.currentStatus).toBe('PENDING_FINAL_QUOTE');
    });

    it('should cancel pre-production order successfully', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'order-1',
        status: 'AWAITING_P1',
      });
      mockRepository.cancelOrder.mockResolvedValue({
        id: 'order-1',
        status: 'CANCELLED',
        cancelledAt: new Date('2026-11-25T10:00:00Z'),
        cancellationReason: 'Changed mind',
      });

      const res = await cancelOrderUseCase.execute({
        actor: { userId: validUserId },
        orderId: 'order-1',
        reason: 'Changed mind',
      });

      expect(res.status).toBe('CANCELLED');
    });
  });

  describe('UpdateCurrentRingItemVersionUseCase', () => {
    it('should throw BadRequestException if version is locked', async () => {
      mockRepository.findCurrentRingItemVersion.mockResolvedValue({
        id: 'ver-1',
        status: 'APPROVED',
      });

      await expect(
        updateCurrentRingItemVersionUseCase.execute({
          actor: { userId: validUserId },
          orderId: 'order-1',
          ringItemId: 'item-1',
          targetSize: 13,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update current version when DRAFT', async () => {
      mockRepository.findCurrentRingItemVersion.mockResolvedValue({
        id: 'ver-1',
        status: 'DRAFT',
      });
      mockRepository.updateCurrentRingItemVersion.mockResolvedValue({
        id: 'ver-1',
        versionNo: 1,
        status: 'DRAFT',
        targetSize: 13,
        changeReason: 'Resize',
        createdAt: new Date('2026-11-25T10:00:00Z'),
      });

      const res = await updateCurrentRingItemVersionUseCase.execute({
        actor: { userId: validUserId },
        orderId: 'order-1',
        ringItemId: 'item-1',
        targetSize: 13,
        changeReason: 'Resize',
      });

      expect(res.targetSize).toBe(13);
    });
  });

  describe('GetOrderPersonalizationContextUseCase', () => {
    it('should validate UUID and return personalization context', async () => {
      await expect(
        getOrderPersonalizationContextUseCase.execute({ orderId: 'bad-id' }),
      ).rejects.toThrow(BadRequestException);

      mockRepository.findOrderPersonalizationContext.mockResolvedValue({
        id: validUserId,
        ownerCustomerIdentityId: validUserId,
        status: 'AWAITING_P1',
        sourcePlanMode: 'SHARED',
        p1Paid: true,
        ringItems: [],
      });

      const res = await getOrderPersonalizationContextUseCase.execute({
        orderId: validUserId,
      });
      expect(res.p1Paid).toBe(true);
    });
  });
});
