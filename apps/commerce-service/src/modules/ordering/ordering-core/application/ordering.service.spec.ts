import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { OrderingService } from './ordering.service';
import { OrderingRepository } from '../infrastructure/ordering.repository';
import { PayosProvider } from '../infrastructure/payment/payos.provider';

describe('OrderingService', () => {
  let service: OrderingService;
  const validUserId = '11111111-1111-4111-8111-111111111111';
  const validGuestSessionId = '22222222-2222-4222-8222-222222222222';

  const mockPayosProvider = {
    generateOrderCode: jest.fn().mockReturnValue(1715001234),
    createPaymentLink: jest.fn().mockResolvedValue({
      orderCode: 1715001234,
      amount: 4500000,
      checkoutUrl: 'https://pay.payos.vn/web/pl_123',
      qrCode: 'qr-sample',
      paymentLinkId: 'pl_123',
      status: 'PENDING',
    }),
    verifyWebhookSignature: jest.fn().mockReturnValue(true),
    getPaymentInformation: jest.fn().mockResolvedValue({
      orderCode: 1715001234,
      amount: 4500000,
      status: 'PAID',
    }),
  };

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
    findOrderPersonalizationContext: jest.fn(),
    cancelOrder: jest.fn(),
    createFinalQuote: jest.fn(),
    findQuoteById: jest.fn(),
    updateFinalQuote: jest.fn(),
    publishFinalQuote: jest.fn(),
    confirmFinalQuote: jest.fn(),
    rejectFinalQuote: jest.fn(),
    findFinalConfirmations: jest.fn(),
    findOrderPayments: jest.fn(),
    findOrderPaymentById: jest.fn(),
    findPaymentReceipt: jest.fn(),
    findOrderInvoice: jest.fn(),
    createRefundRequest: jest.fn(),
    findClaimQuotes: jest.fn(),
    findClaimQuoteById: jest.fn(),
    acceptClaimQuote: jest.fn(),
    createPaymentTransaction: jest.fn(),
    findTransactionByOrderCode: jest.fn(),
    markPaymentTransactionSucceeded: jest.fn(),
    findPaymentTransactionById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderingService,
        {
          provide: OrderingRepository,
          useValue: mockRepository,
        },
        {
          provide: PayosProvider,
          useValue: mockPayosProvider,
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
          actor: { userId: validUserId },
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
          actor: { userId: validUserId },
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
          actor: { userId: validUserId },
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
          actor: { guestSessionId: validGuestSessionId },
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
          actor: { userId: validUserId },
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
        actor: { userId: validUserId },
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
        actor: { guestSessionId: validGuestSessionId },
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
        actor: { userId: validUserId },
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
          actor: { userId: validUserId },
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
        actor: { userId: validUserId },
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
          actor: { userId: validUserId },
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
          actor: { userId: validUserId },
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
        actor: { userId: validUserId },
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
          actor: { userId: validUserId },
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
        actor: { userId: validUserId },
        orderId: 'ord-1',
      });

      expect(res.quotes).toHaveLength(1);
      expect(res.quotes[0].quoteNo).toBe('QUO-123');
      expect(res.quotes[0].items).toHaveLength(1);
      expect(res.quotes[0].items[0].lineAmount).toBe(15000000);
    });
  });

  describe('getOrderPersonalizationContext', () => {
    it('should throw BadRequestException if orderId is missing or not a UUID', async () => {
      await expect(
        service.getOrderPersonalizationContext({ orderId: '' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.getOrderPersonalizationContext({ orderId: 'not-a-uuid' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      mockRepository.findOrderPersonalizationContext.mockResolvedValue(null);

      await expect(
        service.getOrderPersonalizationContext({
          orderId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return context with p1Paid = true when completed P1 payment exists', async () => {
      mockRepository.findOrderPersonalizationContext.mockResolvedValue({
        id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        order_no: 'ORD-123',
        owner_customer_identity_id: 'cust-1',
        status: 'AWAITING_P1',
        source_plan_mode: 'SHARED',
        payment_transactions: [{ id: 'tx-1' }],
        ring_items: [
          {
            id: 'item-1',
            item_no: 1,
            current_version_id: 'ver-1',
            ring_item_versions_ring_items_current_version_idToring_item_versions:
              {
                id: 'ver-1',
                version_no: 1,
                personalization_package: 'SOUNDWAVE',
                status: 'DRAFT',
              },
          },
        ],
      });

      const res = await service.getOrderPersonalizationContext({
        orderId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      });

      expect(res.orderId).toBe('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
      expect(res.ownerCustomerIdentityId).toBe('cust-1');
      expect(res.p1Paid).toBe(true);
      expect(res.sourcePlanMode).toBe('SHARED');
      expect(res.ringItems).toHaveLength(1);
      expect(res.ringItems[0].personalizationPackage).toBe('SOUNDWAVE');
      expect(res.ringItems[0].versionStatus).toBe('DRAFT');
    });

    it('should return context with p1Paid = false when no completed P1 payment exists', async () => {
      mockRepository.findOrderPersonalizationContext.mockResolvedValue({
        id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        order_no: 'ORD-123',
        owner_customer_identity_id: 'cust-1',
        status: 'PENDING_FINAL_QUOTE',
        source_plan_mode: 'N/A',
        payment_transactions: [],
        ring_items: [],
      });

      const res = await service.getOrderPersonalizationContext({
        orderId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      });

      expect(res.p1Paid).toBe(false);
      expect(res.status).toBe('PENDING_FINAL_QUOTE');
      expect(res.ringItems).toHaveLength(0);
    });
  });

  describe('cancelOrder', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockRepository.findOrderById.mockResolvedValue(null);

      await expect(
        service.cancelOrder({
          actor: { userId: validUserId },
          orderId: 'ord-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order is not in cancellable status', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'ord-1',
        status: 'IN_PRODUCTION',
      });

      await expect(
        service.cancelOrder({
          actor: { userId: validUserId },
          orderId: 'ord-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel order successfully and release allocations', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'ord-1',
        status: 'AWAITING_P1',
      });
      mockRepository.cancelOrder.mockResolvedValue({
        id: 'ord-1',
        status: 'CANCELLED',
        cancelled_at: new Date('2026-11-15T08:00:00.000Z'),
        cancellation_reason: 'Changed my mind',
      });

      const res = await service.cancelOrder({
        actor: { userId: validUserId },
        orderId: 'ord-1',
        reason: 'Changed my mind',
      });

      expect(res.orderId).toBe('ord-1');
      expect(res.status).toBe('CANCELLED');
      expect(res.cancellationReason).toBe('Changed my mind');
      expect(mockRepository.cancelOrder).toHaveBeenCalledWith(
        'ord-1',
        'Changed my mind',
      );
    });
  });

  describe('createFinalQuote', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockRepository.findAdminOrderById.mockResolvedValue(null);

      await expect(
        service.createFinalQuote({
          orderId: 'ord-1',
          totalAmount: 14000000,
          items: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if line items are empty', async () => {
      mockRepository.findAdminOrderById.mockResolvedValue({ id: 'ord-1' });

      await expect(
        service.createFinalQuote({
          orderId: 'ord-1',
          totalAmount: 14000000,
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create final quote draft successfully', async () => {
      mockRepository.findAdminOrderById.mockResolvedValue({ id: 'ord-1' });
      mockRepository.createFinalQuote.mockResolvedValue({
        id: 'quo-1',
        quote_no: 'QUO-ORD-1-F1',
        quote_type: 'FINAL',
        version_no: 1,
        status: 'DRAFT',
        subtotal_amount: new Prisma.Decimal(14000000),
        delivery_amount: new Prisma.Decimal(0),
        adjustment_amount: new Prisma.Decimal(0),
        total_amount: new Prisma.Decimal(14000000),
        currency: 'VND',
        created_at: new Date('2026-11-15T08:00:00.000Z'),
        valid_until: null,
        issued_at: null,
        accepted_at: null,
        quote_items: [
          {
            id: 'qi-1',
            ring_item_id: null,
            component_type: 'GOLD',
            description: '18K Gold',
            quantity: new Prisma.Decimal(1),
            unit_amount: new Prisma.Decimal(14000000),
            line_amount: new Prisma.Decimal(14000000),
            price_source_type: 'MANUAL',
          },
        ],
      });

      const res = await service.createFinalQuote({
        orderId: 'ord-1',
        totalAmount: 14000000,
        items: [
          {
            componentType: 'GOLD',
            description: '18K Gold',
            quantity: 1,
            unitAmount: 14000000,
            lineAmount: 14000000,
          },
        ],
      });

      expect(res.id).toBe('quo-1');
      expect(res.status).toBe('DRAFT');
      expect(res.items).toHaveLength(1);
    });
  });

  describe('updateFinalQuote', () => {
    it('should throw NotFoundException if quote does not exist', async () => {
      mockRepository.findQuoteById.mockResolvedValue(null);

      await expect(
        service.updateFinalQuote({
          orderId: 'ord-1',
          quoteId: 'quo-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if quote is not in DRAFT status', async () => {
      mockRepository.findQuoteById.mockResolvedValue({
        id: 'quo-1',
        status: 'ISSUED',
        quote_type: 'FINAL',
      });

      await expect(
        service.updateFinalQuote({
          orderId: 'ord-1',
          quoteId: 'quo-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update quote successfully', async () => {
      mockRepository.findQuoteById.mockResolvedValue({
        id: 'quo-1',
        status: 'DRAFT',
        quote_type: 'FINAL',
      });
      mockRepository.updateFinalQuote.mockResolvedValue({
        id: 'quo-1',
        quote_no: 'QUO-ORD-1-F1',
        quote_type: 'FINAL',
        version_no: 1,
        status: 'DRAFT',
        subtotal_amount: new Prisma.Decimal(13500000),
        delivery_amount: new Prisma.Decimal(0),
        adjustment_amount: new Prisma.Decimal(-500000),
        total_amount: new Prisma.Decimal(13000000),
        currency: 'VND',
        created_at: new Date('2026-11-15T08:00:00.000Z'),
        valid_until: null,
        issued_at: null,
        accepted_at: null,
        quote_items: [],
      });

      const res = await service.updateFinalQuote({
        orderId: 'ord-1',
        quoteId: 'quo-1',
        totalAmount: 13000000,
      });

      expect(res.totalAmount).toBe(13000000);
    });
  });

  describe('publishFinalQuote', () => {
    it('should throw BadRequestException if quote is not in DRAFT status', async () => {
      mockRepository.findQuoteById.mockResolvedValue({
        id: 'quo-1',
        status: 'ACCEPTED',
      });

      await expect(
        service.publishFinalQuote({
          orderId: 'ord-1',
          quoteId: 'quo-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should publish quote successfully', async () => {
      mockRepository.findQuoteById.mockResolvedValue({
        id: 'quo-1',
        status: 'DRAFT',
      });
      mockRepository.publishFinalQuote.mockResolvedValue({
        id: 'quo-1',
        quote_no: 'QUO-ORD-1-F1',
        quote_type: 'FINAL',
        version_no: 1,
        status: 'ISSUED',
        subtotal_amount: new Prisma.Decimal(14000000),
        delivery_amount: new Prisma.Decimal(0),
        adjustment_amount: new Prisma.Decimal(0),
        total_amount: new Prisma.Decimal(14000000),
        currency: 'VND',
        created_at: new Date('2026-11-15T08:00:00.000Z'),
        valid_until: new Date('2026-11-22T08:00:00.000Z'),
        issued_at: new Date('2026-11-15T08:00:00.000Z'),
        accepted_at: null,
        quote_items: [],
      });

      const res = await service.publishFinalQuote({
        orderId: 'ord-1',
        quoteId: 'quo-1',
      });

      expect(res.status).toBe('ISSUED');
      expect(res.issuedAt).toBeDefined();
    });
  });

  describe('confirmFinalQuote', () => {
    it('should throw BadRequestException if quote is not in ISSUED status', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'ord-1',
        current_quote_id: 'quo-1',
        source_plan_mode: 'SHARED',
      });
      mockRepository.findQuoteById.mockResolvedValue({
        id: 'quo-1',
        status: 'DRAFT',
      });

      await expect(
        service.confirmFinalQuote({
          actor: { userId: validUserId },
          orderId: 'ord-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should confirm quote and advance order to AWAITING_P2 for personalized orders', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'ord-1',
        current_quote_id: 'quo-1',
        source_plan_mode: 'SHARED',
      });
      mockRepository.findQuoteById.mockResolvedValue({
        id: 'quo-1',
        status: 'ISSUED',
        valid_until: new Date(Date.now() + 86400000),
      });
      mockRepository.confirmFinalQuote.mockResolvedValue({
        confirmation: {
          id: 'conf-1',
          order_id: 'ord-1',
          quote_id: 'quo-1',
          status: 'ACTIVE',
          confirmed_at: new Date('2026-11-15T09:00:00.000Z'),
          final_confirmation_items: [
            {
              id: 'fci-1',
              ring_item_id: 'item-1',
              ring_item_version_id: 'ver-1',
            },
          ],
        },
        ringItems: [
          {
            id: 'item-1',
            current_version_id: 'ver-1',
            ring_item_versions_ring_items_current_version_idToring_item_versions:
              { version_no: 1 },
          },
        ],
      });

      const res = await service.confirmFinalQuote({
        actor: { userId: validUserId },
        orderId: 'ord-1',
      });

      expect(res.confirmationId).toBe('conf-1');
      expect(res.nextOrderStatus).toBe('AWAITING_P2');
      expect(res.items).toHaveLength(1);
      expect(res.items[0].versionNo).toBe(1);
    });
  });

  describe('rejectFinalQuote', () => {
    it('should throw BadRequestException if rejection reason is missing', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'ord-1',
        current_quote_id: 'quo-1',
      });
      mockRepository.findQuoteById.mockResolvedValue({
        id: 'quo-1',
        status: 'ISSUED',
      });

      await expect(
        service.rejectFinalQuote({
          actor: { userId: validUserId },
          orderId: 'ord-1',
          reason: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject quote and set order status to PENDING_FINAL_QUOTE', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'ord-1',
        current_quote_id: 'quo-1',
      });
      mockRepository.findQuoteById.mockResolvedValue({
        id: 'quo-1',
        status: 'ISSUED',
      });
      mockRepository.rejectFinalQuote.mockResolvedValue({
        id: 'ord-1',
        status: 'PENDING_FINAL_QUOTE',
      });

      const res = await service.rejectFinalQuote({
        actor: { userId: validUserId },
        orderId: 'ord-1',
        reason: 'Price too high',
      });

      expect(res.status).toBe('REJECTED');
      expect(res.updatedOrderStatus).toBe('PENDING_FINAL_QUOTE');
      expect(res.reason).toBe('Price too high');
    });
  });

  describe('getOrderFinalConfirmations', () => {
    it('should return confirmations list', async () => {
      mockRepository.findOrderById.mockResolvedValue({ id: 'ord-1' });
      mockRepository.findFinalConfirmations.mockResolvedValue([
        {
          id: 'conf-1',
          order_id: 'ord-1',
          quote_id: 'quo-1',
          confirmed_by_customer_identity_id: validUserId,
          status: 'ACTIVE',
          confirmed_at: new Date('2026-11-15T09:00:00.000Z'),
          quotes: {
            quote_no: 'QUO-1',
            total_amount: new Prisma.Decimal(14000000),
          },
          final_confirmation_items: [
            {
              id: 'fci-1',
              ring_item_id: 'item-1',
              ring_item_version_id: 'ver-1',
              ring_item_versions: { version_no: 1 },
            },
          ],
        },
      ]);

      const res = await service.getOrderFinalConfirmations({
        actor: { userId: validUserId },
        orderId: 'ord-1',
      });

      expect(res.confirmations).toHaveLength(1);
      expect(res.confirmations[0].quoteNo).toBe('QUO-1');
      expect(res.confirmations[0].items[0].versionNo).toBe(1);
    });
  });

  describe('listOrderPayments', () => {
    it('should throw NotFoundException if order not found', async () => {
      mockRepository.findOrderById.mockResolvedValue(null);

      await expect(
        service.listOrderPayments({
          actor: { userId: validUserId },
          orderId: 'ord-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return list of payments and calculate totalPaidAmount', async () => {
      mockRepository.findOrderById.mockResolvedValue({ id: 'ord-1' });
      mockRepository.findOrderPayments.mockResolvedValue([
        {
          id: 'tx-1',
          order_id: 'ord-1',
          payment_stage: 'P1',
          transaction_type: 'PAYMENT',
          amount: new Prisma.Decimal(4500000),
          currency: 'VND',
          status: 'SUCCEEDED',
          provider: 'PAYOS',
          payment_method: 'PAYOS',
          requested_at: new Date('2026-11-15T04:00:00.000Z'),
          completed_at: new Date('2026-11-15T04:05:00.000Z'),
          receipt_no: 'REC-1',
        },
        {
          id: 'tx-2',
          order_id: 'ord-1',
          payment_stage: 'P2',
          transaction_type: 'PAYMENT',
          amount: new Prisma.Decimal(6000000),
          currency: 'VND',
          status: 'PENDING',
          provider: 'PAYOS',
          payment_method: 'PAYOS',
          requested_at: new Date('2026-11-15T08:00:00.000Z'),
          completed_at: null,
          receipt_no: null,
        },
      ]);

      const res = await service.listOrderPayments({
        actor: { userId: validUserId },
        orderId: 'ord-1',
      });

      expect(res.orderId).toBe('ord-1');
      expect(res.totalPaidAmount).toBe(4500000);
      expect(res.payments).toHaveLength(2);
      expect(res.payments[0].receiptNo).toBe('REC-1');
    });
  });

  describe('getOrderPaymentById', () => {
    it('should throw NotFoundException if transaction not found', async () => {
      mockRepository.findOrderById.mockResolvedValue({ id: 'ord-1' });
      mockRepository.findOrderPaymentById.mockResolvedValue(null);

      await expect(
        service.getOrderPaymentById({
          actor: { userId: validUserId },
          orderId: 'ord-1',
          transactionId: 'tx-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return transaction detail', async () => {
      mockRepository.findOrderById.mockResolvedValue({ id: 'ord-1' });
      mockRepository.findOrderPaymentById.mockResolvedValue({
        id: 'tx-1',
        order_id: 'ord-1',
        payment_stage: 'P1',
        transaction_type: 'PAYMENT',
        amount: new Prisma.Decimal(4500000),
        currency: 'VND',
        status: 'SUCCEEDED',
        provider: 'PAYOS',
        payment_method: 'PAYOS',
        requested_at: new Date('2026-11-15T04:00:00.000Z'),
        completed_at: new Date('2026-11-15T04:05:00.000Z'),
        receipt_no: 'REC-1',
      });

      const res = await service.getOrderPaymentById({
        actor: { userId: validUserId },
        orderId: 'ord-1',
        transactionId: 'tx-1',
      });

      expect(res.id).toBe('tx-1');
      expect(res.status).toBe('SUCCEEDED');
      expect(res.amount).toBe(4500000);
    });
  });

  describe('getPaymentReceipt', () => {
    it('should throw BadRequestException if transaction is not SUCCEEDED', async () => {
      mockRepository.findOrderById.mockResolvedValue({ id: 'ord-1' });
      mockRepository.findPaymentReceipt.mockResolvedValue({
        id: 'tx-1',
        status: 'PENDING',
      });

      await expect(
        service.getPaymentReceipt({
          actor: { userId: validUserId },
          orderId: 'ord-1',
          transactionId: 'tx-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return receipt detail for successful transaction', async () => {
      mockRepository.findOrderById.mockResolvedValue({ id: 'ord-1' });
      mockRepository.findPaymentReceipt.mockResolvedValue({
        id: 'tx-1',
        order_id: 'ord-1',
        payment_stage: 'P1',
        amount: new Prisma.Decimal(4500000),
        currency: 'VND',
        payment_method: 'PAYOS',
        status: 'SUCCEEDED',
        receipt_no: 'REC-ORD-123-P1',
        requested_at: new Date('2026-11-15T04:00:00.000Z'),
        completed_at: new Date('2026-11-15T04:05:00.000Z'),
        receipt_issued_at: new Date('2026-11-15T04:05:00.000Z'),
        orders: {
          order_no: 'ORD-123',
          recipient_name: 'Nguyen Van A',
        },
      });

      const res = await service.getPaymentReceipt({
        actor: { userId: validUserId },
        orderId: 'ord-1',
        transactionId: 'tx-1',
      });

      expect(res.receiptNo).toBe('REC-ORD-123-P1');
      expect(res.recipientName).toBe('Nguyen Van A');
      expect(res.amount).toBe(4500000);
    });
  });

  describe('getOrderInvoice', () => {
    it('should throw NotFoundException if invoice details not found', async () => {
      mockRepository.findOrderById.mockResolvedValue({ id: 'ord-1' });
      mockRepository.findOrderInvoice.mockResolvedValue(null);

      await expect(
        service.getOrderInvoice({
          actor: { userId: validUserId },
          orderId: 'ord-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate paid, total, remaining amounts and return invoice', async () => {
      mockRepository.findOrderById.mockResolvedValue({ id: 'ord-1' });
      mockRepository.findOrderInvoice.mockResolvedValue({
        id: 'ord-1',
        order_no: 'ORD-123',
        status: 'AWAITING_P2',
        invoice_no: 'INV-ORD-123',
        invoice_issued_at: new Date('2026-11-15T09:00:00.000Z'),
        recipient_name: 'Nguyen Van A',
        recipient_phone: '0901234567',
        delivery_address_json: { street: '123 Le Loi' },
        quotes_orders_current_quote_idToquotes: {
          total_amount: new Prisma.Decimal(15000000),
          currency: 'VND',
          quote_items: [
            {
              component_type: 'GOLD',
              description: '18K Gold',
              quantity: new Prisma.Decimal(1),
              unit_amount: new Prisma.Decimal(15000000),
              line_amount: new Prisma.Decimal(15000000),
            },
          ],
        },
        payment_transactions: [
          {
            payment_stage: 'P1',
            amount: new Prisma.Decimal(4500000),
            completed_at: new Date('2026-11-15T04:05:00.000Z'),
            receipt_no: 'REC-1',
          },
        ],
      });

      const res = await service.getOrderInvoice({
        actor: { userId: validUserId },
        orderId: 'ord-1',
      });

      expect(res.invoiceNo).toBe('INV-ORD-123');
      expect(res.totalAmount).toBe(15000000);
      expect(res.totalPaidAmount).toBe(4500000);
      expect(res.remainingAmount).toBe(10500000);
      expect(res.items).toHaveLength(1);
      expect(res.paymentTransactions).toHaveLength(1);
    });
  });

  describe('createRefundRequest', () => {
    it('should throw BadRequestException if refundAmount is invalid', async () => {
      await expect(
        service.createRefundRequest({
          transactionId: 'tx-1',
          refundAmount: 0,
          reason: 'Cancel',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if original transaction does not exist', async () => {
      mockRepository.createRefundRequest.mockResolvedValue(null);

      await expect(
        service.createRefundRequest({
          transactionId: 'tx-1',
          refundAmount: 4500000,
          reason: 'Valid cancel',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create refund request successfully', async () => {
      mockRepository.createRefundRequest.mockResolvedValue({
        id: 'ref-1',
        related_transaction_id: 'tx-1',
        order_id: 'ord-1',
        amount: new Prisma.Decimal(4500000),
        currency: 'VND',
        status: 'PENDING',
        requested_at: new Date('2026-11-15T10:00:00.000Z'),
      });

      const res = await service.createRefundRequest({
        transactionId: 'tx-1',
        refundAmount: 4500000,
        reason: 'Customer cancelled order before production',
      });

      expect(res.refundTransactionId).toBe('ref-1');
      expect(res.originalTransactionId).toBe('tx-1');
      expect(res.refundAmount).toBe(4500000);
      expect(res.status).toBe('PENDING');
    });
  });

  describe('listClaimQuotes (ORDER-024)', () => {
    it('should throw BadRequestException if claimId is missing', async () => {
      await expect(
        service.listClaimQuotes({
          claimId: '',
          actor: { userId: validUserId },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return list of quotes for a claim', async () => {
      mockRepository.findClaimQuotes.mockResolvedValue([
        {
          id: 'quo-claim-1',
          quote_no: 'QUO-CLM-001',
          claim_id: 'clm-1',
          order_id: 'ord-1',
          quote_type: 'SERVICE',
          version_no: 1,
          status: 'ISSUED',
          subtotal_amount: new Prisma.Decimal(500000),
          delivery_amount: new Prisma.Decimal(30000),
          adjustment_amount: new Prisma.Decimal(0),
          total_amount: new Prisma.Decimal(530000),
          currency: 'VND',
          valid_until: new Date('2026-12-01T00:00:00.000Z'),
          created_by_user_id: 'staff-1',
          issued_at: new Date('2026-11-15T00:00:00.000Z'),
          accepted_by_customer_identity_id: null,
          accepted_at: null,
          created_at: new Date('2026-11-15T00:00:00.000Z'),
          quote_items: [
            {
              id: 'qi-1',
              component_type: 'POLISHING',
              description: 'Ring surface polishing',
              quantity: new Prisma.Decimal(1),
              unit_amount: new Prisma.Decimal(500000),
              line_amount: new Prisma.Decimal(500000),
              price_source_type: 'MANUAL',
              ring_item_id: null,
            },
          ],
        },
      ]);

      const res = await service.listClaimQuotes({
        claimId: 'clm-1',
        actor: { userId: validUserId },
      });

      expect(res.quotes).toHaveLength(1);
      expect(res.quotes[0].id).toBe('quo-claim-1');
      expect(res.quotes[0].quoteType).toBe('SERVICE');
      expect(res.quotes[0].totalAmount).toBe(530000);
      expect(res.quotes[0].items).toHaveLength(1);
      expect(res.quotes[0].items[0].componentType).toBe('POLISHING');
    });
  });

  describe('acceptServiceQuote (ORDER-025)', () => {
    it('should throw BadRequestException if claimId or quoteId is missing', async () => {
      await expect(
        service.acceptServiceQuote({
          claimId: '',
          quoteId: 'quo-1',
          actor: { userId: validUserId },
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.acceptServiceQuote({
          claimId: 'clm-1',
          quoteId: '',
          actor: { userId: validUserId },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if quote is not found', async () => {
      mockRepository.findClaimQuoteById.mockResolvedValue(null);

      await expect(
        service.acceptServiceQuote({
          claimId: 'clm-1',
          quoteId: 'quo-1',
          actor: { userId: validUserId },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if quote is not SERVICE type', async () => {
      mockRepository.findClaimQuoteById.mockResolvedValue({
        id: 'quo-1',
        quote_type: 'FINAL_SALES',
        status: 'ISSUED',
      });

      await expect(
        service.acceptServiceQuote({
          claimId: 'clm-1',
          quoteId: 'quo-1',
          actor: { userId: validUserId },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return success if quote is already ACCEPTED (idempotent)', async () => {
      mockRepository.findClaimQuoteById.mockResolvedValue({
        id: 'quo-1',
        quote_type: 'SERVICE',
        status: 'ACCEPTED',
        accepted_at: new Date('2026-11-15T09:00:00.000Z'),
      });

      const res = await service.acceptServiceQuote({
        claimId: 'clm-1',
        quoteId: 'quo-1',
        actor: { userId: validUserId },
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('ACCEPTED');
    });

    it('should throw BadRequestException if quote status is not ISSUED', async () => {
      mockRepository.findClaimQuoteById.mockResolvedValue({
        id: 'quo-1',
        quote_type: 'SERVICE',
        status: 'DRAFT',
      });

      await expect(
        service.acceptServiceQuote({
          claimId: 'clm-1',
          quoteId: 'quo-1',
          actor: { userId: validUserId },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if quote has expired', async () => {
      mockRepository.findClaimQuoteById.mockResolvedValue({
        id: 'quo-1',
        quote_type: 'SERVICE',
        status: 'ISSUED',
        valid_until: new Date('2020-01-01T00:00:00.000Z'),
      });

      await expect(
        service.acceptServiceQuote({
          claimId: 'clm-1',
          quoteId: 'quo-1',
          actor: { userId: validUserId },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept service quote successfully', async () => {
      mockRepository.findClaimQuoteById.mockResolvedValue({
        id: 'quo-1',
        claim_id: 'clm-1',
        quote_type: 'SERVICE',
        status: 'ISSUED',
        valid_until: new Date('2099-01-01T00:00:00.000Z'),
      });

      mockRepository.acceptClaimQuote.mockResolvedValue({
        id: 'quo-1',
        status: 'ACCEPTED',
        accepted_at: new Date('2026-11-15T10:00:00.000Z'),
      });

      const res = await service.acceptServiceQuote({
        claimId: 'clm-1',
        quoteId: 'quo-1',
        actor: { userId: validUserId },
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('ACCEPTED');
      expect(mockRepository.acceptClaimQuote).toHaveBeenCalledWith({
        quoteId: 'quo-1',
        customerIdentityId: validUserId,
      });
    });
  });

  describe('createOrderPaymentLink (ORDER-016)', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockRepository.findOrderById.mockResolvedValue(null);

      await expect(
        service.createOrderPaymentLink({
          orderId: 'ord-1',
          actor: { userId: validUserId },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create payment link successfully for DEPOSIT_P1', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'ord-1',
        order_no: 'ORD-202611-0001',
        status: 'AWAITING_P1',
        quotes_orders_current_quote_idToquotes: {
          total_amount: new Prisma.Decimal(15000000),
          currency: 'VND',
        },
      });

      mockRepository.createPaymentTransaction.mockResolvedValue({
        id: 'tx-p1',
        status: 'PENDING',
        currency: 'VND',
        amount: new Prisma.Decimal(4500000),
        expires_at: new Date('2026-11-16T10:00:00.000Z'),
      });

      const res = await service.createOrderPaymentLink({
        orderId: 'ord-1',
        actor: { userId: validUserId },
      });

      expect(res.transactionId).toBe('tx-p1');
      expect(res.amount).toBe(4500000); // 30% of 15,000,000
      expect(res.paymentStage).toBe('DEPOSIT_P1');
      expect(res.checkoutUrl).toBe('https://pay.payos.vn/web/pl_123');
    });
  });

  describe('processPayosWebhook (ORDER-019)', () => {
    it('should throw ForbiddenException if webhook signature is invalid', async () => {
      mockPayosProvider.verifyWebhookSignature.mockReturnValueOnce(false);

      await expect(
        service.processPayosWebhook({
          code: '00',
          desc: 'success',
          success: true,
          dataJson: JSON.stringify({ orderCode: 1715001234 }),
          signature: 'invalid-sig',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should mark transaction succeeded and transition order status', async () => {
      mockPayosProvider.verifyWebhookSignature.mockReturnValueOnce(true);
      mockRepository.findTransactionByOrderCode.mockResolvedValue({
        id: 'tx-p1',
        status: 'PENDING',
        payment_stage: 'DEPOSIT_P1',
        orders: { id: 'ord-1', status: 'AWAITING_P1' },
      });

      mockRepository.markPaymentTransactionSucceeded.mockResolvedValue({
        id: 'tx-p1',
        status: 'SUCCEEDED',
      });

      const res = await service.processPayosWebhook({
        code: '00',
        desc: 'success',
        success: true,
        dataJson: JSON.stringify({
          orderCode: 1715001234,
          amount: 4500000,
          reference: 'PAYOS-REF-001',
          transactionDateTime: '2026-11-15T10:00:00Z',
        }),
        signature: 'valid-sig',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('SUCCEEDED');
      expect(
        mockRepository.markPaymentTransactionSucceeded,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'tx-p1',
          nextOrderStatus: 'PENDING_FINAL_QUOTE',
        }),
      );
    });
  });

  describe('reconcilePaymentTransaction (ORDER-020)', () => {
    it('should reconcile transaction with PayOS API and mark succeeded', async () => {
      mockRepository.findPaymentTransactionById.mockResolvedValue({
        id: 'tx-p1',
        status: 'PENDING',
        provider_order_code: BigInt(1715001234),
        payment_stage: 'DEPOSIT_P1',
        amount: new Prisma.Decimal(4500000),
        currency: 'VND',
        requested_at: new Date('2026-11-15T09:00:00.000Z'),
        orders: { id: 'ord-1', status: 'AWAITING_P1' },
      });

      mockRepository.markPaymentTransactionSucceeded.mockResolvedValue({
        id: 'tx-p1',
        status: 'SUCCEEDED',
        payment_stage: 'DEPOSIT_P1',
        transaction_type: 'PAYMENT',
        amount: new Prisma.Decimal(4500000),
        currency: 'VND',
        requested_at: new Date('2026-11-15T09:00:00.000Z'),
        completed_at: new Date('2026-11-15T10:00:00.000Z'),
      });

      const res = await service.reconcilePaymentTransaction({
        transactionId: 'tx-p1',
        actor: { userId: validUserId },
      });

      expect(res.id).toBe('tx-p1');
      expect(res.status).toBe('SUCCEEDED');
    });
  });

  describe('createClaimPaymentLink (ORDER-026)', () => {
    it('should throw BadRequestException if no ACCEPTED quote found', async () => {
      mockRepository.findClaimQuotes.mockResolvedValue([
        {
          id: 'quo-1',
          status: 'ISSUED',
          total_amount: new Prisma.Decimal(500000),
        },
      ]);

      await expect(
        service.createClaimPaymentLink({
          claimId: 'clm-1',
          actor: { userId: validUserId },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create payment link for claim service quote successfully', async () => {
      mockRepository.findClaimQuotes.mockResolvedValue([
        {
          id: 'quo-1',
          quote_no: 'QUO-CLM-001',
          status: 'ACCEPTED',
          total_amount: new Prisma.Decimal(500000),
          currency: 'VND',
        },
      ]);

      mockRepository.createPaymentTransaction.mockResolvedValue({
        id: 'tx-claim',
        status: 'PENDING',
        currency: 'VND',
        amount: new Prisma.Decimal(500000),
        expires_at: new Date('2026-11-16T10:00:00.000Z'),
      });

      const res = await service.createClaimPaymentLink({
        claimId: 'clm-1',
        actor: { userId: validUserId },
      });

      expect(res.transactionId).toBe('tx-claim');
      expect(res.paymentStage).toBe('SERVICE_FEE');
      expect(res.checkoutUrl).toBe('https://pay.payos.vn/web/pl_123');
    });
  });
});
