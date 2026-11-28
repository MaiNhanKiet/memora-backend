import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClaimQuoteAction } from '@app/contracts';
import { AcceptServiceQuoteUseCase } from './claim-quote.use-cases';
import { ConfirmFinalQuoteUseCase } from './final-quote.use-cases';
import { ORDERING_REPOSITORY } from './ordering.repository';
import { OPERATIONS_CLAIM_ACCESS } from './operations-claim-access.port';
import {
  CreateRefundRequestUseCase,
  GetOrderInvoiceUseCase,
} from './payment-query-and-refund.use-cases';
import {
  CreateClaimPaymentLinkUseCase,
  CreateOrderPaymentLinkUseCase,
  ProcessPayosWebhookUseCase,
} from './payos-payment.use-cases';
import { PAYOS_GATEWAY } from './payos.gateway';

describe('Quote & Payment UseCases', () => {
  let confirmFinalQuoteUseCase: ConfirmFinalQuoteUseCase;
  let acceptServiceQuoteUseCase: AcceptServiceQuoteUseCase;
  let createOrderPaymentLinkUseCase: CreateOrderPaymentLinkUseCase;
  let processPayosWebhookUseCase: ProcessPayosWebhookUseCase;
  let getOrderInvoiceUseCase: GetOrderInvoiceUseCase;
  let createRefundRequestUseCase: CreateRefundRequestUseCase;
  let createClaimPaymentLinkUseCase: CreateClaimPaymentLinkUseCase;

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
    beginClaimPaymentAttempt: jest.fn(),
    closeClaimPaymentAttempt: jest.fn(),
    beginOrderPaymentAttempt: jest.fn(),
    saveOrderPaymentLink: jest.fn(),
    findTransactionByOrderCode: jest.fn(),
    markPaymentTransactionSucceeded: jest.fn(),
  };

  const mockPayosGateway = {
    generateOrderCode: jest.fn().mockReturnValue(123456),
    createPaymentLink: jest.fn(),
    verifyWebhookSignature: jest.fn(),
    getPaymentInformation: jest.fn(),
  };
  const mockClaimAccess = { authorize: jest.fn(), getReturnReceipt: jest.fn() };

  const validUserId = '11111111-1111-4111-8111-111111111111';
  const validCustomerIdentityId = '33333333-3333-4333-8333-333333333333';
  const claimId = '44444444-4444-4444-8444-444444444444';
  const claimQuoteId = '55555555-5555-4555-8555-555555555555';
  const actor = {
    userId: validUserId,
    customerIdentityId: validCustomerIdentityId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmFinalQuoteUseCase,
        AcceptServiceQuoteUseCase,
        CreateOrderPaymentLinkUseCase,
        ProcessPayosWebhookUseCase,
        GetOrderInvoiceUseCase,
        CreateRefundRequestUseCase,
        CreateClaimPaymentLinkUseCase,
        { provide: ORDERING_REPOSITORY, useValue: mockRepository },
        { provide: PAYOS_GATEWAY, useValue: mockPayosGateway },
        { provide: OPERATIONS_CLAIM_ACCESS, useValue: mockClaimAccess },
      ],
    }).compile();

    confirmFinalQuoteUseCase = module.get<ConfirmFinalQuoteUseCase>(
      ConfirmFinalQuoteUseCase,
    );
    acceptServiceQuoteUseCase = module.get<AcceptServiceQuoteUseCase>(
      AcceptServiceQuoteUseCase,
    );
    createOrderPaymentLinkUseCase = module.get<CreateOrderPaymentLinkUseCase>(
      CreateOrderPaymentLinkUseCase,
    );
    processPayosWebhookUseCase = module.get<ProcessPayosWebhookUseCase>(
      ProcessPayosWebhookUseCase,
    );
    getOrderInvoiceUseCase = module.get<GetOrderInvoiceUseCase>(
      GetOrderInvoiceUseCase,
    );
    createRefundRequestUseCase = module.get<CreateRefundRequestUseCase>(
      CreateRefundRequestUseCase,
    );
    createClaimPaymentLinkUseCase = module.get(CreateClaimPaymentLinkUseCase);
    jest.clearAllMocks();
    mockClaimAccess.authorize.mockResolvedValue(true);
  });

  describe('Quote UseCases', () => {
    it('should confirm final quote and advance order to AWAITING_P2', async () => {
      mockRepository.findOrderById.mockResolvedValue({
        id: 'order-1',
        currentQuoteId: 'q-1',
        sourcePlanMode: 'SHARED',
        ringItems: [{ personalizationPackage: 'FINGERPRINT' }],
      });
      mockRepository.findQuoteById.mockResolvedValue({
        id: 'q-1',
        status: 'ISSUED',
        validUntil: new Date(Date.now() + 86400000),
      });
      mockRepository.confirmFinalQuote.mockResolvedValue({
        id: 'conf-1',
        nextOrderStatus: 'AWAITING_P2',
        orderId: 'order-1',
        quoteId: 'q-1',
        quoteNo: 'QUO-F1',
        quoteTotalAmount: 10000000,
        confirmedByCustomerIdentityId: validCustomerIdentityId,
        status: 'ACTIVE',
        confirmedAt: new Date('2026-11-25T10:00:00Z'),
        items: [],
      });

      const res = await confirmFinalQuoteUseCase.execute({
        actor: {
          userId: validUserId,
          customerIdentityId: validCustomerIdentityId,
        },
        orderId: 'order-1',
      });

      expect(mockRepository.confirmFinalQuote).toHaveBeenCalledWith(
        'order-1',
        'q-1',
        validCustomerIdentityId,
      );
      expect(res.nextOrderStatus).toBe('AWAITING_P2');
      expect(res.confirmationId).toBe('conf-1');
    });

    it('should accept SERVICE quote idempotently or when ISSUED', async () => {
      mockRepository.findClaimQuoteById.mockResolvedValue({
        id: claimQuoteId,
        quoteType: 'SERVICE',
        status: 'ISSUED',
        validUntil: new Date(Date.now() + 86400000),
      });
      mockRepository.acceptClaimQuote.mockResolvedValue({
        id: claimQuoteId,
        status: 'ACCEPTED',
        acceptedAt: new Date('2026-11-25T10:00:00Z'),
      });

      const res = await acceptServiceQuoteUseCase.execute({
        actor: {
          userId: validUserId,
          customerIdentityId: validCustomerIdentityId,
        },
        claimId,
        quoteId: claimQuoteId,
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('ACCEPTED');
    });

    it('should reject non-ISSUED service quote', async () => {
      mockRepository.findClaimQuoteById.mockResolvedValue({
        id: claimQuoteId,
        quoteType: 'SERVICE',
        status: 'DRAFT',
      });

      await expect(
        acceptServiceQuoteUseCase.execute({
          actor: {
            userId: validUserId,
            customerIdentityId: validCustomerIdentityId,
          },
          claimId,
          quoteId: claimQuoteId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not read the quote when Operations denies the claim', async () => {
      mockClaimAccess.authorize.mockResolvedValue(false);
      await expect(
        acceptServiceQuoteUseCase.execute({
          actor,
          claimId,
          quoteId: claimQuoteId,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockClaimAccess.authorize).toHaveBeenCalledWith({
        actor,
        claimId,
        action: ClaimQuoteAction.ACCEPT_QUOTE,
      });
      expect(mockRepository.findClaimQuoteById).not.toHaveBeenCalled();
    });
  });

  describe('Payment UseCases', () => {
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
      mockPayosGateway.generateOrderCode.mockReturnValue(987654);
      mockPayosGateway.createPaymentLink.mockResolvedValue({
        paymentLinkId: 'pl_987654',
        orderCode: 987654,
        amount: 4500000,
        currency: 'VND',
        checkoutUrl: 'https://pay.payos.vn/web/pl_987654',
        qrCode: 'QR_MOCK',
      });
      const transaction = {
        id: 'tx-1',
        amount: 4500000,
        paymentStage: 'DEPOSIT_P1',
        providerOrderCode: 987654n,
        currency: 'VND',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };
      mockRepository.beginOrderPaymentAttempt.mockResolvedValue({
        transaction,
        created: true,
      });
      mockRepository.saveOrderPaymentLink.mockResolvedValue(transaction);

      const res = await createOrderPaymentLinkUseCase.execute({
        actor: {
          userId: validUserId,
          customerIdentityId: validCustomerIdentityId,
        },
        orderId: 'order-1',
      });

      expect(res.amount).toBe(4500000);
      expect(res.paymentStage).toBe('DEPOSIT_P1');
      expect(res.checkoutUrl).toContain('pl_987654');
    });

    it('should throw ForbiddenException if PayOS webhook signature is invalid', async () => {
      mockPayosGateway.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        processPayosWebhookUseCase.execute({
          code: '00',
          desc: 'success',
          success: true,
          dataJson: JSON.stringify({ orderCode: 123 }),
          signature: 'bad-sig',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should mark transaction succeeded on valid PayOS webhook', async () => {
      mockPayosGateway.verifyWebhookSignature.mockReturnValue(true);
      mockRepository.findTransactionByOrderCode.mockResolvedValue({
        id: 'tx-1',
        orderId: 'order-1',
        orderStatus: 'AWAITING_P1',
        paymentStage: 'DEPOSIT_P1',
        status: 'PENDING',
        transactionType: 'PAYMENT',
        provider: 'PAYOS',
        currency: 'VND',
        amount: 4500000,
      });
      mockRepository.markPaymentTransactionSucceeded.mockResolvedValue({
        transaction: { id: 'tx-1', status: 'SUCCEEDED' },
        applied: true,
      });

      const res = await processPayosWebhookUseCase.execute({
        code: '00',
        desc: 'success',
        success: true,
        dataJson: JSON.stringify({
          orderCode: 123,
          reference: 'REF-1',
          paymentLinkId: 'pl-1',
          amount: 4500000,
          currency: 'VND',
          code: '00',
        }),
        signature: 'good-sig',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('SUCCEEDED');
    });

    it('does not record a signed webhook when the amount is different', async () => {
      mockPayosGateway.verifyWebhookSignature.mockReturnValue(true);
      mockRepository.findTransactionByOrderCode.mockResolvedValue({
        id: 'tx-1',
        provider: 'PAYOS',
        transactionType: 'PAYMENT',
        status: 'PENDING',
        amount: 4500000,
        currency: 'VND',
      });

      const response = await processPayosWebhookUseCase.execute({
        code: '00',
        desc: 'success',
        success: true,
        dataJson: JSON.stringify({
          code: '00',
          orderCode: 123,
          amount: 1000,
          currency: 'VND',
          reference: 'REF-1',
          paymentLinkId: 'pl-1',
        }),
        signature: 'test-signature',
      });

      expect(response.success).toBe(false);
      expect(
        mockRepository.markPaymentTransactionSucceeded,
      ).not.toHaveBeenCalled();
    });

    it('returns 404 until an invoice has been issued', async () => {
      mockRepository.findOrderById.mockResolvedValue({ id: 'order-1' });
      mockRepository.findOrderInvoice.mockResolvedValue(undefined);

      await expect(
        getOrderInvoiceUseCase.execute({
          actor: {
            userId: validUserId,
            customerIdentityId: validCustomerIdentityId,
          },
          orderId: 'order-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return totals for an issued invoice', async () => {
      mockRepository.findOrderById.mockResolvedValue({ id: 'order-1' });
      mockRepository.findOrderInvoice.mockResolvedValue({
        id: 'order-1',
        orderNo: 'ORD-001',
        status: 'COMPLETED',
        invoiceNo: 'INV-ORD-001',
        invoiceIssuedAt: new Date('2026-11-25T10:00:00Z'),
        quoteCurrency: 'VND',
        quoteTotalAmount: 10000000,
        quoteItems: [],
        paymentTransactions: [
          {
            paymentStage: 'FINAL_PAYMENT',
            amount: 10000000,
            requestedAt: new Date('2026-11-25T10:00:00Z'),
          },
        ],
      });

      const res = await getOrderInvoiceUseCase.execute({
        actor: {
          userId: validUserId,
          customerIdentityId: validCustomerIdentityId,
        },
        orderId: 'order-1',
      });

      expect(res.invoiceNo).toBe('INV-ORD-001');
      expect(res.totalAmount).toBe(10000000);
      expect(res.totalPaidAmount).toBe(10000000);
      expect(res.remainingAmount).toBe(0);
    });

    it('should throw NotFoundException if refund target transaction missing', async () => {
      mockRepository.createRefundRequest.mockResolvedValue(undefined);

      await expect(
        createRefundRequestUseCase.execute({
          transactionId: '66666666-6666-4666-8666-666666666666',
          refundAmount: 100000,
          reason: 'Customer request',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a return refund without an eligible receipt before any write', async () => {
      mockClaimAccess.getReturnReceipt.mockResolvedValue({ eligible: false });
      await expect(
        createRefundRequestUseCase.execute({
          actor,
          claimId,
          transactionId: '66666666-6666-4666-8666-666666666666',
          reason: 'Ring returned',
          refundAmount: 100000,
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockRepository.createRefundRequest).not.toHaveBeenCalled();
    });
  });

  describe('Claim payment attempts', () => {
    const transaction = {
      id: 'claim-payment',
      provider: 'PAYOS',
      providerOrderCode: 123456n,
      amount: 100000,
      currency: 'VND',
      status: 'PENDING',
      paymentStage: 'SERVICE_FEE',
    };

    it('reuses the existing link for a repeated request', async () => {
      mockRepository.beginClaimPaymentAttempt.mockResolvedValue({
        created: false,
        reusable: true,
        transaction: {
          ...transaction,
          metadataJson: {
            checkoutUrl: 'https://pay.example/link',
            qrCode: 'qr',
          },
        },
      });
      await expect(
        createClaimPaymentLinkUseCase.execute({ actor, claimId }),
      ).resolves.toMatchObject({
        transactionId: transaction.id,
        orderCode: 123456,
      });
      expect(mockPayosGateway.createPaymentLink).not.toHaveBeenCalled();
    });

    it('holds the reserved code after an indeterminate provider response', async () => {
      mockRepository.beginClaimPaymentAttempt.mockResolvedValue({
        created: false,
        reusable: true,
        transaction,
      });
      mockPayosGateway.getPaymentInformation.mockResolvedValue(null);
      await expect(
        createClaimPaymentLinkUseCase.execute({ actor, claimId }),
      ).rejects.toThrow(ServiceUnavailableException);
      expect(mockPayosGateway.getPaymentInformation).toHaveBeenCalledWith(
        123456,
      );
      expect(mockPayosGateway.createPaymentLink).not.toHaveBeenCalled();
      expect(mockRepository.closeClaimPaymentAttempt).not.toHaveBeenCalled();
    });
  });
});
