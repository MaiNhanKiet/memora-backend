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
    listAdminOrders: jest.fn(),
    findAdminOrderById: jest.fn(),
    updateOrderStatus: jest.fn(),
    listRingItemVersions: jest.fn(),
    findCurrentRingItemVersion: jest.fn(),
    updateCurrentRingItemVersion: jest.fn(),
    listOrderQuotes: jest.fn(),
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

  describe('listAdminOrders', () => {
    it('should return mapped admin order items and pagination', async () => {
      mockRepository.listAdminOrders.mockResolvedValue({
        items: [
          {
            id: 'ord-1',
            order_no: 'ORD-123',
            status: 'AWAITING_P1',
            source_plan_mode: 'N/A',
            owner_customer_identity_id: 'cust-1',
            recipient_name: 'Nguyen Van A',
            recipient_phone: '0901234567',
            recipient_email: 'a@example.com',
            _count: { ring_items: 2 },
            quotes_orders_current_quote_idToquotes: {
              total_amount: new Prisma.Decimal(15000000),
              currency: 'VND',
            },
            created_at: new Date('2026-11-14T10:00:00.000Z'),
            updated_at: new Date('2026-11-14T10:00:00.000Z'),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const res = await service.listAdminOrders({ page: 1, limit: 20 });

      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].orderNo).toBe('ORD-123');
      expect(res.items[0].itemsCount).toBe(2);
      expect(res.items[0].totalAmount).toBe(15000000);
    });
  });

  describe('getAdminOrderDetails', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockRepository.findAdminOrderById.mockResolvedValue(null);

      await expect(
        service.getAdminOrderDetails({ orderId: 'missing-ord' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return admin order details successfully', async () => {
      mockRepository.findAdminOrderById.mockResolvedValue({
        id: 'ord-1',
        order_no: 'ORD-123',
        status: 'AWAITING_P1',
        source_plan_mode: 'N/A',
        owner_customer_identity_id: 'cust-1',
        guest_email: null,
        guest_phone: null,
        guest_email_verified_at: null,
        recipient_name: 'Nguyen Van A',
        recipient_phone: '0901234567',
        recipient_email: 'a@example.com',
        delivery_address_json: { city: 'HCM' },
        pre_p1_evidence_json: { ack: true },
        quotes_orders_current_quote_idToquotes: {
          id: 'q-1',
          quote_no: 'QUO-123',
          quote_type: 'PROVISIONAL',
          subtotal_amount: new Prisma.Decimal(15000000),
          delivery_amount: new Prisma.Decimal(0),
          adjustment_amount: new Prisma.Decimal(0),
          total_amount: new Prisma.Decimal(15000000),
          currency: 'VND',
          status: 'ISSUED',
        },
        ring_items: [
          {
            id: 'item-1',
            item_no: 1,
            source_ring_design_draft_id: 'draft-1',
            current_version_id: 'ver-1',
            ring_item_versions_ring_items_current_version_idToring_item_versions:
              {
                version_no: 1,
                target_size: new Prisma.Decimal(14),
                personalization_package: 'SOUNDWAVE',
                memory_enabled: true,
                template_variants: {
                  id: 'tv-1',
                  materials: { name: 'Vàng 18K' },
                  ring_templates: { code: 'T01', name: 'Nhẫn Cưới' },
                },
              },
          },
        ],
        cancelled_at: null,
        cancellation_reason: null,
        created_at: new Date('2026-11-14T10:00:00.000Z'),
        updated_at: new Date('2026-11-14T10:00:00.000Z'),
      });

      const res = await service.getAdminOrderDetails({ orderId: 'ord-1' });

      expect(res.id).toBe('ord-1');
      expect(res.currentQuote?.totalAmount).toBe(15000000);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].personalizationPackage).toBe('SOUNDWAVE');
    });
  });

  describe('updateOrderStatus', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockRepository.findAdminOrderById.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus({
          orderId: 'missing-ord',
          targetStatus: 'CANCELLED',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if transition is invalid', async () => {
      mockRepository.findAdminOrderById.mockResolvedValue({
        id: 'ord-1',
        status: 'DELIVERED',
      });

      await expect(
        service.updateOrderStatus({
          orderId: 'ord-1',
          targetStatus: 'AWAITING_P1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transition status successfully', async () => {
      mockRepository.findAdminOrderById.mockResolvedValue({
        id: 'ord-1',
        status: 'AWAITING_P1',
      });

      mockRepository.updateOrderStatus.mockResolvedValue({
        id: 'ord-1',
        order_no: 'ORD-123',
        status: 'PENDING_FINAL_QUOTE',
        updated_at: new Date('2026-11-14T11:00:00.000Z'),
      });

      const res = await service.updateOrderStatus({
        orderId: 'ord-1',
        targetStatus: 'PENDING_FINAL_QUOTE',
      });

      expect(res.previousStatus).toBe('AWAITING_P1');
      expect(res.currentStatus).toBe('PENDING_FINAL_QUOTE');
      expect(mockRepository.updateOrderStatus).toHaveBeenCalledWith({
        orderId: 'ord-1',
        targetStatus: 'PENDING_FINAL_QUOTE',
        reason: undefined,
      });
    });
  });

  describe('listRingItemVersions', () => {
    it('should throw NotFoundException if order or item not found', async () => {
      mockRepository.listRingItemVersions.mockResolvedValue(null);

      await expect(
        service.listRingItemVersions({
          actor: { userId: 'u1' },
          orderId: 'ord-1',
          ringItemId: 'item-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return list of ring item versions', async () => {
      mockRepository.listRingItemVersions.mockResolvedValue([
        {
          id: 'ver-1',
          version_no: 1,
          status: 'DRAFT',
          target_size: new Prisma.Decimal(14),
          personalization_package: 'SOUNDWAVE',
          memory_enabled: true,
          change_reason: 'Initial',
          template_variants: {
            id: 'tv-1',
            materials: { name: 'Vàng 18K' },
            ring_templates: { code: 'T01', name: 'Nhẫn Cưới' },
          },
          ring_item_version_gemstones: [],
          created_at: new Date('2026-11-14T10:00:00.000Z'),
        },
      ]);

      const res = await service.listRingItemVersions({
        actor: { userId: 'u1' },
        orderId: 'ord-1',
        ringItemId: 'item-1',
      });

      expect(res.versions).toHaveLength(1);
      expect(res.versions[0].versionNo).toBe(1);
      expect(res.versions[0].targetSize).toBe(14);
    });
  });

  describe('updateCurrentRingItemVersion', () => {
    it('should throw NotFoundException if current version not found', async () => {
      mockRepository.findCurrentRingItemVersion.mockResolvedValue(null);

      await expect(
        service.updateCurrentRingItemVersion({
          actor: { userId: 'u1' },
          orderId: 'ord-1',
          ringItemId: 'item-1',
          targetSize: 14.5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if version is locked or approved', async () => {
      mockRepository.findCurrentRingItemVersion.mockResolvedValue({
        id: 'ver-1',
        status: 'LOCKED',
      });

      await expect(
        service.updateCurrentRingItemVersion({
          actor: { userId: 'u1' },
          orderId: 'ord-1',
          ringItemId: 'item-1',
          targetSize: 14.5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update current version successfully when in DRAFT', async () => {
      mockRepository.findCurrentRingItemVersion.mockResolvedValue({
        id: 'ver-1',
        status: 'DRAFT',
      });

      mockRepository.updateCurrentRingItemVersion.mockResolvedValue({
        id: 'ver-1',
        version_no: 1,
        status: 'DRAFT',
        target_size: new Prisma.Decimal(14.5),
        change_reason: 'Resize',
        created_at: new Date('2026-11-14T10:00:00.000Z'),
      });

      const res = await service.updateCurrentRingItemVersion({
        actor: { userId: 'u1' },
        orderId: 'ord-1',
        ringItemId: 'item-1',
        targetSize: 14.5,
        changeReason: 'Resize',
      });

      expect(res.targetSize).toBe(14.5);
      expect(res.changeReason).toBe('Resize');
    });
  });

  describe('listOrderQuotes', () => {
    it('should throw NotFoundException if order not found', async () => {
      mockRepository.listOrderQuotes.mockResolvedValue(null);

      await expect(
        service.listOrderQuotes({
          actor: { userId: 'u1' },
          orderId: 'ord-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return list of quotes with quote items', async () => {
      mockRepository.listOrderQuotes.mockResolvedValue([
        {
          id: 'quo-1',
          quote_no: 'QUO-123',
          quote_type: 'PROVISIONAL',
          version_no: 1,
          status: 'ISSUED',
          subtotal_amount: new Prisma.Decimal(15000000),
          delivery_amount: new Prisma.Decimal(0),
          adjustment_amount: new Prisma.Decimal(0),
          total_amount: new Prisma.Decimal(15000000),
          currency: 'VND',
          created_at: new Date('2026-11-14T10:00:00.000Z'),
          quote_items: [
            {
              id: 'qi-1',
              component_type: 'RING_BLANK',
              description: 'Vàng 18K',
              quantity: new Prisma.Decimal(1),
              unit_amount: new Prisma.Decimal(15000000),
              line_amount: new Prisma.Decimal(15000000),
              price_source_type: 'CATALOG_BASE',
            },
          ],
        },
      ]);

      const res = await service.listOrderQuotes({
        actor: { userId: 'u1' },
        orderId: 'ord-1',
      });

      expect(res.quotes).toHaveLength(1);
      expect(res.quotes[0].quoteNo).toBe('QUO-123');
      expect(res.quotes[0].items).toHaveLength(1);
      expect(res.quotes[0].items[0].lineAmount).toBe(15000000);
    });
  });
});
