import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { OrderingService } from './ordering.service';
import { OrderingRepository } from '../../repositories/ordering.repository';

describe('OrderingService', () => {
  let service: OrderingService;

  const mockRepository = {
    findDraftsByIds: jest.fn(),
    findGemstoneSlotsByTemplateId: jest.fn(),
    createOrderTransaction: jest.fn(),
    listOrders: jest.fn(),
    findOrderById: jest.fn(),
    findRingItemWithDetails: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderingService,
        {
          provide: OrderingRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<OrderingService>(OrderingService);
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should throw BadRequestException if actor is missing', async () => {
      await expect(
        service.createOrder({
          actor: { userId: '', guestSessionId: '' },
          selectedDraftIds: ['d1'],
          fulfillmentMode: 'DELIVERY',
          recipientName: 'Test',
          recipientPhone: '0901234567',
          recipientEmail: 'test@example.com',
          deliveryAddressJson: '{}',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if draft count is not 1 or 2', async () => {
      await expect(
        service.createOrder({
          actor: { userId: 'u1' },
          selectedDraftIds: [],
          fulfillmentMode: 'DELIVERY',
          recipientName: 'Test',
          recipientPhone: '0901234567',
          recipientEmail: 'test@example.com',
          deliveryAddressJson: '{}',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createOrder({
          actor: { userId: 'u1' },
          selectedDraftIds: ['d1', 'd2', 'd3'],
          fulfillmentMode: 'DELIVERY',
          recipientName: 'Test',
          recipientPhone: '0901234567',
          recipientEmail: 'test@example.com',
          deliveryAddressJson: '{}',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if drafts are not found', async () => {
      mockRepository.findDraftsByIds.mockResolvedValue([]);

      await expect(
        service.createOrder({
          actor: { userId: 'u1' },
          selectedDraftIds: ['d1'],
          fulfillmentMode: 'DELIVERY',
          recipientName: 'Test',
          recipientPhone: '0901234567',
          recipientEmail: 'test@example.com',
          deliveryAddressJson: '{}',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if guest checks out personalized ring', async () => {
      mockRepository.findDraftsByIds.mockResolvedValue([
        {
          id: 'd1',
          personalization_package: 'FINGERPRINT',
          template_variants: {
            ring_template_id: 't1',
            materials: { name: 'Vàng 18K' },
            ring_templates: { code: 'T01', name: 'Nhẫn Cưới A' },
          },
        },
      ]);

      await expect(
        service.createOrder({
          actor: { guestSessionId: 'g1' },
          selectedDraftIds: ['d1'],
          fulfillmentMode: 'DELIVERY',
          recipientName: 'Guest',
          recipientPhone: '0901234567',
          recipientEmail: 'guest@example.com',
          deliveryAddressJson: '{}',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if personalized ring has no preP1Acknowledgement', async () => {
      mockRepository.findDraftsByIds.mockResolvedValue([
        {
          id: 'd1',
          personalization_package: 'SOUNDWAVE',
          template_variants: {
            ring_template_id: 't1',
            materials: { name: 'Vàng 18K' },
            ring_templates: { code: 'T01', name: 'Nhẫn Cưới A' },
          },
        },
      ]);

      await expect(
        service.createOrder({
          actor: { userId: 'u1' },
          selectedDraftIds: ['d1'],
          fulfillmentMode: 'DELIVERY',
          recipientName: 'User',
          recipientPhone: '0901234567',
          recipientEmail: 'user@example.com',
          deliveryAddressJson: '{}',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create order successfully for personalized ring with AWAITING_P1 and 30% deposit', async () => {
      mockRepository.findDraftsByIds.mockResolvedValue([
        {
          id: 'd1',
          cart_id: 'c1',
          template_variant_id: 'v1',
          target_size: new Prisma.Decimal(14),
          personalization_package: 'FINGERPRINT',
          memory_enabled: true,
          gemstone_config_json: [],
          estimated_price: new Prisma.Decimal(10000000),
          template_variants: {
            ring_template_id: 't1',
            materials: { name: 'Vàng 18K' },
            ring_templates: { code: 'T01', name: 'Nhẫn Cưới A' },
          },
        },
      ]);

      mockRepository.createOrderTransaction.mockResolvedValue({
        order: {
          id: 'order-1',
          order_no: 'ORD-123456',
          status: 'AWAITING_P1',
          source_plan_mode: 'N/A',
          created_at: new Date('2026-11-14T04:00:00.000Z'),
        },
        quote: { id: 'quo-1' },
        itemsCount: 1,
        totalAmount: new Prisma.Decimal(10000000),
      });

      const res = await service.createOrder({
        actor: { userId: 'u1' },
        selectedDraftIds: ['d1'],
        fulfillmentMode: 'DELIVERY',
        recipientName: 'Nguyen Van A',
        recipientPhone: '0901234567',
        recipientEmail: 'vana@example.com',
        deliveryAddressJson: '{"street":"123 Le Loi"}',
        preP1Acknowledgement: {
          noticeVersion: 'v1.0',
          privacyNoticeAcknowledged: true,
          p1NonrefundAcknowledged: true,
        },
      });

      expect(res.orderId).toBe('order-1');
      expect(res.status).toBe('AWAITING_P1');
      expect(res.totalAmount).toBe(10000000);
      expect(res.depositAmount).toBe(3000000); // 30%
    });

    it('should create order successfully for all-NONE rings with PENDING_FINAL_QUOTE and 0 deposit', async () => {
      mockRepository.findDraftsByIds.mockResolvedValue([
        {
          id: 'd1',
          cart_id: 'c1',
          template_variant_id: 'v1',
          target_size: new Prisma.Decimal(14),
          personalization_package: 'NONE',
          memory_enabled: false,
          gemstone_config_json: [],
          estimated_price: new Prisma.Decimal(5000000),
          template_variants: {
            ring_template_id: 't1',
            materials: { name: 'Bạc 925' },
            ring_templates: { code: 'T02', name: 'Nhẫn Trơn' },
          },
        },
      ]);

      mockRepository.createOrderTransaction.mockResolvedValue({
        order: {
          id: 'order-2',
          order_no: 'ORD-789012',
          status: 'PENDING_FINAL_QUOTE',
          source_plan_mode: 'N/A',
          created_at: new Date('2026-11-14T04:00:00.000Z'),
        },
        quote: { id: 'quo-2' },
        itemsCount: 1,
        totalAmount: new Prisma.Decimal(5000000),
      });

      const res = await service.createOrder({
        actor: { guestSessionId: 'g1' },
        selectedDraftIds: ['d1'],
        fulfillmentMode: 'DELIVERY',
        recipientName: 'Guest User',
        recipientPhone: '0901234567',
        recipientEmail: 'guest@example.com',
        deliveryAddressJson: '{}',
      });

      expect(res.orderId).toBe('order-2');
      expect(res.status).toBe('PENDING_FINAL_QUOTE');
      expect(res.totalAmount).toBe(5000000);
      expect(res.depositAmount).toBe(0); // 0 deposit for all-NONE
    });
  });

  describe('getOrderTimeline', () => {
    it('should return timeline and stage gates for order', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'order-1',
        order_no: 'ORD-123456',
        status: 'AWAITING_P1',
        privacy_notice_acknowledged_at: new Date('2026-11-14T04:00:00.000Z'),
        cancelled_at: null,
        created_at: new Date('2026-11-14T04:00:00.000Z'),
      });

      const res = await service.getOrderTimeline({
        actor: { userId: 'u1' },
        orderId: 'order-1',
      });

      expect(res.orderId).toBe('order-1');
      expect(res.events).toHaveLength(2); // CREATED and PRE_P1_ACKNOWLEDGED
      expect(res.stageGates).toHaveLength(6);
      expect(
        res.stageGates.find((s) => s.stageCode === 'DEPOSIT_P1')?.status,
      ).toBe('ACTIVE');
    });
  });
});
