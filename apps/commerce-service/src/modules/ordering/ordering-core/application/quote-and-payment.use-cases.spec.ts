import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PayosProvider } from '../infrastructure/payment/payos.provider';
import { ORDERING_REPOSITORY } from './ordering.repository';
import { PaymentUseCases } from './payment.use-cases';
import { QuoteUseCases } from './quote.use-cases';

describe('QuoteUseCases & PaymentUseCases', () => {
  let quoteUseCases: QuoteUseCases;
  let paymentUseCases: PaymentUseCases;

  const mockRepository = {
    findOrderById: jest.fn(),
    findAdminOrderById: jest.fn(),
    listOrderQuotes: jest.fn(),
    createFinalQuote: jest.fn(),
    findQuoteById: jest.fn(),
    updateFinalQuote: jest.fn(),
    publishFinalQuote: jest.fn(),
    confirmFinalQuote: jest.fn(),
    rejectFinalQuote: jest.fn(),
    findFinalConfirmations: jest.fn(),
    findOrderPayments: jest.fn(),
    findOrderPaymentById: jest.fn(),
    findPaymentTransactionById: jest.fn(),
    findPaymentReceipt: jest.fn(),
    findOrderInvoice: jest.fn(),
    createRefundRequest: jest.fn(),
    findClaimQuotes: jest.fn(),
    findClaimQuoteById: jest.fn(),
    acceptClaimQuote: jest.fn(),
    createPaymentTransaction: jest.fn(),
    findTransactionByOrderCode: jest.fn(),
    markPaymentTransactionSucceeded: jest.fn(),
  };

  const mockPayosProvider = {
    generateOrderCode: jest.fn().mockReturnValue(123456),
    createPaymentLink: jest.fn(),
    verifyWebhookSignature: jest.fn(),
    getPaymentInformation: jest.fn(),
  };

  const validUserId = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteUseCases,
        PaymentUseCases,
        { provide: ORDERING_REPOSITORY, useValue: mockRepository },
        { provide: PayosProvider, useValue: mockPayosProvider },
      ],
    }).compile();

    quoteUseCases = module.get<QuoteUseCases>(QuoteUseCases);
    paymentUseCases = module.get<PaymentUseCases>(PaymentUseCases);
    jest.clearAllMocks();
  });

  describe('QuoteUseCases', () => {
    it('should confirm final quote and advance order to AWAITING_P2', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'order-1',
        currentQuoteId: 'q-1',
        sourcePlanMode: 'SHARED',
      });
      mockRepository.findQuoteById.mockResolvedValue({
        id: 'q-1',
        status: 'ISSUED',
        validUntil: new Date(Date.now() + 86400000),
      });
      mockRepository.confirmFinalQuote.mockResolvedValue({
        id: 'conf-1',
        orderId: 'order-1',
        quoteId: 'q-1',
        quoteNo: 'QUO-F1',
        quoteTotalAmount: 10000000,
        confirmedByCustomerIdentityId: validUserId,
        status: 'ACTIVE',
        confirmedAt: new Date('2026-11-25T10:00:00Z'),
        items: [],
      });

      const res = await quoteUseCases.confirmFinalQuote({
        actor: { userId: validUserId },
        orderId: 'order-1',
      });

      expect(res.nextOrderStatus).toBe('AWAITING_P2');
      expect(res.confirmationId).toBe('conf-1');
    });

    it('should accept SERVICE quote idempotently or when ISSUED', async () => {
      mockRepository.findClaimQuoteById.mockResolvedValue({
        id: 'q-srv-1',
        quoteType: 'SERVICE',
        status: 'ISSUED',
        validUntil: new Date(Date.now() + 86400000),
      });
      mockRepository.acceptClaimQuote.mockResolvedValue({
        id: 'q-srv-1',
        status: 'ACCEPTED',
        acceptedAt: new Date('2026-11-25T10:00:00Z'),
      });

      const res = await quoteUseCases.acceptServiceQuote({
        actor: { userId: validUserId },
        claimId: 'claim-1',
        quoteId: 'q-srv-1',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('ACCEPTED');
    });

    it('should reject non-ISSUED service quote', async () => {
      mockRepository.findClaimQuoteById.mockResolvedValue({
        id: 'q-srv-1',
        quoteType: 'SERVICE',
        status: 'DRAFT',
      });

      await expect(
        quoteUseCases.acceptServiceQuote({
          actor: { userId: validUserId },
          claimId: 'claim-1',
          quoteId: 'q-srv-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PaymentUseCases', () => {
    it('should create payment link for DEPOSIT_P1 (30%)', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'order-1',
        orderNo: 'ORD-001',
        status: 'AWAITING_P1',
        currentQuote: {
          id: 'q-1',
          totalAmount: 15000000,
          currency: 'VND',
        },
      });
      mockPayosProvider.generateOrderCode.mockReturnValue(987654);
      mockPayosProvider.createPaymentLink.mockResolvedValue({
        paymentLinkId: 'pl_987654',
        checkoutUrl: 'https://pay.payos.vn/web/pl_987654',
        qrCode: 'QR_MOCK',
      });
      mockRepository.createPaymentTransaction.mockResolvedValue({
        id: 'tx-1',
        amount: 4500000,
        currency: 'VND',
        status: 'PENDING',
        expiresAt: new Date('2026-11-26T10:00:00Z'),
      });

      const res = await paymentUseCases.createOrderPaymentLink({
        actor: { userId: validUserId },
        orderId: 'order-1',
      });

      expect(res.amount).toBe(4500000);
      expect(res.paymentStage).toBe('DEPOSIT_P1');
      expect(res.checkoutUrl).toContain('pl_987654');
    });

    it('should throw ForbiddenException if PayOS webhook signature is invalid', async () => {
      mockPayosProvider.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        paymentUseCases.processPayosWebhook({
          code: '00',
          desc: 'success',
          success: true,
          dataJson: JSON.stringify({ orderCode: 123 }),
          signature: 'bad-sig',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should mark transaction succeeded on valid PayOS webhook', async () => {
      mockPayosProvider.verifyWebhookSignature.mockReturnValue(true);
      mockRepository.findTransactionByOrderCode.mockResolvedValue({
        id: 'tx-1',
        orderId: 'order-1',
        orderStatus: 'AWAITING_P1',
        paymentStage: 'DEPOSIT_P1',
        status: 'PENDING',
      });
      mockRepository.markPaymentTransactionSucceeded.mockResolvedValue({
        id: 'tx-1',
        status: 'SUCCEEDED',
      });

      const res = await paymentUseCases.processPayosWebhook({
        code: '00',
        desc: 'success',
        success: true,
        dataJson: JSON.stringify({ orderCode: 123, reference: 'REF-1' }),
        signature: 'good-sig',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('SUCCEEDED');
    });

    it('should calculate invoice totals and remaining amount', async () => {
      mockRepository.findOrderById.mockResolvedValue({ id: 'order-1' });
      mockRepository.findOrderInvoice.mockResolvedValue({
        id: 'order-1',
        orderNo: 'ORD-001',
        status: 'AWAITING_P2',
        quoteCurrency: 'VND',
        quoteTotalAmount: 10000000,
        quoteItems: [],
        paymentTransactions: [
          {
            paymentStage: 'DEPOSIT_P1',
            amount: 3000000,
            requestedAt: new Date('2026-11-25T10:00:00Z'),
          },
        ],
      });

      const res = await paymentUseCases.getOrderInvoice({
        actor: { userId: validUserId },
        orderId: 'order-1',
      });

      expect(res.totalAmount).toBe(10000000);
      expect(res.totalPaidAmount).toBe(3000000);
      expect(res.remainingAmount).toBe(7000000);
    });

    it('should throw NotFoundException if refund target transaction missing', async () => {
      mockRepository.createRefundRequest.mockResolvedValue(null);

      await expect(
        paymentUseCases.createRefundRequest({
          transactionId: 'missing',
          refundAmount: 100000,
          reason: 'Customer request',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
